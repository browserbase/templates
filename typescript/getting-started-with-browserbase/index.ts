// Browserbase: Getting Started - See README.md for full documentation
//
// Demos the three core Browserbase capabilities:
//   1. Search API  — web search without a browser
//   2. Fetch API   — lightweight HTTP fetch through Browserbase infra
//   3. Sessions    — full cloud browser controlled via Playwright + CDP

import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";

// ============= CONFIGURATION =============
// The topic to search, fetch, and browse
const SEARCH_QUERY = "Browser automation";
// =========================================

// ---------------------------------------------------------------------------
// 1. Search API — run a web search, no browser needed
// ---------------------------------------------------------------------------

async function demoSearchApi(bb: Browserbase): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("1. SEARCH API");
  console.log("=".repeat(50));
  console.log(`Searching the web for "${SEARCH_QUERY}"...`);

  const response = await bb.search.web({
    query: SEARCH_QUERY,
    numResults: 5,
  });

  console.log(`\nTop ${response.results.length} results:`);
  for (const result of response.results) {
    console.log(`  - ${result.title}`);
    console.log(`    ${result.url}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Fetch API — lightweight HTTP fetch, no browser session needed
// ---------------------------------------------------------------------------

async function demoFetchApi(bb: Browserbase): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("2. FETCH API");
  console.log("=".repeat(50));

  const targetUrl = "https://en.wikipedia.org/wiki/Browser_automation";
  console.log(`Fetching ${targetUrl} (no browser)...`);

  const response = await bb.fetchAPI.create({ url: targetUrl, allowRedirects: true });

  console.log(`  Status: ${response.statusCode}`);
  console.log(`  Content length: ${response.content.length} chars`);

  // Pull the title out of the raw HTML
  const titleMatch = response.content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Unknown";
  console.log(`  Page title: ${title}`);
}

// ---------------------------------------------------------------------------
// 3. Sessions + Playwright — full cloud browser via CDP
// ---------------------------------------------------------------------------

async function demoBrowserSession(bb: Browserbase): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("3. BROWSER SESSION (Playwright + CDP)");
  console.log("=".repeat(50));

  // Create a session
  console.log("Creating a Browserbase session...");
  const session = await bb.sessions.create({});

  console.log(`Session ID: ${session.id}`);
  console.log(`Live view: https://browserbase.com/sessions/${session.id}`);

  // Connect via CDP
  console.log("Connecting to browser via CDP...");
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const page = browser.contexts()[0]?.pages()[0];

  if (!page) {
    await browser.close();
    throw new Error("No page found — session may have failed to start.");
  }
  console.log("Connected!");

  try {
    // Navigate to Wikipedia
    console.log(`\nSearching Wikipedia for "${SEARCH_QUERY}"...`);
    await page.goto("https://www.wikipedia.org/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Search
    await page.fill('input[name="search"]', SEARCH_QUERY);
    await page.click('button[type="submit"]');
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("h1", { state: "visible", timeout: 10000 });

    // Extract content
    const title = (await page.textContent("h1")) || "No title found";
    const summary = await page
      .locator("#mw-content-text p:not(.mw-empty-elt)")
      .first()
      .textContent()
      .then((text) => (text || "").trim());
    const sections = await page
      .locator("#mw-content-text .mw-heading2 h2")
      .allTextContents()
      .then((headings) => headings.map((h) => h.replace("[edit]", "").trim()).filter(Boolean));

    console.log(`\n  Title: ${title}`);
    console.log(`  Summary: ${summary}`);
    console.log(`  Sections (${sections.length}):`);
    for (const section of sections) {
      console.log(`    - ${section}`);
    }
    console.log(`\n  Session replay: https://browserbase.com/sessions/${session.id}`);
  } finally {
    await browser.close();
    console.log("  Browser closed.");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=".repeat(50));
  console.log("GETTING STARTED WITH BROWSERBASE");
  console.log("=".repeat(50));
  console.log("Demos: Search API, Fetch API, and Browser Sessions\n");

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

  await demoSearchApi(bb);
  await demoFetchApi(bb);
  await demoBrowserSession(bb);

  console.log("\n" + "=".repeat(50));
  console.log("ALL DEMOS COMPLETE!");
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("Error:", error.message);
  console.error("\nTroubleshooting:");
  console.error("  1. Check your .env file has BROWSERBASE_API_KEY");
  console.error("  2. Verify your API key at https://browserbase.com/settings");
  console.error("  3. View session logs at https://browserbase.com/sessions");
  console.error("Docs: https://docs.browserbase.com");
  process.exit(1);
});
