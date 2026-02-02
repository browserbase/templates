// Amazon Global Price Comparison - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Schema for a single product with structured extraction fields
const ProductSchema = z.object({
  name: z.string().describe("The full product title/name"),
  price: z
    .string()
    .describe(
      "The product price including currency symbol (e.g., '$29.99', '29,99 EUR', '29.99 GBP'). If no price is visible, return 'N/A'",
    ),
  rating: z.string().describe("The star rating (e.g., '4.5 out of 5 stars')"),
  reviews_count: z.string().describe("The number of customer reviews (e.g., '1,234')"),
  product_url: z
    .string()
    .describe("The full href URL link to the product detail page (starting with https:// or /dp/)"),
});

// Schema for extracting multiple products from search results
const ProductsSchema = z.object({
  products: z.array(ProductSchema).describe("Array of products from search results"),
});

type Product = z.infer<typeof ProductSchema>;

// Country configuration with geolocation proxy settings
// Each country routes traffic through its geographic location to see local pricing
interface CountryConfig {
  name: string;
  code: string;
  city?: string;
  currency: string;
}

// Supported countries for price comparison
// Add or remove countries as needed - see https://docs.browserbase.com/features/proxies for available geolocations
const COUNTRIES: CountryConfig[] = [
  { name: "United States", code: "US", city: undefined, currency: "USD" },
  { name: "United Kingdom", code: "GB", city: "LONDON", currency: "GBP" },
  { name: "Germany", code: "DE", city: "BERLIN", currency: "EUR" },
  { name: "France", code: "FR", city: "PARIS", currency: "EUR" },
  { name: "Italy", code: "IT", city: "ROME", currency: "EUR" },
  { name: "Spain", code: "ES", city: "MADRID", currency: "EUR" },
];

// Results structure for each country
interface CountryResult {
  country: string;
  countryCode: string;
  currency: string;
  products: Product[];
  error?: string;
}

/**
 * Fetches products from Amazon for a specific country using geolocation proxy
 * Uses Browserbase's managed proxy infrastructure to route traffic through the target country
 * This ensures Amazon shows location-specific pricing and availability
 */
