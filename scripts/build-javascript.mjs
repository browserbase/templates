/**
 * Transpiles `typescript/` → `javascript/` for local development and tooling
 * (e.g. `pnpm run build:javascript`). It is not run by CI on `main`/`dev`.
 * Playground-facing JS on the `production` branch is produced by
 * `scripts/playground-ci.mjs` via `.github/workflows/playground-production.yml`.
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const TYPESCRIPT_DIR = path.join(ROOT_DIR, "typescript");
const JAVASCRIPT_DIR = path.join(ROOT_DIR, "javascript");

const DEFAULT_EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

const TYPESCRIPT_ONLY_DEV_DEPENDENCIES = new Set(["typescript", "tsx"]);

/** Builds JavaScript from TypeScript (local development; see file header). */
async function buildJavaScriptTemplates() {
  // Get the command line arguments.
  const argv = process.argv.slice(2);
  const options = parseBuildOptions(argv);
  // Filter function that determines which files to include in the build.
  const fileFilter = createFileFilter(options);
  const allFiles = await getAllFilteredFiles(TYPESCRIPT_DIR, fileFilter);

  // Avoid wiping unrelated templates when filters narrow the build (e.g. --include-template=foo).
  if (options.includeTemplates.size > 0) {
    const templatesToRefresh = new Set();
    for (const filePath of allFiles) {
      const relativePath = path.relative(TYPESCRIPT_DIR, filePath);
      const normalizedPath = normalizeRelativePath(relativePath);
      const [templateName] = normalizedPath.split("/");
      if (templateName) templatesToRefresh.add(templateName);
    }
    await mkdir(JAVASCRIPT_DIR, { recursive: true });
    await Promise.all(
      [...templatesToRefresh].map((name) =>
        rm(path.join(JAVASCRIPT_DIR, name), { recursive: true, force: true }),
      ),
    );
  } else if (options.includePaths.length > 0 || options.excludePathOnly.length > 0) {
    await mkdir(JAVASCRIPT_DIR, { recursive: true });
    // Path-level filters can match a subset of files per template; only overwrites run.
  } else {
    await rm(JAVASCRIPT_DIR, { recursive: true, force: true });
    await mkdir(JAVASCRIPT_DIR, { recursive: true });
  }
  const tsFiles = allFiles.filter(isTranspilableTypeScriptSource);
  const assetFiles = allFiles.filter((filePath) => !isTranspilableTypeScriptSource(filePath));

  await Promise.all(tsFiles.map((file) => transpileFile(file)));

  await Promise.all(
    assetFiles.map(async (filePath) => {
      if (path.basename(filePath) === "package.json") {
        await writeAdaptedPackageJson(filePath);
      } else {
        await copyAssetFile(filePath);
      }
    }),
  );

  if (argv.length > 0) {
    console.log(`Filters: ${argv.join(" ")}`);
  }
  console.log(
    `Built ${tsFiles.length} TypeScript files and ${assetFiles.length} other files into javascript/`,
  );
}

/**
 * @typedef {object} BuildOptions
 * @property {Set<string>} includeTemplates
 * @property {Set<string>} excludeTemplates
 * @property {string[]} includePaths
 * @property {string[]} excludePaths
 * @property {string[]} excludePathOnly
 */

/**
 * Parses build flags once so filtering and cleanup decisions stay in sync.
 * Flags:
 * --include-template=<name[,name2]>  Include only matching top-level template folders.
 * --exclude-template=<name[,name2]>  Exclude matching top-level template folders.
 * --include-path=<token[,token2]>    Include files whose relative path contains any token.
 * --exclude-path=<token[,token2]>    Exclude files whose relative path contains any token.
 * --exclude=<token[,token2]>         Convenience alias: applies to both template-name and path excludes.
 * Each flag supports both "--flag value" and "--flag=value" forms.
 * @param {string[]} argv
 * @returns {BuildOptions}
 */
