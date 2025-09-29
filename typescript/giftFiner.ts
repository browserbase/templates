/**
 * Stagehand + Browserbase: AI-Powered Gift Finder
 *
 * AT A GLANCE
 * - Goal: find personalized gift recommendations using AI-generated search queries and intelligent product scoring.
 * - AI Integration: Stagehand for AI-generated search queries and score products based on recipient profile.
 * - Concurrent Sessions: runs multiple browser sessions simultaneously to search different queries in parallel.
 * - Proxies: uses Browserbase proxies with UK geolocation for European website access (Firebox.eu).
 *
 * GLOSSARY
 * - act: perform UI actions from a prompt (search, click, type)
 *   Docs → https://docs.stagehand.dev/basics/act
 * - extract: pull structured data from pages using schemas
 *   Docs → https://docs.stagehand.dev/basics/extract
 * - concurrent sessions: run multiple browser sessions simultaneously for faster searching
 *   Docs → https://docs.browserbase.com/guides/concurrency-rate-limits
 * - proxies: use geolocation-based routing for European website access (Firebox.eu)
 *   Docs → https://docs.browserbase.com/features/proxies
 * 
 * 
 * QUICKSTART
 *  1) pnpm init
 *  2) pnpm add @browserbasehq/stagehand dotenv @types/node inquirer openai zod
 *     pnpm add -D typescript && pnpm tsc --init
 *  3) Create .env with:
 *       BROWSERBASE_PROJECT_ID=...
 *       BROWSERBASE_API_KEY=...
 *       OPENAI_API_KEY=...
 *  4) Compile + run:
 *       pnpm tsc && node giftFinder.js
 *
 * EXPECTED OUTPUT
 * - Prompts user for recipient and description
 * - Generates 3 search queries using OpenAI
 * - Runs concurrent browser sessions to search Firebox.eu
 * - Extracts product data using structured schemas
 * - AI-scores products based on recipient profile
 * - Displays top 3 personalized gift recommendations
 *
 * COMMON PITFALLS
 * - Browserbase Developer plan or higher is required to use proxies (they have been commented out in the code)
 * - "Cannot find module": ensure all dependencies are installed
 * - Missing credentials: verify .env contains all required API keys
 * - Search failures: check internet connection and website accessibility
 */

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import inquirer from "inquirer";
import OpenAI from "openai";
import { z } from "zod";

interface GiftFinderAnswers {
  recipient: string;
  description: string;
}

interface Product {
  title: string;
  url: string;
  price: string;
  rating: string;
  aiScore?: number;
  aiReason?: string;
}

interface SearchResult {
  query: string;
  sessionIndex: number;
  products: Product[];
}

const client = new OpenAI();

async function generateSearchQueries(recipient: string, description: string): Promise<string[]> {
  console.log(`Generating search queries for ${recipient}...`);

  // Use AI to generate search terms based on recipient profile
  // This avoids generic searches and focuses on thoughtful, complementary gifts
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Generate exactly 3 short gift search queries (1-2 words each) for finding gifts for a ${recipient.toLowerCase()} who is described as: "${description}". 

IMPORTANT: Assume they already have the basic necessities related to their interests. Focus on:
- Complementary items that enhance their hobbies
- Thoughtful accessories or upgrades
- Related but unexpected items
- Premium or unique versions of things they might not buy themselves

AVOID obvious basics like "poker set" for poker players, "dumbbells" for fitness enthusiasts, etc.

Examples for "loves cooking":
spice rack
chef knife
herb garden

Return ONLY the search terms, one per line, no dashes, bullets, or numbers. Just the plain search terms:`,
      },
    ],
    max_completion_tokens: 1000,
  });

  // Parse AI response and clean up formatting
  const queries =
    response.choices[0]?.message?.content
      ?.trim()
      .split("\n")
      .filter((q) => q.trim()) || [];
  return queries.slice(0, 3);
}

async function scoreProducts(
  products: Product[],
  recipient: string,
  description: string,
): Promise<Product[]> {
  console.log("AI is analyzing gift options based on recipient profile...");

  // Flatten all products from multiple search sessions into single array
  const allProducts = products.flat();

  if (allProducts.length === 0) {
    console.log("No products to score");
    return [];
  }

  // Format products for AI analysis with index numbers for reference
  const productList = allProducts
    .map(
      (product, index) => `${index + 1}. ${product.title} - ${product.price} - ${product.rating}`,
    )
    .join("\n");

  console.log(`Scoring ${allProducts.length} products...`);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are a gift recommendation expert. Score each product based on how well it matches the recipient profile.

RECIPIENT: ${recipient}
DESCRIPTION: ${description}

PRODUCTS TO SCORE:
${productList}

For each product, provide a score from 1-10 (10 being perfect match) and a brief reason. Consider:
- How well it matches their interests/hobbies
- Appropriateness for the relationship (${recipient.toLowerCase()})
- Value for money
- Uniqueness/thoughtfulness
- Practical usefulness

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact format:
[
  {
    "productIndex": 1,
    "score": 8,
    "reason": "Perfect for poker enthusiasts, high quality chips enhance the gaming experience"
  },
  {
    "productIndex": 2,
    "score": 6,
    "reason": "Useful but basic, might already own similar item"
  }
]

IMPORTANT: 
- Return raw JSON only, no code blocks
- Include all ${allProducts.length} products
- Keep reasons under 100 characters
- Use productIndex 1-${allProducts.length}`,
      },
    ],
    max_completion_tokens: 1000,
  });

  try {
    // Clean up AI response by removing markdown code blocks
    let responseContent = response.choices[0]?.message?.content?.trim() || "[]";

    responseContent = responseContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Parse JSON response from AI scoring
    const scoresData = JSON.parse(responseContent);

    // Map AI scores back to products using index matching
    const scoredProducts = allProducts.map((product, index) => {
      const scoreInfo = scoresData.find((s: any) => s.productIndex === index + 1);
      return {
        ...product,
        aiScore: scoreInfo?.score || 0,
        aiReason: scoreInfo?.reason || "No scoring available",
      };
    });

    // Sort by AI score descending to show best matches first
    return scoredProducts.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  } catch (error) {
    console.error("Error parsing AI scores:", error);
    console.log("Using fallback scoring (all products scored as 5)");

    // Fallback scoring ensures app continues working even if AI fails
    // Neutral score of 5 allows products to still be ranked and displayed
    return allProducts.map((product) => ({
      ...product,
      aiScore: 5,
      aiReason: "Scoring failed - using neutral score",
    }));
  }
}

