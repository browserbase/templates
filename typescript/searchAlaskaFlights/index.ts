// Stagehand + Browserbase: Alaska Airlines Flight Search - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

/**
 * Main entry point: search Alaska Airlines for flights and extract structured flight data.
 * Uses AI-powered browser automation to fill search form and parse results.
 */
async function main() {
  console.log("Starting Alaska Airlines flight search automation...");

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
    model: "openai/gpt-4.1",
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      timeout: 900, // Extended timeout to allow for form interactions and result loading
    },
  });

  try {
    // Initialize browser session
    console.log("Initializing browser session...");
    await stagehand.init();
    console.log("Stagehand session started successfully");

    // Log live session URL for real-time monitoring during automation
    console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

    const page = stagehand.context.pages()[0];

    // Navigate to Alaska Airlines booking page
    console.log("Navigating to Alaska Airlines...");
    await page.goto("https://www.alaskaair.com/");
    console.log("Page loaded successfully");

    // Flight search parameters - customize these for different routes/dates
    const origin = "SFO";
    const destination = "LAX";
    const departureDate = "02/01/2025";
    const returnDate = "02/08/2025";

    console.log(`Searching for flights from ${origin} to ${destination}`);

    // Fill origin airport code - type then select from autocomplete dropdown
    console.log("Filling origin...");
    await stagehand.act(`type '${origin}' into the origin field`);
    await stagehand.act(`click on ${origin} from the origin options`);
    console.log(`Origin selected: ${origin}`);

    // Fill destination airport code - same pattern as origin
    console.log("Filling destination...");
    await stagehand.act(`type '${destination}' into the destination field`);
    await stagehand.act(`click on ${destination} from the destination options`);
    console.log(`Destination selected: ${destination}`);

    // Select departure date from calendar widget
    console.log(`Selecting departure date: ${departureDate}`);
    await stagehand.act(`click on the departure date field`);
    await stagehand.act(`select the date ${departureDate} from the calendar`);
    console.log(`Departure date selected: ${departureDate}`);

    // Select return date from calendar widget
    console.log(`Selecting return date: ${returnDate}`);
    await stagehand.act(`click on the return date field`);
    await stagehand.act(`select the date ${returnDate} from the calendar`);
    console.log(`Return date selected: ${returnDate}`);

    // Trigger search to retrieve available flights
    console.log("Clicking search button...");
    await stagehand.act("click the search for flights button");

    // Wait for search results to load and render on the page
    await page.waitForTimeout(3000);

    // Extract structured flight data using natural language instruction
    console.log("Extracting flight data...");
    const flightData = await stagehand.extract(
      "extract all of the flight data from the page, only include the flight number, departure and arrival times, and the price",
      z.object({
        flights: z.array(z.object({
          flight_number: z.string().optional(),
          departure_time: z.string().optional(),
          arrival_time: z.string().optional(),
          price: z.string().optional(),
        }))
      })
    );

    // Display extracted flight information
    console.log(`\nFound ${flightData.flights.length} flights:`);
    console.log(JSON.stringify(flightData, null, 2));

  } catch (error) {
    console.error("Error during flight search:", error);
    
    // Provide helpful troubleshooting information
    console.error("\nCommon issues:");
    console.error("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("2. Verify OPENAI_API_KEY is set in environment");
    console.error("3. Ensure internet access and https://www.alaskaair.com is accessible");
    console.error("4. Verify Browserbase account has sufficient credits");
    
    throw error;
  } finally {
    // Clean up browser session
    console.log("Closing browser session...");
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  process.exit(1);
});
