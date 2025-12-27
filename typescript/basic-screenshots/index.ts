// Stagehand + Browserbase: Basic Screenshots Automation - See README.md for full documentation

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { Stagehand } from "@browserbasehq/stagehand";
import type { Page } from "playwright";
import "dotenv/config";

const SCREENSHOTS_DIR = "screenshots";

// Helper function to take and save a screenshot
// Captures full-page screenshots in JPEG format for documentation and debugging
async function takeScreenshot(page: Page, filename: string) {
  console.log(`Taking screenshot: ${filename}...`);
  const buffer = await page.screenshot({
    type: "jpeg",
    quality: 80,
    fullPage: true,
  });
  const filepath = join(SCREENSHOTS_DIR, filename);
  writeFileSync(filepath, buffer);
  console.log(`Saved: ${filepath}`);
}

async function main() {
  console.log("Starting Basic Screenshots Example...");

  // Create screenshots directory if it doesn't exist
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log(`Created directory: ${SCREENSHOTS_DIR}`);
  }

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "google/gemini-2.5-flash",
  });

  try {
    // Initialize browser session to start automation
    console.log("Initializing browser session...");
    await stagehand.init();
    console.log("Stagehand initialized successfully!");

    // Provide live session URL for debugging and monitoring
    if (stagehand.browserbaseSessionID) {
      console.log(
        `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
      );
    }

    const page = stagehand.context.pages()[0];

    // Navigate to Polymarket homepage
    console.log("Navigating to: https://polymarket.com/");
    await page.goto("https://polymarket.com/");
    console.log("Page loaded successfully");
    await takeScreenshot(page, "screenshot-01-initial-page.jpeg");

    // Click the search box to trigger search dropdown
    console.log("Clicking the search box at the top of the page");
    await stagehand.act("click the search box at the top of the page");
    await takeScreenshot(page, "screenshot-02-after-click-search.jpeg");

    // Type search query into the search box
    const searchQuery = "Elon Musk unfollow Trump";
    console.log(`Typing '${searchQuery}' into the search box`);
    await stagehand.act(`type '${searchQuery}' into the search box`);
    await takeScreenshot(page, "screenshot-03-after-type-search.jpeg");

    // Click the first market result from the search dropdown
    console.log("Selecting first market result from search dropdown");
    await stagehand.act("click the first market result from the search dropdown");
    console.log("Market page loaded");
    await takeScreenshot(page, "screenshot-04-after-select-market.jpeg");

    console.log("All screenshots captured!");
  } catch (error) {
    console.error("Error during screenshot capture:", error);

    // Provide helpful troubleshooting information
    console.error("\nCommon issues:");
    console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("  - Verify GOOGLE_GENERATIVE_AI_API_KEY is set in environment");
    console.error("  - Ensure internet access and https://polymarket.com is accessible");
    console.error("  - Verify Browserbase account has sufficient credits");
    throw error;
  } finally {
    // Always close session to release resources and clean up
    console.log("Closing browser session...");
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  process.exit(1);
});
