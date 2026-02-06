// Browserbase Proxy Testing with Playwright - See README.md for full documentation

import { chromium } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";
import dotenv from "dotenv";

dotenv.config();

/** IP and geolocation data from ipinfo.io */
interface GeoInfo {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  timezone?: string;
  org?: string;
  postal?: string;
  hostname?: string;
}

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

if (!BROWSERBASE_API_KEY) {
  throw new Error("BROWSERBASE_API_KEY environment variable is required");
}
if (!BROWSERBASE_PROJECT_ID) {
  throw new Error("BROWSERBASE_PROJECT_ID environment variable is required");
}

const bb = new Browserbase({ apiKey: BROWSERBASE_API_KEY });

async function createSessionWithBuiltInProxies() {
  // Use Browserbase's default proxy rotation for enhanced privacy and IP diversity.
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID!,
    proxies: true, // Enables automatic proxy rotation across different IP addresses.
  });
  return session;
}

async function createSessionWithGeoLocation() {
  // Route traffic through specific geographic location to test location-based restrictions.
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID!,
    proxies: [
      {
        type: "browserbase", // Use Browserbase's managed proxy infrastructure.
        geolocation: {
          city: "NEW_YORK", // Simulate traffic from New York for testing geo-specific content.
          state: "NY", // See https://docs.browserbase.com/features/proxies for more geolocation options.
          country: "US",
        },
      },
    ],
  });
  return session;
}

async function createSessionWithCustomProxies() {
  // Use external proxy servers for custom routing or specific proxy requirements.
  // Credentials from CUSTOM_PROXY_SERVER, CUSTOM_PROXY_USERNAME, CUSTOM_PROXY_PASSWORD.
  const proxyServer = process.env.CUSTOM_PROXY_SERVER;
  const proxyUsername = process.env.CUSTOM_PROXY_USERNAME;
  const proxyPassword = process.env.CUSTOM_PROXY_PASSWORD;

  if (!proxyServer || !proxyUsername || !proxyPassword) {
    throw new Error(
      "Custom proxy requires CUSTOM_PROXY_SERVER, CUSTOM_PROXY_USERNAME, and CUSTOM_PROXY_PASSWORD environment variables"
    );
  }

  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID!,
    proxies: [
      {
        type: "external", // Connect to your own proxy server infrastructure.
        server: proxyServer!,
        username: proxyUsername!,
        password: proxyPassword!,
      },
    ],
  });
  return session;
}

async function testSessionBrowserbase(
  sessionFunction: () => Promise<{ id: string; connectUrl: string }>,
  sessionName: string
) {
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

  try {
    // Navigate to IP info service to verify proxy location and IP address.
    await page.goto("https://ipinfo.io/json", {
      waitUntil: "domcontentloaded",
    });

    // Parse JSON from page body.
    const bodyText = await page.textContent("body");
    if (!bodyText) {
      throw new Error("Failed to get page content");
    }

    let geoInfo: GeoInfo;
    try {
      geoInfo = JSON.parse(bodyText);
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : parseError}`
      );
    }

    console.log("Geo Info:", JSON.stringify(geoInfo, null, 2));
  } catch (error) {
    console.error(
      "Error during extraction:",
      error instanceof Error ? error.message : error
    );
  }

  // Close browser to release resources and end the test session.
  await browser.close();
  console.log(`${sessionName} test completed`);
}

async function main() {
  console.log("Browserbase Proxy Testing with Playwright");
  console.log("=========================================");
  console.log("This template demonstrates proxy features with Playwright and Browserbase SDK.");
  console.log("It uses pure Playwright + Browserbase SDK.\n");

  // Test 1: Built-in proxies - Verify default proxy rotation works and shows different IPs.
  await testSessionBrowserbase(createSessionWithBuiltInProxies, "Built-in Proxies");

  // Test 2: Geolocation proxies - Confirm traffic routes through specified location (New York).
  await testSessionBrowserbase(createSessionWithGeoLocation, "Geolocation Proxies (New York)");

  // Test 3: Custom external proxies - Enable if you have CUSTOM_PROXY_* env vars set.
  // await testSessionBrowserbase(createSessionWithCustomProxies, "Custom External Proxies");

  console.log("\n=== All tests completed ===");
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify your Browserbase plan supports proxies");
  console.error("Docs: https://docs.browserbase.com/features/proxies");
  process.exit(1);
});