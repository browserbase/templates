// Stagehand + Browserbase: AI-Powered Date Planner - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import inquirer from "inquirer";
import OpenAI from "openai";
import { z } from "zod";

interface DatePlannerAnswers {
  date_preference: string;
  cuisine_type: string;
  location: string;
  budget: string;
  special_requirements: string;
}

interface Restaurant {
  name: string;
  url: string;
  rating: string;
  price_range: string;
  cuisine: string;
  location: string;
  ai_score?: number;
  ai_reason?: string;
  verified?: boolean;
  verified_details?: {
    description?: string;
    hours?: string;
    phone?: string;
    address?: string;
    reservation_available?: boolean;
  };
}

interface SearchResult {
  query: string;
  session_index: number;
  restaurants: Restaurant[];
}

const client = new OpenAI();

/** Generate diverse search queries using AI for finding restaurants across different angles. */
async function generateSearchQueries(
  location: string,
  cuisine: string,
  budget: string,
  requirements: string
): Promise<string[]> {
  console.log(`Generating search queries for ${cuisine} restaurants in ${location}...`);

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "user",
        content: `Generate exactly 3 diverse search queries for finding ${cuisine} restaurants in ${location} with ${budget} budget.
Requirements: ${requirements}

Create queries that will find different types of restaurants:
1. One focused on the specific cuisine
2. One for romantic/date night spots  
3. One for highly-rated restaurants in the area

Return ONLY the search queries, one per line, no dashes, bullets, or numbers. Just the plain search terms:`,
      },
    ],
    max_completion_tokens: 150,
  });

  // Parse AI response and clean up formatting
  const content = response.choices[0]?.message?.content;
  const queries = content?.trim().split("\n") || [];
  const cleanedQueries = queries.map(q => q.trim()).filter(q => q);
  return cleanedQueries.slice(0, 3);
}

/** Score and rank restaurants against user preferences using AI, prioritizing cuisine match. */
async function scoreRestaurants(
  restaurants: Restaurant[],
  requirements: string,
  cuisine: string,
  budget: string
): Promise<Restaurant[]> {
  console.log("AI is analyzing restaurant options based on your preferences...");

  if (restaurants.length === 0) {
    console.log("No restaurants to score");
    return [];
  }

  // Format restaurants for AI analysis with index numbers for reference
  const restaurantList = restaurants
    .map(
      (restaurant, index) =>
        `${index + 1}. ${restaurant.name} - ${restaurant.rating} - ${restaurant.price_range} - ${restaurant.cuisine} - ${restaurant.location}`
    )
    .join("\n");

  console.log(`Scoring ${restaurants.length} restaurants...`);

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "user",
        content: `You are a date planning expert. Score each restaurant based on how well it matches the user's requirements.

CUISINE: ${cuisine}
BUDGET: ${budget}
REQUIREMENTS: ${requirements}

RESTAURANTS TO SCORE:
${restaurantList}

For each restaurant, provide a score from 1-10 (10 being perfect match) and a brief reason. Consider:
- How well it matches the cuisine preference (CRITICAL: Restaurants that don't match ${cuisine} cuisine should score 3 or below)
- Budget appropriateness
- Special requirements fit
- Rating and reviews
- Location convenience
- Date night atmosphere

IMPORTANT SCORING GUIDELINES:
- Restaurants that don't match the ${cuisine} cuisine preference should score 1-3 points maximum
- Restaurants that match cuisine but have other issues should score 4-6 points
- Good matches that meet most criteria should score 7-8 points
- Perfect matches should score 9-10 points

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact format:
[
  {
    "restaurantIndex": 1,
    "score": 8,
    "reason": "Perfect cuisine match, great rating, fits budget"
  },
  {
    "restaurantIndex": 2,
    "score": 6,
    "reason": "Good but pricey for budget"
  }
]

IMPORTANT: 
- Return raw JSON only, no code blocks
- Include all ${restaurants.length} restaurants
- Keep reasons under 100 characters
- Use restaurantIndex 1-${restaurants.length}`,
      },
    ],
    max_completion_tokens: 1000,
  });

  try {
    // Remove markdown code blocks that AI sometimes wraps JSON in
    let responseContent = response.choices[0]?.message?.content?.trim() || "[]";
    responseContent = responseContent
      .replace(/```json\n/g, "")
      .replace(/```json/g, "")
      .replace(/```\n/g, "")
      .replace(/```/g, "");

    const scoresData = JSON.parse(responseContent);

    // Map scores to restaurants by index (AI uses 1-based indexing)
    const scoredRestaurants: Restaurant[] = [];
    for (let index = 0; index < restaurants.length; index++) {
      const restaurant = restaurants[index];
      const scoreInfo = scoresData.find((s: any) => s.restaurantIndex === index + 1);
      restaurant.ai_score = scoreInfo?.score || 0;
      restaurant.ai_reason = scoreInfo?.reason || "No scoring available";
      scoredRestaurants.push(restaurant);
    }

    scoredRestaurants.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    return scoredRestaurants;
  } catch (error) {
    console.error("Error parsing AI scores:", error);
    console.log("Using fallback scoring (all restaurants scored as 5)");

    // Neutral fallback ensures app continues even if AI response is malformed
    restaurants.forEach(restaurant => {
      restaurant.ai_score = 5;
      restaurant.ai_reason = "Scoring failed - using neutral score";
    });
    return restaurants;
  }
}

