// Browserbase Functions: Screenshot Capture - See README.md for full documentation

import "dotenv/config";
import { defineFn } from "@browserbasehq/sdk-functions";
import { chromium } from "playwright-core";

// Define input parameters interface for type safety
interface ScreenshotParams {
  url: string; // Target URL to capture (required)
  fullPage?: boolean; // Capture full scrollable page (default: false)
  waitTime?: number; // Milliseconds to wait before screenshot (default: 1000)
}


/**
 * Screenshot Function - Captures a screenshot of any web page
 *
 * This Browserbase Function takes a URL and returns a base64-encoded screenshot
 * with customization options for full-page capture and wait time .
 *
 * Features:
 * - Full-page screenshot support
 * - Configurable wait time for dynamic content
 * - Returns base64-encoded PNG for easy integration
 * - Includes metadata about capture settings
 *
 * Docs: https://docs.browserbase.com/functions/quickstart
 */

defineFn("screenshot", async (ctx, params) => {
  const startTime = Date.now();

  // Extract parameters with defaults
  const {
    url,
    fullPage = false,
    waitTime = 1000,
  } = params as ScreenshotParams;

  // Validate required URL parameter
  if (!url) {
    throw new Error("URL parameter is required");
  }

  console.log(`Starting screenshot capture for: ${url}`);
  console.log(`Full page: ${fullPage}`);
  console.log(`Wait time: ${waitTime}ms`);

  try {
    // Connect to Browserbase-managed browser session
    // The session is automatically created and configured by Browserbase Functions
    console.log("Connecting to browser session...");
    const browser = await chromium.connectOverCDP(ctx.session.connectUrl);
    const context = browser.contexts()[0];
    const page = context?.pages()[0];

    // Navigate to target URL
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "networkidle", // Wait for network activity to settle
    });

    // Wait for specified time to allow dynamic content to render
    console.log(`Waiting ${waitTime}ms for content to render...`);
    await page.waitForTimeout(waitTime);

    // Capture screenshot
    console.log("Capturing screenshot...");
    const screenshotBuffer = await page.screenshot({
      fullPage: fullPage,
      type: "png",
    });

    // Convert buffer to base64 string
    const screenshotBase64 = screenshotBuffer.toString("base64");

    const captureTime = Date.now() - startTime;
    console.log(`Screenshot captured successfully in ${captureTime}ms`);

    // Close browser connection
    await browser.close();

    // Return structured result with screenshot and metadata
    return {
      screenshot: screenshotBase64,
      url: url,
      metadata: {
        fullPage: fullPage,
        timestamp: new Date().toISOString(),
        captureTime: captureTime,
      },
    };
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    throw new Error(
      `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

