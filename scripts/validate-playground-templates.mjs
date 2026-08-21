import console from "node:console";
import { access, constants, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

import { hasStagehandUsage } from "./lib/playground-checks.mjs";
import { fetchPlaygroundTypescriptTemplateEntries } from "./fetch-playground-typescript-dirs.mjs";

const ROOT = process.cwd();
const TYPESCRIPT_ROOT = path.join(ROOT, "typescript");

/**
 * @param {string} filePath
 */
async function validateSourceFile(filePath) {
  const sourceText = await readFile(filePath, "utf8");

  const sf = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const parseDiagnostics = sf.parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    const message = ts.formatDiagnosticsWithColorAndContext(parseDiagnostics, {
      getCurrentDirectory: () => ROOT,
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    });
    throw new Error(`Parse diagnostics in ${path.relative(ROOT, filePath)}\n${message}`);
  }

  if (sourceText.includes("window.playwright.chromium.connectOverCDP")) {
    throw new Error(
      `${path.relative(ROOT, filePath)}: Playground injects the browser connection — remove window.playwright.chromium.connectOverCDP and use the provided globals.`,
    );
  }

  if (hasStagehandUsage(sourceText) && !/Stagehand\.create\s*\(/.test(sourceText)) {
    throw new Error(
      `${path.relative(ROOT, filePath)}: Stagehand usage detected but no \`Stagehand.create({...})\` call — playground config merge requires a Stagehand factory call.`,
    );
  }
}

async function main() {
  const entries = await fetchPlaygroundTypescriptTemplateEntries();

  for (const { slug, typescriptDir } of entries) {
    const base = path.join(TYPESCRIPT_ROOT, typescriptDir);
    const tsPath = path.join(base, "index.ts");
    const tsxPath = path.join(base, "index.tsx");

    let entryPath = tsPath;
    try {
      await access(tsPath, constants.F_OK);
    } catch {
      await access(tsxPath, constants.F_OK);
      entryPath = tsxPath;
    }

    await validateSourceFile(entryPath);
    process.stdout.write(`OK playground source: ${slug} → typescript/${typescriptDir}\n`);
  }

  process.stdout.write(`Validated ${entries.length} playground template sources.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
