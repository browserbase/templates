// Fetch API Scraping - See README.md for full documentation
//
// Some websites block plain HTTP requests (curl, fetch with spoofed headers)
// but allow requests through Browserbase's Fetch API. No browser session
// needed — just a lightweight HTTP request through Browserbase's infrastructure.
//
// This template scrapes StockX sneaker listings, which block standard HTTP
// requests with a 403 but return full HTML through Browserbase's Fetch API.

import "dotenv/config";
import Browserbase from "@browserbasehq/sdk";

// ============= CONFIGURATION =============
const TARGET_URL = "https://stockx.com/sneakers";
const NUM_PRODUCTS = 10;
// =========================================

interface Sneaker {
  name: string;
  price: string;
  url: string;
}

// Parse sneaker listings from StockX's server-rendered HTML
function parseSneakers(html: string, limit: number): Sneaker[] {
  const sneakers: Sneaker[] = [];

  // StockX renders product links with slugs, followed by price in the card
  const pattern =
    /href="\/((?:air-|nike-|adidas-|jordan-|new-balance-|yeezy-|vans-|asics-|puma-|a-bathing-)[a-z0-9-]+)"[^>]*>[\s\S]*?(\$\d+)/g;

  let match;
  while ((match = pattern.exec(html)) !== null && sneakers.length < limit) {
    const slug = match[1];
    sneakers.push({
      name: slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      price: match[2],
      url: `https://stockx.com/${slug}`,
    });
  }

  return sneakers;
}

async function main(): Promise<void> {
  console.log("Fetch API Scraping — StockX Sneakers");
  console.log();

  // Step 1: Show that standard HTTP requests get blocked
  // StockX returns 403 even with full Chrome headers.
  // Try: curl -s -o /dev/null -w "%{http_code}" https://stockx.com/sneakers → 403
  console.log("--- Step 1: Standard HTTP request (with Chrome headers) ---");
  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
      },
      redirect: "follow",
    });
    console.log(`Status: ${response.status}`);
    console.log("→ Blocked — even with real Chrome headers.\n");
  } catch (err) {
    console.log(`Failed: ${err}\n`);
  }

  // Step 2: Browserbase Fetch API — bypasses bot detection, no session needed
  console.log("--- Step 2: Browserbase Fetch API ---");
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

  const result = await bb.fetchAPI.create({
    url: TARGET_URL,
    allowRedirects: true,
  });

  console.log(`Status: ${result.statusCode}`);
  console.log(`Content: ${result.content.length} chars`);

  const sneakers = parseSneakers(result.content, NUM_PRODUCTS);
  console.log(`\nTop ${sneakers.length} sneakers:\n`);

  for (const s of sneakers) {
    console.log(`  ${s.name}`);
    console.log(`  ${s.price} — ${s.url}\n`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY");
  console.error("  - Browserbase Fetch API has a 1MB response limit");
  console.error(
    "  - Fetch API does not execute JavaScript — for JS-rendered pages, use a browser session",
  );
  console.error("Docs: https://docs.browserbase.com");
  process.exit(1);
});
