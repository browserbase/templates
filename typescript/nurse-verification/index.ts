// Stagehand + Browserbase: Automated Nurse License Verification - See README.md for full documentation

import "dotenv/config";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v4";

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
  const browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });
  const stagehand = await Stagehand.create({
    browser: browser,
    model: { modelName: "openai/gpt-4.1" },
    logging: { level: "info" },
  });

  try {
    // Initialize browser session
    console.log("Initializing browser session...");

    console.log("Stagehand session started successfully");

    const page = (await browser.context.pages())[0];

    // Process each license record sequentially
    for (const LicenseRecord of LicenseRecords) {
      console.log(`Verifying license for: ${LicenseRecord.FirstName} ${LicenseRecord.LastName}`);

      // Navigate to license verification site
      console.log(`Navigating to: ${LicenseRecord.Site}`);
      await page.goto(LicenseRecord.Site);
      await page.waitForLoadState("domcontentloaded");

      // Fill in form fields with license information
      console.log("Filling in license information...");
      await stagehand.act(`Type "${LicenseRecord.FirstName}" into the first name field`);
      await stagehand.act(`Type "${LicenseRecord.LastName}" into the last name field`);
      await stagehand.act(`Type "${LicenseRecord.LicenseNumber}" into the license number field`);

      // Submit search
      console.log("Clicking search button...");
      await stagehand.act("Click the search button");

      // Let Stagehand observe the result surface before extracting it.
      await stagehand.observe("Find the first visible license result row");

      // Extract license verification results
      console.log("Extracting license verification results...");
      const { data: results } = await stagehand.extract(
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
    console.error("1. Check .env file has BROWSERBASE_API_KEY");
    console.error("2. Ensure internet access and license verification site is accessible");
    console.error("3. Verify Browserbase account has sufficient credits");

    throw error;
  } finally {
    // Clean up browser session
    console.log("Closing browser session...");
    await stagehand.close().catch((error) => console.warn("Stagehand cleanup warning:", error));
    await browser.close().catch((error) => console.warn("Browser cleanup warning:", error));
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  process.exit(1);
});
