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
}

interface SearchResult {
  query: string;
  session_index: number;
  restaurants: Restaurant[];
}

const client = new OpenAI();

async function generateSearchQueries(
  location: string,
  cuisine: string,
  budget: string,
  requirements: string
): Promise<string[]> {
  /**
   * Generate intelligent search queries for restaurant discovery.
   * 
   * Uses AI to create diverse search terms that will find different types of restaurants
   * for the perfect date night experience.
   */
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

async function scoreRestaurants(
  restaurants: Restaurant[],
  requirements: string,
  cuisine: string,
  budget: string
): Promise<Restaurant[]> {
  /**
   * Score and rank restaurants based on user requirements using AI.
   * 
   * Analyzes each restaurant against the user's preferences, budget, cuisine match,
   * and special requirements to find the best date night options.
   */
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
- How well it matches the cuisine preference
- Budget appropriateness
- Special requirements fit
- Rating and reviews
- Location convenience
- Date night atmosphere

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
    // Clean up AI response by removing markdown code blocks
    let responseContent = response.choices[0]?.message?.content?.trim() || "[]";
    responseContent = responseContent
      .replace(/```json\n/g, "")
      .replace(/```json/g, "")
      .replace(/```\n/g, "")
      .replace(/```/g, "");

    // Parse JSON response from AI scoring
    const scoresData = JSON.parse(responseContent);

    // Map AI scores back to restaurants using index matching
    const scoredRestaurants: Restaurant[] = [];
    for (let index = 0; index < restaurants.length; index++) {
      const restaurant = restaurants[index];
      const scoreInfo = scoresData.find((s: any) => s.restaurantIndex === index + 1);
      restaurant.ai_score = scoreInfo?.score || 0;
      restaurant.ai_reason = scoreInfo?.reason || "No scoring available";
      scoredRestaurants.push(restaurant);
    }

    // Sort by AI score descending to show best matches first
    scoredRestaurants.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    return scoredRestaurants;
  } catch (error) {
    console.error("Error parsing AI scores:", error);
    console.log("Using fallback scoring (all restaurants scored as 5)");

    // Fallback scoring ensures app continues working even if AI fails
    restaurants.forEach(restaurant => {
      restaurant.ai_score = 5;
      restaurant.ai_reason = "Scoring failed - using neutral score";
    });
    return restaurants;
  }
}