/** Collect user preferences via interactive CLI prompts. */
async function getUserInput(): Promise<DatePlannerAnswers> {
  console.log("🍽️ Welcome to the AI-Powered Date Planner!");
  console.log("Let's find the perfect restaurant for your special date.\n");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "date_preference",
      message: "What date are you planning for? (e.g., 'this Friday evening', 'next Saturday at 7pm')",
      default: "this Friday evening",
    },
    {
      type: "list",
      name: "cuisine_type",
      message: "What type of cuisine are you in the mood for?",
      choices: [
        "Italian", "French", "Japanese", "Mexican", "Indian", 
        "Thai", "Chinese", "Mediterranean", "American", "Steakhouse",
        "Seafood", "Vegetarian", "Fine Dining", "Casual", "Other"
      ],
    },
    {
      type: "input",
      name: "location",
      message: "What city or area are you looking in?",
      default: "San Francisco",
    },
    {
      type: "list",
      name: "budget",
      message: "What's your budget range?",
      choices: ["$", "$$", "$$$", "$$$$", "No specific budget"],
    },
    {
      type: "input",
      name: "special_requirements",
      message: "Any special requirements? (dietary restrictions, ambiance, etc.)",
      default: "None",
    },
  ]);

  return answers as DatePlannerAnswers;
}

/** Suggest nearby date activities using AI, with fallback defaults if API fails. */
async function findNearbyActivities(restaurant: Restaurant): Promise<string[]> {
  try {
    const prompt = `
        Suggest 3-5 nearby activities for a date night near ${restaurant.name} in ${restaurant.location}.
        Include a mix of indoor and outdoor activities, and consider the restaurant's ambiance.
        Return only the activity names, one per line.
        `;
    
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });
    
    const activities = response.choices[0]?.message?.content?.trim().split('\n') || [];
    return activities.map(activity => activity.trim()).filter(activity => activity);
    
  } catch (error) {
    console.error("Could not find activities:", error);
    return ["Walk in the neighborhood", "Visit a nearby park", "Check out local shops"];
  }
}

