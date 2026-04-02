// Puppeteer + Browserbase: Quickstart
// See README.md for full documentation

import "dotenv/config";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
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

async function main(): Promise<void> {
  // Create a new Browserbase session and connect via Puppeteer
  const session = await bb.sessions.create({});

  const browser: Browser = await puppeteer.connect({
    browserWSEndpoint: session.connectUrl,
  });

  const pages: Page[] = await browser.pages();
  const page: Page = pages[0] || (await browser.newPage());

  console.log(`Connected to Browserbase`);
  console.log(`Live debug URL: https://browserbase.com/sessions/${session.id}`);

  try {
    // Navigate to the SFMOMA homepage

    await page.goto("https://www.sfmoma.org", {
      waitUntil: "domcontentloaded",
    });
    const url: string = page.url();
    const title: string = await page.title();
    console.log(`At URL: ${url} | Title: ${title}`);

    // Click the search button to open the search overlay
    await page.waitForSelector('button[aria-label="Open search"]');
    await page.click('button[aria-label="Open search"]');
    console.log("Clicked search button — search overlay opened");

    // Close the search overlay
    await page.waitForSelector('button[aria-label="Close search"]');
    await page.click('button[aria-label="Close search"]');
    console.log("Closed search overlay");

    // Navigate to the Membership page
    await page.goto("https://www.sfmoma.org/membership/", {
      waitUntil: "domcontentloaded",
    });
    const membershipUrl: string = page.url();
    const membershipTitle: string = await page.title();
    console.log(`At URL: ${membershipUrl} | Title: ${membershipTitle}`);

    // Extract copy from the membership page
    const heading: string = await page.$eval("h1", (el) => el.textContent ?? "");
    console.log(`Heading: ${heading}`);

    const intro: string = await page.$eval("main p", (el) => el.textContent ?? "");
    console.log(`Intro: ${intro}`);
  } finally {
    // Make sure to close the browser so your session is ended!
    await browser.close();
  }
}

main();