async function getProductsForCountry(
  searchQuery: string,
  country: CountryConfig,
  resultsCount: number = 3,
): Promise<CountryResult> {
  console.log(`\n=== Searching Amazon for "${searchQuery}" in ${country.name} ===`);

  // Build geolocation config for proxy routing
  const geolocation: { country: string; city?: string } = {
    country: country.code,
  };
  if (country.city) {
    geolocation.city = country.city;
  }

  // Initialize Stagehand with geolocation proxy configuration
  // This ensures all browser traffic routes through the specified geographic location
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: [
        {
          type: "browserbase", // Use Browserbase's managed proxy infrastructure for reliable geolocation routing
          geolocation,
        },
      ],
    },
  });

  try {
    console.log(`Initializing browser session with ${country.name} proxy...`);
    await stagehand.init();

    const page = stagehand.context.pages()[0];

    // Alternative: Skip the search bar and go straight to results by building the search URL.
    // Uncomment below to use direct navigation instead of stagehand.act() typing + clicking.
    // const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`;
    // console.log(`Navigating to: ${searchUrl}`);
    // await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Navigate to Amazon homepage to begin search
    console.log(`[${country.name}] Navigating to Amazon...`);
    await page.goto("https://www.amazon.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Perform search using natural language actions
    console.log(`[${country.name}] Searching for: ${searchQuery}`);
    await stagehand.act(`Type "${searchQuery}" into the search bar`);
    await stagehand.act("Click the search button");

    // Extract products from search results using Stagehand's structured extraction
    console.log(`[${country.name}] Extracting top ${resultsCount} products...`);

    const extractionResult = await stagehand.extract(
      `Extract the first ${resultsCount} product search results from this Amazon page. For each product, extract:
      1. name: the full product title
      2. price: the displayed price WITH currency symbol (like $599.99 or 599,99 EUR). If no price shown, use "N/A"
      3. rating: the star rating text (like "4.5 out of 5 stars")
      4. reviews_count: the number of reviews (like "2,508")
      5. product_url: the href link to the product page (starts with /dp/ or https://)
      
      Only extract actual product listings, skip sponsored ads or recommendations.`,
      ProductsSchema,
    );

    // Clean up products - ensure price is never null and URLs are absolute
    const cleanedProducts = extractionResult.products.map((p) => ({
      ...p,
      price: p.price || "N/A",
      product_url: p.product_url?.startsWith("http")
        ? p.product_url
        : p.product_url?.startsWith("/")
          ? `https://www.amazon.com${p.product_url}`
          : p.product_url || "N/A",
    }));

    console.log(`Found ${cleanedProducts.length} products in ${country.name}`);

    await stagehand.close();

    return {
      country: country.name,
      countryCode: country.code,
      currency: country.currency,
      products: cleanedProducts.slice(0, resultsCount),
    };
  } catch (error) {
    console.error(`Error fetching products from ${country.name}:`, error);
    await stagehand.close();

    return {
      country: country.name,
      countryCode: country.code,
      currency: country.currency,
      products: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Displays results in a formatted comparison table
 * Shows product name, price, rating, and review count for each country
 */
function displayComparisonTable(results: CountryResult[]) {
  console.log("\n" + "=".repeat(100));
  console.log("PRICE COMPARISON ACROSS COUNTRIES");
  console.log("=".repeat(100));

  // Find the first successful result to get product count
  const successfulResult = results.find((r) => r.products.length > 0);
  if (!successfulResult) {
    console.log("No products found in any country.");
    return;
  }

  // Display results for each product position
  const maxProducts = Math.max(...results.map((r) => r.products.length));

  for (let i = 0; i < maxProducts; i++) {
    console.log(`\n--- Product ${i + 1} ---`);

    // Find the first available product name for this position
    const productName = results.find((r) => r.products[i])?.products[i]?.name;
    if (productName) {
      const truncatedName =
        productName.length > 80 ? productName.slice(0, 77) + "..." : productName;
      console.log(`Product: ${truncatedName}`);
    }

    console.log("\nPrices by Country:");
    console.log("-".repeat(70));

    for (const result of results) {
      const countryPad = result.country.padEnd(20);
      if (result.error) {
        console.log(`  ${countryPad} | Error: ${result.error}`);
      } else if (result.products[i]) {
        const product = result.products[i];
        const price = product.price || "N/A";
        const pricePad = price.padEnd(18);
        const ratingShort = product.rating?.split(" out")[0] || "N/A";
        const ratingPad = ratingShort.padEnd(6);
        const reviews = product.reviews_count || "N/A";
        console.log(`  ${countryPad} | ${pricePad} | ${ratingPad} stars | ${reviews} reviews`);
      } else {
        console.log(`  ${countryPad} | Not available in this country`);
      }
    }
  }

  console.log("\n" + "=".repeat(100));
}

async function main() {
  // Configure search parameters
  const searchQuery = "iPhone 15 Pro Max 256GB";
  const resultsCount = 3;

  console.log("=".repeat(60));
  console.log("AMAZON PRICE COMPARISON - GEOLOCATION PROXY DEMO");
  console.log("=".repeat(60));
  console.log(`Search Query: ${searchQuery}`);
  console.log(`Results per country: ${resultsCount}`);
  console.log(`Countries: ${COUNTRIES.map((c) => c.code).join(", ")}`);
  console.log("=".repeat(60));

  // Process all countries concurrently for faster execution
  // Each country uses its own browser session, so they can run in parallel
  console.log(`\nFetching prices from ${COUNTRIES.length} countries concurrently...`);

  const results = await Promise.all(
    COUNTRIES.map((country) => getProductsForCountry(searchQuery, country, resultsCount)),
  );

  // Display formatted comparison table
  displayComparisonTable(results);

  // Output JSON results for programmatic use
  console.log("\n--- JSON OUTPUT ---");
  console.log(JSON.stringify(results, null, 2));

  console.log("\n=== Price comparison completed ===");
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error(
    "  - Verify geolocation proxy locations are valid (see https://docs.browserbase.com/features/proxies)",
  );
  console.error("  - Ensure you have sufficient Browserbase credits");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