async function getUserInput(): Promise<DatePlannerAnswers> {
  /**
   * Collect user input for date planning.
   * 
   * Uses interactive CLI prompts with validation to gather information
   * needed for intelligent restaurant recommendations.
   */
  console.log("🍽️ Welcome to the AI-Powered Date Planner!");
  console.log("Let's find the perfect restaurant for your special date.\n");

  // Use inquirer for interactive CLI prompts with validation
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

async function findNearbyActivities(restaurant: Restaurant): Promise<string[]> {
  /**Find nearby activities to extend the date.*/
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

async function main(): Promise<void> {
  /**
   * Main application entry point.
   * 
   * Orchestrates the entire date planning process:
   * 1. Collects user input
   * 2. Generates intelligent search queries
   * 3. Runs concurrent browser searches
   * 4. Scores and ranks restaurants with AI
   * 5. Suggests nearby activities
   * 6. Displays comprehensive date plan
   */
  console.log("Starting AI Date Planner...");

  // Step 1: Collect user input
  const userInput = await getUserInput();
  console.log(`User input received: ${userInput.cuisine_type} in ${userInput.location} for ${userInput.date_preference}`);

  // Step 2: Generate search queries using AI
  console.log("\nGenerating intelligent search queries...");
  let searchQueries: string[];
  try {
    searchQueries = await generateSearchQueries(
      userInput.location,
      userInput.cuisine_type,
      userInput.budget,
      userInput.special_requirements
    );

    console.log("\nGenerated Search Queries:");
    searchQueries.forEach((query, index) => {
      const cleanedQuery = query.replace(/['"]/g, '');
      console.log(`   ${index + 1}. ${cleanedQuery}`);
    });
  } catch (error) {
    console.error("Error generating search queries:", error);
    // Fallback queries ensure app continues working
    searchQueries = [
      `${userInput.cuisine_type} restaurants in ${userInput.location}`,
      `${userInput.cuisine_type} ${userInput.location} ${userInput.budget}`,
      `best ${userInput.cuisine_type} restaurants ${userInput.location}`
    ];
    console.log("Using fallback search queries");
  }

  // Step 3: Start concurrent browser searches
  console.log("\nStarting concurrent browser searches...");

  async function runSingleSearch(query: string, sessionIndex: number, userInput: DatePlannerAnswers): Promise<SearchResult> {
    console.log(`Starting search session ${sessionIndex + 1} for: "${query}"`);

    // Create separate Stagehand instance for each search to run concurrently
    // Each session searches independently to maximize speed and parallel processing
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
      // Initialize browser session with Stagehand
      await sessionStagehand.init();
      const sessionPage = sessionStagehand.page;

      // Display live view URL for debugging and monitoring
      const sessionId = sessionStagehand.browserbaseSessionID;
      if (sessionId) {
        const liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
        console.log(`Session ${sessionIndex + 1} Live View: ${liveViewUrl}`);
      }

      // Navigate to restaurant search site with location-specific URL
      console.log(`Session ${sessionIndex + 1}: Navigating to OpenTable with location filter...`);
      const locationSlug = userInput.location.toLowerCase().replace(" ", "-");
      const locationUrl = `https://www.opentable.com/${locationSlug}-restaurants`;
      await sessionPage.goto(locationUrl);
      await sessionPage.waitForTimeout(3000);

      // Perform search using natural language actions
      console.log(`Session ${sessionIndex + 1}: Searching for "${query}"...`);
      await sessionPage.act(`Search for ${query}`);
      await sessionPage.waitForTimeout(3000);

      // Extract structured restaurant data using Zod schema for type safety
      console.log(`Session ${sessionIndex + 1}: Extracting restaurant data...`);
      
      // Define Zod schemas for structured data extraction
      const RestaurantItemSchema = z.object({
        name: z.string().describe("the name of the restaurant"),
        url: z.string().url().describe("the full URL link to the restaurant page"),
        rating: z.string().describe("the star rating or number of reviews (e.g., '4.5 stars' or '123 reviews')"),
        price_range: z.string().describe("the price range of the restaurant ($, $$, $$$, $$$$)"),
        cuisine: z.string().describe("the cuisine type of the restaurant"),
        location: z.string().describe("the location/neighborhood of the restaurant"),
      });
      
      const RestaurantsDataSchema = z.object({
        restaurants: z.array(RestaurantItemSchema).max(3).describe("array of the first 3 restaurants from search results"),
      });
      
      const restaurantsData = await sessionPage.extract({
        instruction: "Extract the first 3 restaurants from the search results",
        schema: RestaurantsDataSchema
      });

      console.log(
        `Session ${sessionIndex + 1}: Found ${restaurantsData.restaurants.length} restaurants for "${query}"`
      );

      // Convert to Restaurant objects
      const restaurants: Restaurant[] = restaurantsData.restaurants.map(r => ({
        name: r.name,
        url: r.url,
        rating: r.rating,
        price_range: r.price_range,
        cuisine: r.cuisine,
        location: r.location
      }));

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

  // Create concurrent search tasks for all generated queries
  const searchPromises = searchQueries.map((query, index) => runSingleSearch(query, index, userInput));

  console.log("\nBrowser Sessions Starting...");
  console.log("Live view links will appear as each session initializes");

  // Execute all searches concurrently using Promise.all()
  const allResults = await Promise.all(searchPromises);

  // Calculate total restaurants found across all search sessions
  const totalRestaurants = allResults.reduce((sum, result) => sum + result.restaurants.length, 0);
  console.log(`\nTotal restaurants found: ${totalRestaurants} across ${searchQueries.length} searches`);

  // Flatten all restaurants into single array for AI scoring
  const allRestaurantsFlat: Restaurant[] = [];
  allResults.forEach(result => {
    allRestaurantsFlat.push(...result.restaurants);
  });

  // Step 4: Score and rank restaurants with AI
  if (allRestaurantsFlat.length > 0) {
    try {
      // AI scores all restaurants and ranks them by relevance to user preferences
      const scoredRestaurants = await scoreRestaurants(
        allRestaurantsFlat, 
        userInput.special_requirements,
        userInput.cuisine_type,
        userInput.budget
      );
      const top3Restaurants = scoredRestaurants.slice(0, 3);

      console.log("\n🎉 PERFECT DATE PLANNED!");
      console.log("=".repeat(50));

      // Display top 3 restaurants with AI reasoning for transparency
      const primaryRestaurant = top3Restaurants[0] || null;
      const backupRestaurants = top3Restaurants.slice(1, 3);

      if (primaryRestaurant) {
        console.log(`\n🥇 PRIMARY RECOMMENDATION:`);
        console.log(`   ${primaryRestaurant.name}`);
        console.log(`   Cuisine: ${primaryRestaurant.cuisine}`);
        console.log(`   Rating: ${primaryRestaurant.rating}`);
        console.log(`   Price: ${primaryRestaurant.price_range}`);
        console.log(`   Location: ${primaryRestaurant.location}`);
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
          if (restaurant.ai_score) {
            console.log(`      AI Score: ${restaurant.ai_score}/10 - ${restaurant.ai_reason}`);
          }
        });
        console.log();
      }

      // Step 5: Find nearby activities
      if (primaryRestaurant) {
        console.log("🎯 NEARBY ACTIVITIES:");
        const activities = await findNearbyActivities(primaryRestaurant);
        activities.forEach(activity => {
          console.log(`   • ${activity}`);
        });
        console.log();
      }

      console.log(
        `\nDate planning complete! Found ${totalRestaurants} restaurants, analyzed ${scoredRestaurants.length} with AI.`
      );
    } catch (error) {
      // Handle AI scoring errors
      console.error("Error scoring restaurants:", error);
      console.log(`Cuisine: ${userInput.cuisine_type}`);
      console.log(`Location: ${userInput.location}`);
    }
  } else {
    // Handle case where no restaurants were found
    console.log("No restaurants found to score");
    console.log("Try adjusting your search criteria or check if the website is accessible");
  }
  
  console.log("\n💡 TIP: Visit the restaurant websites directly to make reservations or call for availability.");
  console.log("🎉 Happy dating! Enjoy your special evening!");
}

main().catch((err) => {
  console.error("Application error:", err);
  console.log("Check your environment variables");
  process.exit(1);
});
