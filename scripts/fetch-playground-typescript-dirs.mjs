import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TYPESCRIPT_ROOT = path.join(ROOT, "typescript");

/**
 * create-browser-app --template name → folder under typescript/ when names differ.
 * Keys are the `--template` flag value from website `commands`, not marketing slug.
 */
const TEMPLATE_FLAG_TO_TYPESCRIPT_DIR = new Map([
  ["google-trends-keywords", "google-trends"],
  ["real-estate-license-verification", "license-verification"],
]);

/**
 * @param {unknown} commands
 * @returns {string | null}
 */
export function extractCreateBrowserAppTemplateName(commands) {
  if (!Array.isArray(commands)) return null;
  for (const cmd of commands) {
    if (typeof cmd !== "string") continue;
    if (!/\bcreate-browser-app\b/.test(cmd)) continue;
    const match = /--template(?:=|\s+)(\S+)/.exec(cmd);
    if (match) return match[1];
  }
  return null;
}

/**
 * @param {string} dirName
 */
async function assertTypescriptTemplateDir(dirName) {
  const abs = path.join(TYPESCRIPT_ROOT, dirName);
  const dirStat = await stat(abs);
  if (!dirStat.isDirectory()) {
    throw new Error(`Not a directory: typescript/${dirName}`);
  }
  const tsEntry = path.join(abs, "index.ts");
  const tsxEntry = path.join(abs, "index.tsx");
  try {
    await access(tsEntry, constants.F_OK);
    return;
  } catch {
    await access(tsxEntry, constants.F_OK);
  }
}

/**
 * Fetches the public templates list (already filtered to playgroundRunnable on the server).
 *
 * @param {string} [apiUrl]
 * @returns {Promise<{ slug: string; templateFlag: string; typescriptDir: string }[]>}
 */
function resolveTemplatesApiUrl(explicit) {
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  const fromEnv = process.env.TEMPLATES_API_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return "https://www.browserbase.com/api/templates";
}

export async function fetchPlaygroundTypescriptTemplateEntries(apiUrl) {
  const url = resolveTemplatesApiUrl(apiUrl);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Templates API ${response.status} ${response.statusText} (${url})`);
  }

  const body = await response.json();
  const templates = body?.templates;
  if (!Array.isArray(templates)) {
    throw new Error("Templates API response missing templates[]");
  }

  /** @type {{ slug: string; templateFlag: string; typescriptDir: string }[]} */
  const entries = [];

  for (const template of templates) {
    const slug = template?.slug;
    const flag = extractCreateBrowserAppTemplateName(template?.commands);
    if (typeof slug !== "string" || !flag) {
      throw new Error(
        `Template missing slug or npx create-browser-app --template in commands: ${JSON.stringify(template?.slug)}`,
      );
    }

    const typescriptDir = TEMPLATE_FLAG_TO_TYPESCRIPT_DIR.get(flag) ?? flag;
    await assertTypescriptTemplateDir(typescriptDir);
    entries.push({ slug, templateFlag: flag, typescriptDir });
  }

  return entries;
}

/**
 * Unique typescript folder names for build filters.
 *
 * @param {string} [apiUrl]
 * @returns {Promise<string[]>}
 */
export async function fetchPlaygroundTypescriptDirNames(apiUrl) {
  const entries = await fetchPlaygroundTypescriptTemplateEntries(apiUrl);
  return [...new Set(entries.map((e) => e.typescriptDir))];
}
