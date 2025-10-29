// Stagehand + Browserbase: Polymarket prediction market research - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

/**
 * Searches Polymarket for a prediction market and extracts current odds, pricing, and volume data.
 * Uses AI-powered browser automation to navigate and interact with the site.
 */
async function main() {
  console.log("Starting Polymarket research automation...");

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  // Using BROWSERBASE environment to run in cloud rather than locally
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
    model: "openai/gpt-4.1",
  });

  try {
    // Initialize browser session
    console.log("Initializing browser session...");
    await stagehand.init();
    console.log("Stagehand session started successfully");

    // Provide live session URL for debugging and monitoring
    console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

    const page = stagehand.context.pages()[0];

    // Navigate to Polymarket
    console.log("Navigating to: https://polymarket.com/");
    await page.goto("https://polymarket.com/");
    console.log("Page loaded successfully");

    // Click the search box to trigger search dropdown
    console.log("Clicking the search box at the top of the page");
    await stagehand.act("click the search box at the top of the page");

    // Type search query
    const searchQuery = "Elon Musk unfollow Trump";
    console.log(`Typing '${searchQuery}' into the search box`);
    await stagehand.act(`type '${searchQuery}' into the search box`);

    // Click the first market result from the search dropdown
    console.log("Selecting first market result from search dropdown");
    await stagehand.act("click the first market result from the search dropdown");
    console.log("Market page loaded");

    // Extract market data using AI to parse the structured information
    console.log("Extracting market information...");
    const marketData = await stagehand.extract(
      "Extract the current odds and market information for the prediction market",
      z.object({
        marketTitle: z.string().optional().describe("the title of the market"),
        currentOdds: z.string().optional().describe("the current odds or probability"),
        yesPrice: z.string().optional().describe("the yes price"),
        noPrice: z.string().optional().describe("the no price"),
        totalVolume: z.string().optional().describe("the total trading volume"),
        priceChange: z.string().optional().describe("the recent price change"),
      }),
    );

    console.log("Market data extracted successfully:");
    console.log(JSON.stringify(marketData, null, 2));
  } catch (error) {
    console.error("Error during market research:", error);
    
    // Provide helpful troubleshooting information
    console.error("\nCommon issues:");
    console.error("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("2. Verify OPENAI_API_KEY is set in environment");
    console.error("3. Ensure internet access and https://polymarket.com is accessible");
    console.error("4. Verify Browserbase account has sufficient credits");
    
    throw error;
  } finally {
    // Clean up browser session
    console.log("Closing browser session...");
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  process.exit(1);
});