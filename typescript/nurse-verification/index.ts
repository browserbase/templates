// Stagehand + Browserbase: Automated Nurse License Verification - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// License records to verify - add more records as needed
const LicenseRecords = [
  {
    Site: "https://pod-search.kalmservices.net/",
    FirstName: "Ronald",
    LastName: "Agee",
    LicenseNumber: "346",
  },
];

async function main() {
  console.log("Starting Nurse License Verification Automation...");

  // Initialize Stagehand with Browserbase for cloud-based browser automation
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
    console.log(
      `Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
    );

    const page = stagehand.context.pages()[0];

    // Process each license record sequentially
    for (const LicenseRecord of LicenseRecords) {
      console.log(
        `Verifying license for: ${LicenseRecord.FirstName} ${LicenseRecord.LastName}`,
      );

      // Navigate to license verification site
      console.log(`Navigating to: ${LicenseRecord.Site}`);
      await page.goto(LicenseRecord.Site);
      await page.waitForLoadState("domcontentloaded");
  

      // Fill in form fields with license information
      console.log("Filling in license information...");
      await stagehand.act(
        `Type "${LicenseRecord.FirstName}" into the first name field`,
      );
      await stagehand.act(`Type "${LicenseRecord.LastName}" into the last name field`);
      await stagehand.act(
        `Type "${LicenseRecord.LicenseNumber}" into the license number field`,
      );

      // Submit search
      console.log("Clicking search button...");
      await stagehand.act("Click the search button");

      // Wait for search results to load
      await page.waitForLoadState("domcontentloaded");

      // Extract license verification results
      console.log("Extracting license verification results...");
      const results = await stagehand.extract(
        "Extract ALL the license verification results from the page, including name, license number and status",
        z.object({
          list_of_licenses: z.array(
            z.object({
              name: z.string(),
              license_number: z.string(),
              status: z.string(),
              more_info_url: z.string(),
            }),
          ),
        }),
      );

      console.log("License verification results extracted:");
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error("Error during license verification:", error);

    // Provide helpful troubleshooting information
    console.error("\nCommon issues:");
    console.error("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("2. Verify OPENAI_API_KEY is set in environment");
    console.error("3. Ensure internet access and license verification site is accessible");
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