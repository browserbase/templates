// Basic reCAPTCHA Solving with Browserbase - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

async function main() {
  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  // Enable captcha solving in browser settings for automatic reCAPTCHA handling.

  const solveCaptchas = true; // Set to false to disable automatic captcha solving (true by default)

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    browserbaseSessionCreateParams: {
      browserSettings: {
        solveCaptchas: solveCaptchas,
      },
    },
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(
      `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`,
    );

    const page = stagehand.context.pages()[0];

    // Navigate to Google reCAPTCHA demo page to test captcha solving.
    console.log("Navigating to reCAPTCHA demo page...");
    await page.goto("https://google.com/recaptcha/api2/demo");

    // Wait for Browserbase to solve the captcha automatically.
    // Listen for console messages indicating captcha solving progress.
    if (solveCaptchas) {
      console.log("Waiting for captcha to be solved...");
      await new Promise<void>((resolve) => {
        page.on("console", (msg) => {
          if (msg.text() === "browserbase-solving-started") {
            console.log("Captcha solving in progress...");
          } else if (msg.text() === "browserbase-solving-finished") {
            console.log("Captcha solving completed!");
            resolve();
          }
        });
      });
    } else {
      console.log("Captcha solving is disabled. Skipping wait...");
    }

    // Click submit again after captcha is solved to complete the form submission.
    console.log("Clicking submit button after captcha is solved...");
    await stagehand.act("Click the Submit button");

    // Extract and display the page content to verify successful submission.
    console.log("Extracting page content...");
    const text = await stagehand.extract("Extract all the text on this page");
    console.log("Page content:");
    console.log(text);

    // Check if captcha was successfully solved by looking for success message.
    if (text.extraction.includes("Verification Success... Hooray!")) {
      console.log("reCAPTCHA successfully solved!");
    } else {
      console.log("Could not verify captcha success from page content");
    }
  } catch (error) {
    console.error("Error during reCAPTCHA solving:", error);
  } finally {
    // Always close session to release resources and clean up.
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in reCAPTCHA solving example:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify solveCaptchas is enabled in browserSettings");
  console.error("  - Ensure the demo page is accessible");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
