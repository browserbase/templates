// Stagehand + Browserbase: Amazon Product Scraping - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// ============= CONFIGURATION =============
// Update this value to search for different products
const SEARCH_QUERY = "Seiko 5";
// =========================================

// Schema for a single product with structured extraction fields
const ProductSchema = z.object({
  name: z.string().describe("The full product title/name"),
  price: z.string().describe("The product price including currency symbol (e.g., '$29.99')"),
  rating: z.string().describe("The star rating (e.g., '4.5 out of 5 stars')"),
  reviews_count: z.string().describe("The number of customer reviews (e.g., '1,234')"),
  product_url: z.string().url().describe("The URL link to the product detail page on Amazon"),
});

// Schema for extracting multiple products from search results
const ProductsSchema = z.object({
  products: z.array(ProductSchema).describe("Array of the first 3 products from search results"),
});

async function main(): Promise<void> {
  console.log("Starting Amazon Product Scraping...");

  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    model: "google/gemini-2.5-flash",
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(
      `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
    );

    const page = stagehand.context.pages()[0];

    // Alternative: skip the search bar and go straight to results by building the search URL.
    // Uncomment below to use direct navigation instead of stagehand.act() typing + clicking.
    // // Build search URL
    // const encodedQuery = encodeURIComponent(query).replace(/%20/g, "+");
    // const searchUrl = `https://www.amazon.com/s?k=${encodedQuery}`;

    // console.log(`Navigating to: ${searchUrl}`);
    // await page.goto(searchUrl, {
    //   waitUntil: "domcontentloaded",
    // });

    // Navigate to Amazon homepage to begin search.
    console.log("Navigating to Amazon...");
    await page.goto("https://www.amazon.com");

    // Perform search using natural language actions.
    console.log(`Searching for: ${SEARCH_QUERY}`);
    await stagehand.act(`Type ${SEARCH_QUERY} into the search bar`);
    await stagehand.act("Click the search button");

    // Extract structured product data using Zod schema for type safety.
    console.log("Extracting product data...");
    const products = await stagehand.extract(
      "Extract the details of the FIRST 3 products in the search results. Get the product name, price, star rating, number of reviews, and the URL link to the product page.",
      ProductsSchema,
    );

    console.log("Products found:");
    console.log(JSON.stringify(products, null, 2));
  } catch (error) {
    console.error("Error during product scraping:", error);
  } finally {
    // Always close session to release resources and clean up.
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in Amazon product scraping:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_API_KEY is set for the model");
  console.error("  - Verify network connectivity");
  console.error("Docs: https://docs.stagehand.dev");
  process.exit(1);
});