/** Main workflow: collect input, search concurrently, score with AI, suggest activities. */
async function main(): Promise<void> {
  console.log("Starting AI Date Planner...");

  const userInput = await getUserInput();
  console.log(`Extracted: ${userInput.cuisine_type} in ${userInput.location} for ${userInput.date_preference}`);

  console.log("\nGenerating search queries...");
  let searchQueries: string[];
  try {
    searchQueries = await generateSearchQueries(
      userInput.location,
      userInput.cuisine_type,
      userInput.budget,
      userInput.special_requirements
    );

    console.log(`Found ${searchQueries.length} search queries:`);
    searchQueries.forEach((query, index) => {
      const cleanedQuery = query.replace(/['"]/g, '');
      console.log(`   ${index + 1}. ${cleanedQuery}`);
    });
  } catch (error) {
    console.error("Error generating search queries:", error);
    console.log("Trying fallback search queries...");
    searchQueries = [
      `${userInput.cuisine_type} restaurants in ${userInput.location}`,
      `${userInput.cuisine_type} ${userInput.location} ${userInput.budget}`,
      `best ${userInput.cuisine_type} restaurants ${userInput.location}`
    ];
  }

  console.log("\nStarting concurrent browser searches...");

  /** Execute a single search query in its own browser session, verifying top results. */
  async function runSingleSearch(query: string, sessionIndex: number, userInput: DatePlannerAnswers): Promise<SearchResult> {
    console.log(`Starting search session ${sessionIndex + 1} for: "${query}"`);

    // Separate Stagehand instance per search enables true concurrency
    const sessionStagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 1, // Silent logging to avoid cluttering output
      // Logging levels: 0 = errors only, 1 = info, 2 = debug 
      // When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs
      // https://docs.stagehand.dev/configuration/logging
      modelName: "openai/gpt-4o-mini",
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        region: "us-east-1",
        timeout: 900,
        browserSettings: {
          viewport: {
            width: 1920,
            height: 1080,
          }
        }
      },
    });

    try {
      await sessionStagehand.init();
      const sessionPage = sessionStagehand.page;

      const sessionId = sessionStagehand.browserbaseSessionID;
      if (sessionId) {
        console.log(`Session ${sessionIndex + 1} Live View: https://www.browserbase.com/sessions/${sessionId}`);
      }

      console.log(`Session ${sessionIndex + 1}: Navigating to Google search for "${query}"...`);
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await sessionPage.goto(searchUrl);
      // Wait for results to load (Google may show captcha or require time)
      await sessionPage.waitForTimeout(3000);

      console.log(`Session ${sessionIndex + 1}: Extracting restaurant links from search results...`);
      
      const SearchResultItemSchema = z.object({
        name: z.string().describe("the name of the restaurant"),
        url: z.string().url().describe("the URL link to the restaurant page (from search results or restaurant sites like OpenTable, Yelp, Resy, etc.)"),
        snippet: z.string().optional().describe("a brief snippet/description if available from search results"),
      });
      
      const SearchResultsSchema = z.object({
        restaurants: z.array(SearchResultItemSchema).max(5).describe("array of up to 5 restaurant results from the search, including links to restaurant websites, OpenTable, Yelp, Resy, or other booking platforms"),
      });
      
      const searchResults = await sessionPage.extract({
        instruction: "Extract restaurant names and URLs from the search results. Look for links to restaurant websites, OpenTable, Yelp, Resy, or other restaurant listing/booking sites. Get up to 5 results.",
        schema: SearchResultsSchema
      });

      console.log(`Session ${sessionIndex + 1}: Found ${searchResults.restaurants.length} restaurant links`);

      const verifiedRestaurants: Restaurant[] = [];
      const verifyCount = Math.min(3, searchResults.restaurants.length);
      
      for (let i = 0; i < verifyCount; i++) {
        const result = searchResults.restaurants[i];
        console.log(`Session ${sessionIndex + 1}: Verifying ${i + 1}/${verifyCount}: ${result.name}...`);
        
        try {
          console.log(`Session ${sessionIndex + 1}: Navigating to ${result.url}...`);
          await sessionPage.goto(result.url);
          await sessionPage.waitForTimeout(3000);
          
          console.log(`Session ${sessionIndex + 1}: Extracting restaurant details from ${result.url}...`);
          const RestaurantDetailSchema = z.object({
            name: z.string().describe("the name of the restaurant"),
            rating: z.string().describe("the star rating or review information (e.g., '4.5 stars', 'Great reviews', '4.7/5')"),
            price_range: z.string().describe("the price range ($, $$, $$$, $$$$) or price level"),
            cuisine: z.string().describe("the cuisine type"),
            location: z.string().describe("the location, neighborhood, or address"),
            description: z.string().optional().describe("a brief description or key features"),
            hours: z.string().optional().describe("operating hours if available"),
            phone: z.string().optional().describe("phone number if available"),
            address: z.string().optional().describe("full address if available"),
            reservation_available: z.boolean().optional().describe("whether reservations appear to be available"),
          });
          
          const DetailSchema = z.object({
            restaurant: RestaurantDetailSchema.describe("detailed restaurant information from the page"),
          });
          
          const restaurantDetails = await sessionPage.extract({
            instruction: "Extract detailed information about this restaurant from the page. Look for rating, price range, cuisine type, location, description, hours, contact info, and whether reservations are available.",
            schema: DetailSchema
          });
          
          const detail = restaurantDetails.restaurant;
          
          verifiedRestaurants.push({
            name: detail.name || result.name,
            url: result.url,
            rating: detail.rating || "Rating not available",
            price_range: detail.price_range || "Price not specified",
            cuisine: detail.cuisine || userInput.cuisine_type,
            location: detail.location || userInput.location,
            verified: true,
            verified_details: {
              description: detail.description,
              hours: detail.hours,
              phone: detail.phone,
              address: detail.address,
              reservation_available: detail.reservation_available,
            }
          });
          
          console.log(`Session ${sessionIndex + 1}: ✓ Verified ${detail.name || result.name}`);
          
        } catch (error) {
          console.error(`Session ${sessionIndex + 1}: Error verifying ${result.name}:`, error);
          console.log(`Session ${sessionIndex + 1}: ⚠ Could not verify ${result.name}, using basic info`);
          verifiedRestaurants.push({
            name: result.name,
            url: result.url,
            rating: "Rating not verified",
            price_range: "Price not verified",
            cuisine: userInput.cuisine_type,
            location: userInput.location,
            verified: false,
          });
        }
      }

      const restaurants = verifiedRestaurants;

      console.log(`Session ${sessionIndex + 1}: Session closed successfully`);
      await sessionStagehand.close();

      return {
        query,
        session_index: sessionIndex + 1,
        restaurants
      };
    } catch (error) {
      console.error(`Session ${sessionIndex + 1} failed:`, error);

      try {
        await sessionStagehand.close();
        console.log(`Session ${sessionIndex + 1}: Session closed after error`);
      } catch (closeError) {
        console.error(`Error closing session ${sessionIndex + 1}:`, closeError);
      }

      return {
        query,
        session_index: sessionIndex + 1,
        restaurants: []
      };
    }
  }

  const searchPromises = searchQueries.map((query, index) => runSingleSearch(query, index, userInput));

  console.log("\nBrowser Sessions Starting...");
  console.log("Live view links will appear as each session initializes");

  const allResults = await Promise.all(searchPromises);

  const totalRestaurants = allResults.reduce((sum, result) => sum + result.restaurants.length, 0);
  console.log(`\nTotal restaurants found: ${totalRestaurants} across ${searchQueries.length} search sessions`);

  const allRestaurantsFlat: Restaurant[] = [];
  allResults.forEach(result => {
    allRestaurantsFlat.push(...result.restaurants);
  });

  if (allRestaurantsFlat.length > 0) {
    try {
      console.log(`\nScoring ${allRestaurantsFlat.length} restaurants with AI...`);
      const scoredRestaurants = await scoreRestaurants(
        allRestaurantsFlat, 
        userInput.special_requirements,
        userInput.cuisine_type,
        userInput.budget
      );
      
      console.log(`Scored ${scoredRestaurants.length} restaurants`);
      
      console.log(`Filtering restaurants (minimum score 5/10, must match ${userInput.cuisine_type} cuisine)...`);
      // Filter: minimum score 5/10 and cuisine must match (prevents showing wrong cuisine types)
      const MIN_SCORE_THRESHOLD = 5;
      const filteredRestaurants = scoredRestaurants.filter(restaurant => {
        const score = restaurant.ai_score || 0;
        const reason = restaurant.ai_reason?.toLowerCase() || "";
        
        // Exclude restaurants with low scores
        if (score < MIN_SCORE_THRESHOLD) {
          return false;
        }
        
        // Exclude restaurants explicitly marked as not matching cuisine
        const cuisineMismatchIndicators = [
          "not " + userInput.cuisine_type.toLowerCase(),
          "doesn't match cuisine",
          "wrong cuisine",
          "not " + userInput.cuisine_type.toLowerCase().slice(0, -1) + " cuisine"
        ];
        if (cuisineMismatchIndicators.some(indicator => reason.includes(indicator))) {
          return false;
        }
        
        return true;
      });
      
      console.log(`Found ${filteredRestaurants.length} restaurants meeting quality threshold`);
      const top3Restaurants = filteredRestaurants.slice(0, 3);
      
      if (top3Restaurants.length === 0) {
        console.log("\n⚠️  No restaurants found that match your preferences well enough.");
        console.log("The restaurants found didn't meet the quality threshold (minimum score 5/10) or cuisine match.");
        console.log("\nTry:");
        console.log(`  - Adjusting your cuisine preference (currently: ${userInput.cuisine_type})`);
        console.log(`  - Trying a different location (currently: ${userInput.location})`);
        console.log(`  - Adjusting your budget (currently: ${userInput.budget})`);
        console.log("\nHere are some restaurants that were found (but didn't match well):");
        scoredRestaurants.slice(0, 3).forEach((restaurant, i) => {
          console.log(`  ${i + 1}. ${restaurant.name} (${restaurant.cuisine}) - Score: ${restaurant.ai_score}/10`);
          console.log(`     Reason: ${restaurant.ai_reason}`);
        });
        return;
      }

      console.log("\n🎉 PERFECT DATE PLANNED!");
      console.log("=".repeat(50));

      const primaryRestaurant = top3Restaurants[0] || null;
      const backupRestaurants = top3Restaurants.slice(1, 3);

      if (primaryRestaurant) {
        console.log(`\n🥇 PRIMARY RECOMMENDATION:`);
        console.log(`   ${primaryRestaurant.name}`);
        console.log(`   Cuisine: ${primaryRestaurant.cuisine}`);
        console.log(`   Rating: ${primaryRestaurant.rating}`);
        console.log(`   Price: ${primaryRestaurant.price_range}`);
        console.log(`   Location: ${primaryRestaurant.location}`);
        if (primaryRestaurant.verified) {
          console.log(`   ✓ Verified by clicking through and inspecting the restaurant page`);
          if (primaryRestaurant.verified_details) {
            const details = primaryRestaurant.verified_details;
            if (details.description) console.log(`   Description: ${details.description}`);
            if (details.address) console.log(`   Address: ${details.address}`);
            if (details.phone) console.log(`   Phone: ${details.phone}`);
            if (details.hours) console.log(`   Hours: ${details.hours}`);
            if (details.reservation_available !== undefined) {
              console.log(`   Reservations: ${details.reservation_available ? 'Available' : 'Not available'}`);
            }
          }
        } else {
          console.log(`   ⚠ Not verified (could not access restaurant page)`);
        }
        if (primaryRestaurant.ai_score) {
          console.log(`   AI Score: ${primaryRestaurant.ai_score}/10`);
          console.log(`   Why: ${primaryRestaurant.ai_reason}`);
        }
        console.log(`   URL: ${primaryRestaurant.url}`);
        console.log();
      }

      if (backupRestaurants.length > 0) {
        console.log(`🥈 BACKUP OPTIONS:`);
        backupRestaurants.forEach((restaurant, i) => {
          console.log(`   ${i + 1}. ${restaurant.name} (${restaurant.cuisine}) - ${restaurant.rating} - ${restaurant.price_range}`);
          if (restaurant.verified) {
            console.log(`      ✓ Verified`);
            if (restaurant.verified_details?.address) {
              console.log(`      Address: ${restaurant.verified_details.address}`);
            }
            if (restaurant.verified_details?.reservation_available !== undefined) {
              console.log(`      Reservations: ${restaurant.verified_details.reservation_available ? 'Available' : 'Not available'}`);
            }
          }
          if (restaurant.ai_score) {
            console.log(`      AI Score: ${restaurant.ai_score}/10 - ${restaurant.ai_reason}`);
          }
        });
        console.log();
      }

      if (primaryRestaurant) {
        console.log("\nFinding nearby activities...");
        const activities = await findNearbyActivities(primaryRestaurant);
        console.log("🎯 NEARBY ACTIVITIES:");
        activities.forEach(activity => {
          console.log(`   • ${activity}`);
        });
        console.log();
      }

      console.log(`\nDate planning complete! Found ${totalRestaurants} restaurants, analyzed ${scoredRestaurants.length} with AI.`);
    } catch (error) {
      console.error("Error scoring restaurants:", error);
      console.log(`Cuisine: ${userInput.cuisine_type}`);
      console.log(`Location: ${userInput.location}`);
    }
  } else {
    console.log("No restaurants found to score");
    console.log("Try adjusting your search criteria or check if the website is accessible");
  }
  
  console.log("\n💡 TIP: Visit the restaurant websites directly to make reservations or call for availability.");
  console.log("🎉 Happy dating! Enjoy your special evening!");
}

main().catch((err) => {
  console.error("Application error:", err);
  console.log("\nCommon issues:");
  console.log("  - Check .env has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.log("  - Verify OPENAI_API_KEY is set");
  console.log("  - Ensure internet access and website accessibility");
  console.log("  - Check Browserbase project has active credits/sessions available");
  process.exit(1);
});

