// Basic reCAPTCHA Solving with Playwright + Browserbase - See README.md for full documentation
//
// This template uses Playwright directly with the Browserbase SDK for lower-level browser control.
// For a higher-level API with natural language commands, see the Stagehand template instead.

import { chromium, Browser, Page } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";

const DEMO_URL = "https://google.com/recaptcha/api2/demo";
const SOLVE_CAPTCHAS = true; // Set to false to disable automatic captcha solving

// Validate required environment variables before starting.
// Browserbase credentials are required to create browser sessions.
function validateEnv(): { apiKey: string } {
  const apiKey = process.env.BROWSERBASE_API_KEY;

  if (!apiKey) {
    throw new Error("BROWSERBASE_API_KEY environment variable is required");
  }

  return { apiKey };
}

async function main() {
  console.log("Starting Playwright + Browserbase reCAPTCHA Example...");

  const { apiKey } = validateEnv();

  // Initialize the Browserbase SDK client.
  const bb = new Browserbase({ apiKey });

  // Create a new browser session with captcha solving enabled.
  // solveCaptchas: Browserbase setting that enables automatic solving for reCAPTCHA, hCaptcha, and other captcha types.
  // Docs: https://docs.browserbase.com/features/stealth-mode#captcha-solving
  console.log("Creating Browserbase session with captcha solving enabled...");
  const session = await bb.sessions.create({
    browserSettings: {
      solveCaptchas: SOLVE_CAPTCHAS,
    },
  });

  console.log(`Session created! ID: ${session.id}`);
  console.log(`Live View: https://browserbase.com/sessions/${session.id}`);

  // Connect to the browser via Chrome DevTools Protocol (CDP).
  // This gives direct Playwright control over the Browserbase-managed browser.
  console.log("Connecting to browser via CDP...");
  const browser: Browser = await chromium.connectOverCDP(session.connectUrl);

  // Get the default browser context and page from the connected browser.
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No browser context found");
  }

  const page: Page = context.pages()[0];
  if (!page) {
    throw new Error("No page found in context");
  }

  try {
    // Set up captcha solving state tracking.
    let captchaSolved = false;
    let captchaResolve: () => void;

    const captchaPromise = new Promise<void>((resolve) => {
      captchaResolve = resolve;
    });

    // Listen for browser console messages indicating captcha solving progress.
    // Browserbase emits these events when automatic captcha solving is active:
    //   - "browserbase-solving-started": CAPTCHA detection began
    //   - "browserbase-solving-finished": CAPTCHA solving completed
    if (SOLVE_CAPTCHAS) {
      page.on("console", (msg) => {
        const text = msg.text();
        if (text === "browserbase-solving-started") {
          console.log("Captcha solving in progress...");
        } else if (text === "browserbase-solving-finished") {
          console.log("Captcha solving completed!");
          captchaSolved = true;
          captchaResolve();
        }
      });
    }

    // Navigate to Google reCAPTCHA demo page to test captcha solving.
    console.log("Navigating to reCAPTCHA demo page...");
    await page.goto(DEMO_URL, { waitUntil: "domcontentloaded" });

    // Wait for Browserbase to solve the captcha automatically.
    // CAPTCHA solving typically takes 5-30 seconds depending on type and complexity.
    // We use a 60-second timeout to prevent hanging indefinitely on failures.
    if (SOLVE_CAPTCHAS && !captchaSolved) {
      console.log("Waiting for captcha to be solved...");
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          if (!captchaSolved) {
            reject(new Error("Captcha solving timed out after 60 seconds"));
          }
        }, 60000);
      });

      await Promise.race([captchaPromise, timeoutPromise]);
    } else if (!SOLVE_CAPTCHAS) {
      console.log("Captcha solving is disabled. Skipping wait...");
    }

    // Submit the form after captcha is solved.
    console.log("Clicking submit button...");
    await page.click('input[type="submit"]');

    await page.waitForLoadState("domcontentloaded");

    // Display the resulting page content.
    const pageContent = await page.textContent("body");
    console.log("Page content:", pageContent?.substring(0, 500));
  } catch (error) {
    console.error("Error during reCAPTCHA solving:", error);
    throw error;
  } finally {
    // Always close the browser to release resources and end the Browserbase session.
    await browser.close();
    console.log("\nSession closed successfully");
    console.log(`View replay at: https://browserbase.com/sessions/${session.id}`);
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY");
  console.error("  - Verify solveCaptchas is enabled (true by default)");
  console.error("  - Allow up to 60 seconds for CAPTCHA solving to complete");
  console.error("  - Enable proxies for higher success rates");
  console.error("\nDocs: https://docs.browserbase.com/features/stealth-mode#captcha-solving");
  process.exit(1);
});