function parseBuildOptions(argv) {
  const genericExcludes = parseListFlag(argv, "--exclude");
  const excludePathOnly = parseListFlag(argv, "--exclude-path");

  return {
    includeTemplates: new Set(parseListFlag(argv, "--include-template")),
    excludeTemplates: new Set([...parseListFlag(argv, "--exclude-template"), ...genericExcludes]),
    includePaths: parseListFlag(argv, "--include-path"),
    excludePaths: [...excludePathOnly, ...genericExcludes],
    excludePathOnly,
  };
}

/**
 * Creates a file filter function from parsed command line options.
 * @param {BuildOptions} options
 * @returns {function(string): boolean}
 */
function createFileFilter(options) {
  return (sourcePath) => {
    const relativePath = path.relative(TYPESCRIPT_DIR, sourcePath);
    const normalizedPath = normalizeRelativePath(relativePath);
    const [templateName] = normalizedPath.split("/");

    if (!templateName) return false;
    if (normalizedPath.endsWith(".d.ts")) return false;

    const pathSegments = normalizedPath.split("/");
    if (pathSegments.some((segment) => DEFAULT_EXCLUDED_DIRS.has(segment))) return false;

    if (options.includeTemplates.size > 0 && !options.includeTemplates.has(templateName)) {
      return false;
    }
    if (options.excludeTemplates.has(templateName)) return false;

    if (
      options.includePaths.length > 0 &&
      !options.includePaths.some((token) => normalizedPath.includes(token))
    ) {
      return false;
    }

    if (options.excludePaths.some((token) => normalizedPath.includes(token))) return false;

    return true;
  };
}

function isTranspilableTypeScriptSource(filePath) {
  const name = path.basename(filePath);
  if (name.endsWith(".tsx")) return true;
  if (name.endsWith(".ts") && !name.endsWith(".d.ts")) return true;
  return false;
}

/** Rewrite npm script strings from TypeScript runner / paths to plain Node. */
function adaptScriptCommand(command) {
  let value = command
    .replaceAll(/\bnpx\s+tsx\s+watch\s+/g, "node --watch ")
    .replaceAll(/\bnpx\s+tsx\s+/g, "node ")
    .replaceAll(/\btsx\s+watch\s+/g, "node --watch ")
    .replaceAll(/\btsx\s+/g, "node ");
  return value
    .replaceAll(/\.d\.ts\b/g, "__PRESERVE_D_TS__")
    .replaceAll(/\.tsx\b/g, ".jsx")
    .replaceAll(/\.ts\b/g, ".js")
    .replaceAll(/__PRESERVE_D_TS__/g, ".d.ts");
}

function isTypesPackage(depName) {
  return depName.startsWith("@types/");
}

/**
 * `build` is rewritten for JS output: drop a compile-only `tsc` step. If the script
 * is only `tsc` (plus flags), remove it entirely; if `tsc` is chained with `&&` /
 * `||` / `;`, keep everything after the first separator so steps like `next build`
 * are not lost.
 *
 * @param {string} buildScript
 * @returns {string | null} `null` means delete the `build` script entry.
 */
function stripLeadingTscBuildCommand(buildScript) {
  const trimmed = buildScript.trim();
  // Match `tsc` as a CLI token (not `tscheck` / `tsc.exe`). Allow `tsc&&…` without spaces.
  if (!/^\s*tsc(?=[\s;&]|$)/u.test(trimmed)) {
    return buildScript;
  }
  const chain = /\s*(?:&&|\|\||;)\s*/u.exec(trimmed);
  if (!chain) {
    return null;
  }
  const rest = trimmed.slice(chain.index + chain[0].length).trim();
  return rest.length > 0 ? rest : null;
}