async function getUserInput(): Promise<GiftFinderAnswers> {
  console.log("Welcome to the Gift Finder App!");
  console.log("Find the perfect gift with intelligent web browsing");

  // Use inquirer for interactive CLI prompts with validation
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "recipient",
      message: "Who are you buying a gift for?",
      choices: ["Mum", "Dad", "Sister", "Brother", "Friend", "Boss"],
    },
    {
      type: "input",
      name: "description",
      message: "Please provide a short description about them (interests, hobbies, age, etc.):",
      validate: (input: string) => {
        if (input.trim().length < 5) {
          return "Please provide at least 5 characters for a better gift recommendation.";
        }
        return true;
      },
    },
  ]);

  return answers as GiftFinderAnswers;
}

async function main(): Promise<void> {
  console.log("Starting Gift Finder Application...");

  const { recipient, description } = await getUserInput();
  console.log(`User input received: ${recipient} - ${description}`);

  console.log("\nGenerating intelligent search queries...");

  // Generate search queries with fallback for reliability
  let searchQueries: string[];
  try {
    searchQueries = await generateSearchQueries(recipient, description);

    console.log("\nGenerated Search Queries:");
    searchQueries.forEach((query, index) => {
      console.log(`   ${index + 1}. ${query.replace(/['"]/g, "")}`);
    });
  } catch (error) {
    console.error("Error generating search queries:", error);
    // Fallback queries
    searchQueries = ["gifts", "accessories", "items"];
    console.log("Using fallback search queries");
  }

  console.log("\nStarting concurrent browser searches...");

  async function runSingleSearch(query: string, sessionIndex: number): Promise<SearchResult> {
    console.log(`Starting search session ${sessionIndex + 1} for: "${query}"`);

    // Create separate Stagehand instance for each search to run concurrently
    // Each session searches independently to maximize speed
    const sessionStagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 0,
      // 0 = errors only, 1 = info, 2 = debug 
      // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
      // https://docs.stagehand.dev/configuration/logging
      modelName: "gpt-4o",
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        // Proxies require Developer Plan or higher - comment in if you have a Developer Plan or higher
        //   proxies: [
        //     {
        //       "type": "browserbase",
        //       "geolocation": {
        //         "city": "LONDON",
        //         "country": "GB"
        //       }
        //     }
        //   ],
        region: "us-east-1",
        timeout: 900,
        browserSettings: {
          viewport: {
            width: 1920,
            height: 1080,
          },
        },
      },
    });

    try {
      await sessionStagehand.init();
      const sessionPage = sessionStagehand.page;

      // Display live view URL for debugging and monitoring
      const sessionId = sessionStagehand.browserbaseSessionID;
      if (sessionId) {
        const liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
        console.log(`Session ${sessionIndex + 1} Live View: ${liveViewUrl}`);
      }

      // Navigate to European gift site - proxies help with regional access
      console.log(`Session ${sessionIndex + 1}: Navigating to Firebox.eu...`);
      await sessionPage.goto("https://firebox.eu/");

      // Perform search using natural language actions
      console.log(`Session ${sessionIndex + 1}: Searching for "${query}"...`);
      await sessionPage.act(`Type ${query} into the search bar`);
      await sessionPage.act("Click the search button");
      await sessionPage.waitForTimeout(1000);

      // Extract structured product data using Zod schema for type safety
      console.log(`Session ${sessionIndex + 1}: Extracting product data...`);
      const productsData = await sessionPage.extract({
        instruction: "Extract the first 3 products from the search results",
        schema: z.object({
          products: z
            .array(
              z.object({
                title: z.string().describe("the title/name of the product"),
                url: z.string().url("the full URL link to the product page"),
                price: z.string().describe("the price of the product (include currency symbol)"),
                rating: z
                  .string()
                  .describe(
                    "the star rating or number of reviews (e.g., '4.5 stars' or '123 reviews')",
                  ),
              }),
            )
            .max(3)
            .describe("array of the first 3 products from search results"),
        }),
      });

      console.log(
        `Session ${sessionIndex + 1}: Found ${productsData.products.length} products for "${query}"`,
      );

      await sessionStagehand.close();

      return {
        query,
        sessionIndex: sessionIndex + 1,
        products: productsData.products,
      };
    } catch (error) {
      console.error(`Session ${sessionIndex + 1} failed:`, error);

      try {
        await sessionStagehand.close();
      } catch (closeError) {
        console.error(`Error closing session ${sessionIndex + 1}:`, closeError);
      }

      return {
        query,
        sessionIndex: sessionIndex + 1,
        products: [],
      };
    }
  }

  const searchPromises = searchQueries.map((query, index) => runSingleSearch(query, index));

  console.log("\nBrowser Sessions Starting...");
  console.log("Live view links will appear as each session initializes");

  // Wait for all concurrent searches to complete
  const allResults = await Promise.all(searchPromises);

  // Calculate total products found across all search sessions
  const totalProducts = allResults.reduce((sum, result) => sum + result.products.length, 0);
  console.log(`\nTotal products found: ${totalProducts} across ${searchQueries.length} searches`);

  // Flatten all products into single array for AI scoring
  const allProductsFlat = allResults.flatMap((result) => result.products);

  if (allProductsFlat.length > 0) {
    try {
      // AI scores all products and ranks them by relevance to recipient
      const scoredProducts = await scoreProducts(allProductsFlat, recipient, description);
      const top3Products = scoredProducts.slice(0, 3);

      console.log("\nTOP 3 RECOMMENDED GIFTS:");

      // Display top 3 products with AI reasoning for transparency
      top3Products.forEach((product, index) => {
        const rank = `#${index + 1}`;
        console.log(`\n${rank} - ${product.title}`);
        console.log(`Price: ${product.price}`);
        console.log(`Rating: ${product.rating}`);
        console.log(`Score: ${product.aiScore}/10`);
        console.log(`Why: ${product.aiReason}`);
        console.log(`Link: ${product.url}`);
      });

      console.log(
        `\nGift finding complete! Found ${totalProducts} products, analyzed ${scoredProducts.length} with AI.`,
      );
    } catch (error) {
      console.error("Error scoring products:", error);
      console.log(`Target: ${recipient}`);
      console.log(`Profile: ${description}`);
    }
  } else {
    // Handle case where no products were found across all searches
    console.log("No products found to score");
    console.log("Try adjusting your recipient description or check if the website is accessible");
  }

  console.log("\nThank you for using Gift Finder!");
}

main().catch((err) => {
  console.error("Application error:", err);
  console.log("Check your environment variables and internet connection");
  process.exit(1);
});

/**
 * USE CASES
 * • Multi-retailer product discovery: Generate smart queries, browse in parallel, and extract structured results across sites (with geo-specific proxies when needed).
 * • Personalized gifting/recommendations: Score items against a recipient profile for gift lists, concierge shopping, or corporate gifting portals.
 * • Assortment & market checks: Rapidly sample categories to compare price/availability/ratings across regions or competitors.
 * 
 * NEXT STEPS
 * • Add site adapters: Plug in more retailers with per-site extract schemas, result normalization, and de-duplication (canonical URL matching).
 * • Upgrade ranking: Blend AI scores with signals (price, reviews, shipping, stock), and persist results to JSON/CSV/DB for re-scoring and audits.
 * • Scale & geo-test: Fan out more concurrent sessions and run a geo matrix via proxies (e.g., UK/EU/US) to compare localized inventory and pricing.
 * 
 * HELPFUL RESOURCES
 * 📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
 * 🎮 Browserbase:        https://www.browserbase.com
 * 🛍️ Gift Ideas:         https://firebox.eu/
 * 📧 Need help?          support@browserbase.com
 */
