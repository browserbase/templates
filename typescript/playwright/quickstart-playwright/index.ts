// Playwright + Browserbase: Quickstart
// See README.md for full documentation

import "dotenv/config";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

// ============= CONFIGURATION =============
const BROWSERBASE_API_KEY: string = process.env.BROWSERBASE_API_KEY!;
// =========================================

if (!BROWSERBASE_API_KEY) {
  throw new Error("BROWSERBASE_API_KEY is not set");
}

const bb = new Browserbase({
  apiKey: BROWSERBASE_API_KEY,
});

async function main() {
  const session = await bb.sessions.create();
  console.log(`Session created, id: ${session.id}`);

  console.log("Starting remote browser...");
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0];

  try {
    const debugUrls = await bb.sessions.debug(session.id);
    console.log(`Session started, live debug accessible here: ${debugUrls.debuggerUrl}.`);

    // Navigate to the SFMOMA homepage
    await page.goto("https://www.sfmoma.org", {
      waitUntil: "domcontentloaded",
    });
    console.log(`At URL: ${page.url()} | Title: ${await page.title()}`);

    const WAIT_TIMEOUT = 10_000;

    // Click the search button to open the search overlay
    const searchButton = page.locator('button[aria-label="Open search"]');
    await searchButton.waitFor({ state: "visible", timeout: WAIT_TIMEOUT });
    await searchButton.click();
    console.log("Clicked search button — search overlay opened");

    // Close the search overlay
    const closeButton = page.locator('button[aria-label="Close search"]');
    await closeButton.waitFor({ state: "visible", timeout: WAIT_TIMEOUT });
    await closeButton.click();
    console.log("Closed search overlay");

    // Click the Membership link
    const membershipLink = page.getByRole("link", { name: "Membership", exact: true });
    await membershipLink.waitFor({ state: "visible", timeout: WAIT_TIMEOUT });
    await membershipLink.click();
    await page.waitForURL("**/membership**", { timeout: WAIT_TIMEOUT });
    console.log(`At URL: ${page.url()} | Title: ${await page.title()}`);

    // Extract copy from the membership page
    const heading = page.locator("h1");
    await heading.waitFor({ state: "visible", timeout: WAIT_TIMEOUT });
    console.log(`Heading: ${await heading.textContent()}`);

    const intro = page.locator("main p").first();
    console.log(`Intro: ${await intro.textContent()}`);
  } finally {
    await page.close();
    await browser.close();
  }

  console.log(`Session complete! View replay at https://browserbase.com/sessions/${session.id}`);
}

main().catch((err) => {
  console.error("Error in Playwright quickstart:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY");
  console.error("  - Verify your API key is valid and has access");
  console.error("  - Ensure the target page is accessible");
  console.error("Docs: https://docs.browserbase.com");
  process.exit(1);
});
