// Selenium + Browserbase: Quickstart
// See README.md for full documentation

import http from "http";
import { Builder, By, until, type WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome.js";
import Browserbase from "@browserbasehq/sdk";
import dotenv from "dotenv";

dotenv.config();

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
  // Create a new Browserbase session and connect via Selenium
  const session = await bb.sessions.create();

  const customHttpAgent = new http.Agent({});
  const originalAddRequest = (http.Agent.prototype as unknown as Record<string, unknown>)
    .addRequest as (req: http.ClientRequest, options: http.RequestOptions) => void;

  (customHttpAgent as unknown as Record<string, unknown>).addRequest = (
    req: http.ClientRequest,
    options: http.RequestOptions,
  ): void => {
    req.setHeader("x-bb-signing-key", session.signingKey);
    originalAddRequest.call(customHttpAgent, req, options);
  };

  const driver: WebDriver = new Builder()
    .forBrowser("chrome")
    .setChromeOptions(new Options())
    .usingHttpAgent(customHttpAgent)
    .usingServer(session.seleniumRemoteUrl)
    .build();

  try {
    const caps = await driver.getCapabilities();
    console.log(
      `Connected to Browserbase ${caps.getBrowserName()} version ${caps.getBrowserVersion()}`,
    );
    console.log(`Live debug URL: https://browserbase.com/sessions/${session.id}`);
    // Navigate to the SFMOMA homepage
    await driver.get("https://www.sfmoma.org");
    const url: string = await driver.getCurrentUrl();
    const title: string = await driver.getTitle();
    console.log(`At URL: ${url} | Title: ${title}`);

    const WAIT_TIMEOUT = 10_000;

    // Click the search button to open the search overlay
    const searchButton = await driver.wait(
      until.elementLocated(By.css('button[aria-label="Open search"]')),
      WAIT_TIMEOUT,
    );
    await driver.wait(until.elementIsEnabled(searchButton), WAIT_TIMEOUT);
    await searchButton.click();
    console.log("Clicked search button — search overlay opened");

    // Close the search overlay
    const closeButton = await driver.wait(
      until.elementLocated(By.css('button[aria-label="Close search"]')),
      WAIT_TIMEOUT,
    );
    await driver.wait(until.elementIsEnabled(closeButton), WAIT_TIMEOUT);
    await closeButton.click();
    console.log("Closed search overlay");

    // Click the Membership link
    const membershipLink = await driver.wait(
      until.elementLocated(By.linkText("Membership")),
      WAIT_TIMEOUT,
    );
    await driver.wait(until.elementIsEnabled(membershipLink), WAIT_TIMEOUT);
    await membershipLink.click();
    await driver.wait(until.urlContains("/membership"), WAIT_TIMEOUT);
    const membershipUrl: string = await driver.getCurrentUrl();
    const membershipTitle: string = await driver.getTitle();
    console.log(`At URL: ${membershipUrl} | Title: ${membershipTitle}`);

    // Extract copy from the membership page
    const heading = await driver.wait(until.elementLocated(By.tagName("h1")), WAIT_TIMEOUT);
    console.log(`Heading: ${await heading.getText()}`);

    const intro = await driver.wait(until.elementLocated(By.css("main p")), WAIT_TIMEOUT);
    console.log(`Intro: ${await intro.getText()}`);
  } finally {
    // Make sure to quit the driver so your session is ended!
    await driver.quit();
  }
}

main().catch((err) => {
  console.error("Error in Selenium quickstart:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY set");
  console.error("  - Verify your API key is valid at https://browserbase.com");
  console.error("  - Ensure network connectivity to Browserbase servers");
  console.error("Docs: https://docs.browserbase.com/quickstart/selenium");
  process.exit(1);
});
