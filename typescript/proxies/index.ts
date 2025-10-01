// Browserbase Proxy Testing Script - See README.md for full documentation

import { chromium } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";
import dotenv from "dotenv";

dotenv.config();

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

async function createSessionWithBuiltInProxies() {
  // Use Browserbase's default proxy rotation for enhanced privacy and IP diversity.
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    proxies: true, // Enables automatic proxy rotation across different IP addresses.
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
  });
  return session;
}

async function createSessionWithGeoLocation() {
  // Route traffic through specific geographic location to test location-based restrictions.
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
    proxies: [
      {
        "type": "browserbase", // Use Browserbase's managed proxy infrastructure.
        "geolocation": {
          "city": "NEW_YORK", // Simulate traffic from New York for testing geo-specific content.
          "state": "NY", // See https://docs.browserbase.com/features/proxies for more geolocation options.
          "country": "US"
        }
      }
    ],
  });
  return session;
}

async function createSessionWithCustomProxies() {
  // Use external proxy servers for custom routing or specific proxy requirements.
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
    proxies: [
      {
        "type": "external", // Connect to your own proxy server infrastructure.
        "server": "http://...", // Your proxy server endpoint.
        "username": "user", // Authentication credentials for proxy access.
        "password": "pass",
      }
    ]
  });
  return session;
}


async function testSession(sessionFunction: () => Promise<any>, sessionName: string) {
  console.log(`\n=== Testing ${sessionName} ===`);
  
  // Create session with specific proxy configuration to test different routing scenarios.
  const session = await sessionFunction();
  console.log("Session URL: https://browserbase.com/sessions/" + session.id);

  // Connect to browser via CDP to control the session programmatically.
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const defaultContext = browser.contexts()[0];
  if (!defaultContext) {
    throw new Error("No default context found");
  }
  const page = defaultContext.pages()[0];
  if (!page) {
    throw new Error("No page found in default context");
  }

  // Navigate to IP info service to verify proxy location and IP address.
  await page.goto("https://ipinfo.io/json", { waitUntil: "domcontentloaded" });
  const geoInfo = await page.textContent('pre'); // Extract JSON response containing IP and location data.
  console.log("Geo Info:", geoInfo);

  // Close browser to release resources and end the test session.
  await browser.close();
  console.log(`${sessionName} test completed`);
}

async function main() {
  // Test 1: Built-in proxies - Verify default proxy rotation works and shows different IPs.
  await testSession(createSessionWithBuiltInProxies, "Built-in Proxies");
  
  // Test 2: Geolocation proxies - Confirm traffic routes through specified location (New York).
  await testSession(createSessionWithGeoLocation, "Geolocation Proxies (New York)");
  
  // Test 3: Custom external proxies - Enable if you have a custom proxy server set up.
  // await testSession(createSessionWithCustomProxies, "Custom External Proxies");
  console.log("\n=== All tests completed ===");
}

main();

