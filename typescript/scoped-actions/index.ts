// Scoped Actions for Complex Pages - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Wikipedia GDP page — data-heavy page with multiple tables, navboxes, and sidebars
const TARGET_URL = "https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)";

// Scope to the first sortable data table
const SELECTOR_SCOPE = "table.sortable";

// Scoped act: observe within a selector, then act on the best match.
// observe() scopes the snapshot to the selector subtree, and act() on the
// returned action executes with zero additional inference.
async function scopedAct(stagehand: Stagehand, instruction: string, selector: string) {
  const actions = await stagehand.observe(instruction, { selector });
  if (actions.length === 0) {
    console.warn(`No actions found for "${instruction}" within "${selector}"`);
    return null;
  }
  return stagehand.act(actions[0]);
}

// Schema for extracting country GDP data
const GDPSchema = z.object({
  countries: z
    .array(
      z.object({
        country: z.string().describe("The country name"),
        gdp: z.string().describe("The GDP value in millions of USD"),
      }),
    )
    .describe("The first 3 countries by GDP from the table"),
});

async function main(): Promise<void> {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    model: "openai/gpt-4.1-mini",
  });

  await stagehand.init();
  console.log(`Session: ${stagehand.browserbaseSessionURL}`);
  console.log(`Debug URL: ${stagehand.browserbaseDebugURL}\n`);

  try {
    const page = stagehand.context.pages()[0];
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

    // Scoped extract: only the selector subtree is sent to the model, not the full page
    console.log(`Scoped extract (selector: "${SELECTOR_SCOPE}")...`);
    const data = await stagehand.extract(
      "Extract the first 3 countries with their rank, name, and GDP value",
      GDPSchema,
      { selector: SELECTOR_SCOPE },
    );
    console.log("Result:", JSON.stringify(data.countries, null, 2));

    // Scoped act: uses the scopedAct wrapper to click within the table only
    console.log(`\nScoped act (selector: "${SELECTOR_SCOPE}")...`);
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

    const result = await scopedAct(
      stagehand,
      "Click on the link for the first country in the table",
      SELECTOR_SCOPE,
    );

    if (result) {
      console.log(`Clicked → navigated to: ${page.url()}`);
    }
  } finally {
    await stagehand.close();
    console.log("\nDone.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify OPENAI_API_KEY is set for the model");
  console.error("Docs: https://docs.stagehand.dev");
  process.exit(1);
});
