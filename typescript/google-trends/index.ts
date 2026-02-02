// Stagehand + Browserbase: Google Trends Keywords Extractor - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Configuration variables
const countryCode = "US"; // Two-letter ISO code (US, GB, IN, DE, FR, BR)
const limit = 20; // Max keywords to return
const language = "en-US"; // Language code for results

// Define Zod schema for structured data extraction
const TrendingKeywordSchema = z.object({
  rank: z.number().describe("Position in the trending list (1, 2, 3, etc.)"),
  keyword: z.string().describe("The main trending search term or keyword"),
});

async function main() {
  console.log("Starting Google Trends Keywords Extractor...");
  console.log(`Country Code: ${countryCode}`);
  console.log(`Language: ${language}`);
  console.log(`Limit: ${limit} keywords`);

  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "google/gemini-2.5-flash",
  });

  try {
    // Initialize browser session to start data extraction process.
    await stagehand.init();
    console.log("Stagehand initialized successfully");

    // Provide live session URL for debugging and monitoring extraction process.
    console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

    const page = stagehand.context.pages()[0];

    // Build and navigate to Google Trends URL with country code and language.
    const trendsUrl = `https://trends.google.com/trending?geo=${countryCode.toUpperCase()}&hl=${language}`;
    console.log(`Navigating to: ${trendsUrl}`);
    await page.goto(trendsUrl, {
      waitUntil: "networkidle",
    });
    console.log("Page loaded successfully");

    // Dismiss any consent/welcome dialogs that block content.
    try {
      console.log("Checking for consent dialogs...");
      await stagehand.act('Click the "Got it" button if visible', { timeout: 5000 });
      // Small delay to let the dialog close and content load.
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch {
      // No dialog present, continue.
      console.log("No consent dialog found, continuing...");
    }

    // Extract trending keywords using Stagehand's structured extraction with Zod schema.
    console.log("Extracting trending keywords from table...");
    const extractResult = await stagehand.extract(
      `Extract the trending search keywords from the Google Trends table. Each row has a trending topic/keyword shown as a button (like "catherine ohara", "don lemon arrested", "fed chair", etc.). For each trend, extract the main keyword text and assign a rank starting from 1 for the first trend. Return up to ${limit} items.`,
      z.array(TrendingKeywordSchema),
    );

    // Apply limit to results and build output structure.
    const limitedKeywords = extractResult.slice(0, limit);
    console.log(`Successfully extracted ${limitedKeywords.length} trending keywords`);

    // Output formatted results with metadata.
    const result = {
      country_code: countryCode.toUpperCase(),
      language: language,
      extracted_at: new Date().toISOString(),
      trending_keywords: limitedKeywords,
    };

    console.log("\n=== Results ===");
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nExtraction complete! Found ${limitedKeywords.length} trending keywords.`);
  } catch (error) {
    console.error("Error extracting trending keywords:", error);

    // Provide helpful troubleshooting information.
    console.error("\nCommon issues:");
    console.error("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("2. Verify GOOGLE_API_KEY is set in environment");
    console.error("3. Ensure country code is a valid 2-letter ISO code (US, GB, IN, DE, etc.)");
    console.error("4. Verify Browserbase account has sufficient credits");
    console.error("5. Check if Google Trends page structure has changed");

    throw error;
  } finally {
    // Always close session to release resources and clean up.
    console.log("Closing browser session...");
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify country code is a valid 2-letter ISO code (US, GB, IN, DE, etc.)");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
