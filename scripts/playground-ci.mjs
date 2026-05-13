import { spawnSync } from "node:child_process";
import console from "node:console";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { fetchPlaygroundTypescriptDirNames } from "./fetch-playground-typescript-dirs.mjs";

const JAVASCRIPT_DIR = path.join(process.cwd(), "javascript");

async function main() {
  const dirs = await fetchPlaygroundTypescriptDirNames();
  dirs.sort();

  // With zero dirs, do not invoke build-javascript with no filters: that path wipes
  // javascript/ and rebuilds every template. Playground CI must produce an empty tree
  // (or only future API-listed templates), not a full mirror of typescript/.
  if (dirs.length === 0) {
    process.stdout.write(
      "No playground-runnable templates from API; skipping transpile and clearing javascript/.\n",
    );
    await rm(JAVASCRIPT_DIR, { recursive: true, force: true });
    await mkdir(JAVASCRIPT_DIR, { recursive: true });
  } else {
    const argv = ["scripts/build-javascript.mjs"];
    for (const name of dirs) {
      argv.push("--include-template", name);
    }

    process.stdout.write(`Building ${dirs.length} playground TypeScript templates…\n`);
    const build = spawnSync(process.execPath, argv, { stdio: "inherit", encoding: "utf8" });
    if (build.status !== 0) {
      process.exit(build.status ?? 1);
    }
  }

  const validate = spawnSync(process.execPath, ["scripts/validate-playground-templates.mjs"], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (validate.status !== 0) {
    process.exit(validate.status ?? 1);
  }

  process.stdout.write("Playground CI: build + validation passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
