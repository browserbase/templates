import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const README_PATH = path.join(REPO_ROOT, "README.md");
const TEMPLATE_ROOTS = {
  typescript: "TS",
  python: "PY",
  go: "GO",
};
const LANGUAGE_COLUMNS = ["TS", "PY", "GO"];
const LANGUAGE_TO_ROOT = Object.fromEntries(
  Object.entries(TEMPLATE_ROOTS).map(([root, language]) => [language, root]),
);
const SECTION_PATTERN = /^## All Templates\r?\n\r?\n([\s\S]*?)(?=^##\s)/m;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getTrackedTemplatePaths() {
  try {
    const gitOutput = execFileSync(
      "git",
      ["ls-files", "-co", "--exclude-standard", "--", ...Object.keys(TEMPLATE_ROOTS)],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      },
    );

    return new Set(
      gitOutput
        .split(/\r?\n/)
        .filter(Boolean)
        .map((filePath) => {
          const [root, templateName] = filePath.split("/");
          if (!TEMPLATE_ROOTS[root] || !templateName) {
            return null;
          }

          return `${root}/${templateName}`;
        })
        .filter(Boolean),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not determine tracked template paths from git:\n${message}`);
  }
}

function getExpectedRows() {
  const rows = new Map();

  for (const templatePath of [...getTrackedTemplatePaths()].sort()) {
    const [root, name] = templatePath.split("/");
    const language = TEMPLATE_ROOTS[root];
    const row = rows.get(name) ?? { name, languages: {} };
    row.languages[language] = { label: language, path: templatePath };
    rows.set(name, row);
  }

  return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function getReadmeSection(readmeContents) {
  const match = readmeContents.match(SECTION_PATTERN);
  if (!match) {
    fail("Could not find the `## All Templates` section in README.md.");
  }

  return match[1];
}

function parseLanguageCell(cell, expectedLanguage, rowName, line) {
  if (cell === "-") {
    return null;
  }

  const match = cell.match(/^\[([A-Z]{2})\]\(([^)]+)\)$/);
  if (!match) {
    fail(
      `Invalid ${expectedLanguage} cell format for template \`${rowName}\` in README.md:\n${line}`,
    );
  }

  const [, label, templatePath] = match;
  return { label, path: templatePath };
}

function parseReadmeRows(section) {
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 3) {
    fail("README template table is missing rows.");
  }

  const dataLines = lines.slice(2);

  return dataLines.map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length !== 5) {
      fail(`Invalid template row format in README.md:\n${line}`);
    }

    const [name, tsCell, pyCell, goCell, description] = cells;

    return {
      name,
      languages: {
        TS: parseLanguageCell(tsCell, "TS", name, line),
        PY: parseLanguageCell(pyCell, "PY", name, line),
        GO: parseLanguageCell(goCell, "GO", name, line),
      },
      description: description.trim(),
    };
  });
}