function adaptPackageJsonForJavaScript(packageJson) {
  const pkg = JSON.parse(JSON.stringify(packageJson));

  pkg.type = "module";

  if (typeof pkg.main === "string") {
    pkg.main = pkg.main.replace(/\.tsx$/u, ".jsx").replace(/\.ts$/u, ".js");
  }

  if (pkg.scripts !== null && typeof pkg.scripts === "object" && !Array.isArray(pkg.scripts)) {
    const scripts = { ...pkg.scripts };
    for (const key of Object.keys(scripts)) {
      const scriptValue = scripts[key];
      if (typeof scriptValue !== "string") continue;
      scripts[key] = adaptScriptCommand(scriptValue);
    }
    if (typeof scripts.build === "string") {
      const nextBuild = stripLeadingTscBuildCommand(scripts.build);
      if (nextBuild === null) {
        delete scripts.build;
      } else if (nextBuild !== scripts.build) {
        scripts.build = nextBuild;
      }
    }
    pkg.scripts = scripts;
  }

  if (
    pkg.devDependencies !== null &&
    typeof pkg.devDependencies === "object" &&
    !Array.isArray(pkg.devDependencies)
  ) {
    const devDeps = { ...pkg.devDependencies };
    for (const name of Object.keys(devDeps)) {
      if (TYPESCRIPT_ONLY_DEV_DEPENDENCIES.has(name) || isTypesPackage(name)) {
        delete devDeps[name];
      }
    }
    if (Object.keys(devDeps).length === 0) {
      delete pkg.devDependencies;
    } else {
      pkg.devDependencies = devDeps;
    }
  }

  return pkg;
}

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function parseListFlag(argv, flagName) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== flagName && !arg.startsWith(`${flagName}=`)) continue;

    const inlineValue = arg.startsWith(`${flagName}=`) ? arg.slice(flagName.length + 1) : null;
    const nextValue = argv[index + 1];
    const value = inlineValue ?? nextValue;
    if (!value || value.startsWith("--")) {
      throw new Error(
        `Missing value for ${flagName} (use "${flagName} value" or "${flagName}=value")`,
      );
    }

    values.push(
      ...value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    if (inlineValue === null) {
      index += 1;
    }
  }

  return values;
}

async function getAllFilteredFiles(dir, fileFilter) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (DEFAULT_EXCLUDED_DIRS.has(entry.name)) {
          return [];
        }
        return getAllFilteredFiles(fullPath, fileFilter);
      }

      if (entry.isFile() && fileFilter(fullPath)) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function copyAssetFile(sourcePath) {
  const relativePath = path.relative(TYPESCRIPT_DIR, sourcePath);
  const outputPath = path.join(JAVASCRIPT_DIR, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await copyFile(sourcePath, outputPath);
}

async function writeAdaptedPackageJson(sourcePath) {
  const relativePath = path.relative(TYPESCRIPT_DIR, sourcePath);
  const outputPath = path.join(JAVASCRIPT_DIR, relativePath);
  const raw = await readFile(sourcePath, "utf8");
  const pkg = JSON.parse(raw);
  const adapted = adaptPackageJsonForJavaScript(pkg);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(adapted, null, 2)}\n`, "utf8");
}

async function transpileFile(sourcePath) {
  const relativePath = path.relative(TYPESCRIPT_DIR, sourcePath);
  const outputPath = path
    .join(JAVASCRIPT_DIR, relativePath)
    .replace(/\.tsx?$/, (ext) => (ext === ".tsx" ? ".jsx" : ".js"));

  const source = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
    },
    reportDiagnostics: true,
    fileName: sourcePath,
  });

  if (transpiled.diagnostics?.length) {
    const message = ts.formatDiagnosticsWithColorAndContext(transpiled.diagnostics, {
      getCurrentDirectory: () => ROOT_DIR,
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => "\n",
    });

    throw new Error(`TypeScript transpile diagnostics in ${relativePath}\n${message}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, transpiled.outputText, "utf8");
}

buildJavaScriptTemplates().catch((error) => {
  console.error(error);
  process.exit(1);
});
