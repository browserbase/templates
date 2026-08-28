// Playwright + Browserbase: Download Apple's Quarterly Financial Statements - See README.md for full documentation

import { chromium, Page, BrowserContext } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";
import fs from "fs";
import "dotenv/config";

/**
 * Polls Browserbase API for downloads with timeout handling.
 * Retries every 2 seconds until downloads are ready or timeout is reached.
 */
async function saveDownloadsWithRetry(
  bb: Browserbase,
  sessionId: string,
  retryForSeconds: number = 30,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    console.log(`Waiting up to ${retryForSeconds} seconds for downloads to complete...`);

    const intervals = {
      poller: undefined as NodeJS.Timeout | undefined,
      timeout: undefined as NodeJS.Timeout | undefined,
    };

    async function fetchDownloads(): Promise<void> {
      try {
        console.log("Checking for downloads...");
        const response = await bb.sessions.downloads.list(sessionId);
        const downloadBuffer: ArrayBuffer = await response.arrayBuffer();

        if (downloadBuffer.byteLength > 0) {
          console.log(`Downloads ready! File size: ${downloadBuffer.byteLength} bytes`);
          fs.writeFileSync("downloaded_files.zip", Buffer.from(downloadBuffer));
          console.log("Files saved as: downloaded_files.zip");

          if (intervals.poller) clearInterval(intervals.poller);
          if (intervals.timeout) clearTimeout(intervals.timeout);
          resolve(downloadBuffer.byteLength);
        } else {
          console.log("Downloads not ready yet, retrying...");
        }
      } catch (e: unknown) {
        console.error("Error fetching downloads:", e);
        if (intervals.poller) clearInterval(intervals.poller);
        if (intervals.timeout) clearTimeout(intervals.timeout);
        reject(e);
      }
    }

    // Set timeout to prevent infinite polling if downloads never complete
    intervals.timeout = setTimeout(() => {
      if (intervals.poller) {
        clearInterval(intervals.poller);
      }
      reject(new Error("Download timeout exceeded"));
    }, retryForSeconds * 1000);

    // Poll every 2 seconds to check if downloads are ready
    intervals.poller = setInterval(fetchDownloads, 2000);
  });
}

/**
 * Scrolls to an element on the page by text content.
 * Uses evaluate to find and scroll to matching elements.
 */
async function scrollToText(page: Page, text: string): Promise<void> {
  await page.evaluate((searchText) => {
    const elements = document.querySelectorAll("*");
    for (const el of elements) {
      if (el.textContent?.includes(searchText)) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
  }, text);
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Clicks a Financial Statements link for a specific quarter.
 * Uses context-aware selection to find the right link in the quarterly table.
 */
async function clickFinancialStatementsLink(page: Page, quarter: string): Promise<void> {
  console.log(`Clicking Financial Statements link for ${quarter}...`);

  // Try to find the link by traversing from the quarter label to sibling links
  const link = page
    .locator(`text=${quarter}`)
    .locator("..")
    .locator("..")
    .getByRole("link", { name: /Financial Statements/i })
    .first();

  const linkExists = (await link.count()) > 0;

  if (linkExists) {
    await link.click();
  } else {
    // Fallback: find all Financial Statements links and click by position
    // Q4 is first (index 0), Q3 is second (index 1), etc.
    const allLinks = page.getByRole("link", { name: /Financial Statements/i });
    const count = await allLinks.count();

    const quarterPositions: { [key: string]: number } = {
      Q4: 0,
      Q3: 1,
      Q2: 2,
      Q1: 3,
    };

    const position = quarterPositions[quarter];
    if (position !== undefined && position < count) {
      await allLinks.nth(position).click();
    } else {
      throw new Error(`Could not find Financial Statements link for ${quarter}`);
    }
  }

  // Wait for download to initiate before clicking next link
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function main(): Promise<void> {
  console.log("Starting Apple Financial Statements Download Automation (Playwright)...");

  // Initialize Browserbase SDK client for cloud browser management
  console.log("Initializing Browserbase client...");
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  // Create a new browser session in Browserbase cloud
  console.log("Creating Browserbase session...");
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });
  console.log(`Session created: https://browserbase.com/sessions/${session.id}`);

  // Display live view URL for debugging and monitoring
  const liveViewLinks = await bb.sessions.debug(session.id);
  console.log(`Live View: ${liveViewLinks.debuggerFullscreenUrl}`);

  // Connect Playwright to Browserbase via Chrome DevTools Protocol (CDP)
  // This gives direct control over the cloud-hosted browser
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const context: BrowserContext = browser.contexts()[0];
  if (!context) {
    throw new Error("No browser context found");
  }
  const page: Page = context.pages()[0];
  if (!page) {
    throw new Error("No page found in browser context");
  }

  // Configure CDP to allow file downloads during the session
  // eventsEnabled: true allows tracking download progress
  const client = await context.newCDPSession(page);
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "downloads",
    eventsEnabled: true,
  });
  console.log("Download behavior configured");

  try {
    // Navigate to Apple homepage with extended timeout for slow-loading sites
    console.log("Navigating to Apple.com...");
    await page.goto("https://www.apple.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Scroll to footer where investor links are located
    console.log("Scrolling to footer...");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to investor relations section
    console.log("Clicking Investors link...");
    await page.getByRole("link", { name: "Investors" }).click();
    await page.waitForLoadState("domcontentloaded");
    console.log(`Navigated to: ${page.url()}`);

    // Scroll to the Financial Data section of the investor relations page
    console.log("Scrolling to Financial Data section...");
    await scrollToText(page, "Financial Data");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Locate the Quarterly Earnings Reports table
    console.log("Locating Quarterly Earnings Reports...");
    await scrollToText(page, "Quarterly Earnings Reports");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Click on the 2025 year tab to show current year's reports
    const yearTab = page.locator("text=2025").first();
    if (await yearTab.isVisible()) {
      console.log("Clicking 2025 year tab...");
      await yearTab.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Download all quarterly financial statements
    // When a PDF link is clicked, Browserbase automatically captures and stores the file
    // See https://docs.browserbase.com/features/screenshots#pdfs for more info
    console.log("\nDownloading quarterly financial statements...");

    await clickFinancialStatementsLink(page, "Q4");
    await clickFinancialStatementsLink(page, "Q3");
    await clickFinancialStatementsLink(page, "Q2");
    await clickFinancialStatementsLink(page, "Q1");

    console.log("\nAll PDF links clicked. Waiting for downloads to sync...");

    // Retrieve all downloads triggered during this session from Browserbase API
    console.log("Retrieving downloads from Browserbase...");
    await saveDownloadsWithRetry(bb, session.id, 45);
    console.log("\nAll downloads completed successfully!");
  } catch (error) {
    console.error("Error during automation:", error);
    throw error;
  } finally {
    // Always close browser to release resources and end session
    await browser.close();
    console.log("Browser closed, session ended");
    console.log(`\nView session replay: https://browserbase.com/sessions/${session.id}`);
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify internet connection and Apple website accessibility");
  console.error("  - Ensure sufficient timeout for slow-loading pages");
  console.error("Docs: https://docs.browserbase.com/introduction/playwright");
  process.exit(1);
});