function findDuplicateNames(rows) {
  const counts = new Map();

  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

function findDuplicatePaths(rows) {
  const counts = new Map();

  for (const row of rows) {
    for (const language of LANGUAGE_COLUMNS) {
      const cell = row.languages[language];
      if (!cell) {
        continue;
      }

      counts.set(cell.path, (counts.get(cell.path) ?? 0) + 1);
    }
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([entryPath]) => entryPath);
}

function flattenRowPaths(rows) {
  return rows.flatMap((row) =>
    LANGUAGE_COLUMNS.flatMap((language) => {
      const cell = row.languages[language];
      return cell ? [cell.path] : [];
    }),
  );
}

function validateReadmeRows(rows) {
  const problems = [];

  for (const row of rows) {
    if (!row.name) {
      problems.push("README has a template row with an empty name.");
    }

    if (!row.description) {
      problems.push(`README row \`${row.name}\` is missing a description.`);
    }

    const linkedLanguages = LANGUAGE_COLUMNS.filter((language) => row.languages[language]);
    if (linkedLanguages.length === 0) {
      problems.push(`README row \`${row.name}\` must link at least one template.`);
    }

    for (const language of LANGUAGE_COLUMNS) {
      const cell = row.languages[language];
      if (!cell) {
        continue;
      }

      if (cell.label !== language) {
        problems.push(
          `README row \`${row.name}\` has a ${cell.label} link in the ${language} column.`,
        );
      }

      const segments = cell.path.split("/");
      if (segments.length !== 2) {
        problems.push(
          `README entry \`${cell.path}\` must point to a first-level template directory.`,
        );
        continue;
      }

      const [root] = segments;
      const expectedRoot = LANGUAGE_TO_ROOT[language];
      if (root !== expectedRoot) {
        problems.push(
          `README entry \`${cell.path}\` is in the ${language} column, but ${language} templates must live under \`${expectedRoot}/\`.`,
        );
      }

      const directoryName = path.posix.basename(cell.path);
      if (row.name !== directoryName) {
        problems.push(
          `README row name \`${row.name}\` must match directory name \`${directoryName}\`.`,
        );
      }
    }
  }

  return problems;
}

function getOrderMessage(expectedRows, readmeRows) {
  const expectedNames = expectedRows.map((row) => row.name);
  const actualNames = readmeRows.map((row) => row.name);
  const mismatchIndex = expectedNames.findIndex(
    (expectedName, index) => expectedName !== actualNames[index],
  );

  if (mismatchIndex === -1) {
    return null;
  }

  return [
    "README template rows are out of order.",
    "Sort rows alphabetically by template name.",
    `First mismatch at row ${mismatchIndex + 1}: expected \`${expectedNames[mismatchIndex]}\`, found \`${actualNames[mismatchIndex]}\`.`,
  ].join("\n");
}

function main() {
  const readmeContents = readFileSync(README_PATH, "utf8");
  const expectedRows = getExpectedRows();
  const readmeRows = parseReadmeRows(getReadmeSection(readmeContents));

  const duplicateNames = findDuplicateNames(readmeRows);
  const duplicatePaths = findDuplicatePaths(readmeRows);
  const validationProblems = validateReadmeRows(readmeRows);
  const expectedPaths = new Set(flattenRowPaths(expectedRows));
  const readmePaths = new Set(flattenRowPaths(readmeRows));
  const missingEntries = [...expectedPaths].filter((entry) => !readmePaths.has(entry));
  const unexpectedEntries = [...readmePaths].filter((entry) => !expectedPaths.has(entry));
  const orderProblem = getOrderMessage(expectedRows, readmeRows);

  const problems = [];

  if (duplicateNames.length > 0) {
    problems.push(
      `Duplicate README template rows found:\n${duplicateNames.map((name) => `- ${name}`).join("\n")}`,
    );
  }

  if (duplicatePaths.length > 0) {
    problems.push(
      `Duplicate README entries found:\n${duplicatePaths.map((entryPath) => `- ${entryPath}`).join("\n")}`,
    );
  }

  if (validationProblems.length > 0) {
    problems.push(validationProblems.map((problem) => `- ${problem}`).join("\n"));
  }

  if (missingEntries.length > 0) {
    problems.push(
      `Template directories missing from README:\n${missingEntries.map((entry) => `- ${entry}`).join("\n")}`,
    );
  }

  if (unexpectedEntries.length > 0) {
    problems.push(
      `README entries that do not match any template directory:\n${unexpectedEntries.map((entry) => `- ${entry}`).join("\n")}`,
    );
  }

  if (orderProblem) {
    problems.push(orderProblem);
  }

  if (problems.length > 0) {
    fail(
      ["README template index is out of sync with the template directory tree.", ...problems].join(
        "\n\n",
      ),
    );
  }

  console.log(
    `README template index matches ${expectedRows.length} template rows covering ${expectedPaths.size} first-level template directories.`,
  );
}

main();
