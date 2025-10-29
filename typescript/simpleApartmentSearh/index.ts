// Stagehand + Browserbase: Philadelphia Council Events Search - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

/**
 * Main function to extract Philadelphia Council events for 2025
 * Uses AI-powered browser automation to navigate and extract structured event data
 */
async function main() {
	console.log("Starting Philadelphia Council Events extraction...");
	
	// Initialize Stagehand with Browserbase for cloud-based browser automation
	const stagehand = new Stagehand({
		env: "BROWSERBASE",
		verbose: 1,
		// 0 = errors only, 1 = info, 2 = debug 
		// (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
		// https://docs.stagehand.dev/configuration/logging
		model: "openai/gpt-4.1",
	});

	try {
		// Initialize browser session
		await stagehand.init();
		console.log("Stagehand Session Started");
		console.log(`Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

		const page = stagehand.context.pages()[0];

		// Navigate to Philadelphia Council events page
		console.log("Navigating to Philadelphia Council events page...");
		await page.goto("https://phila.legistar.com/");

		// Navigate to calendar view - using AI to find and click the calendar link
		console.log("Accessing calendar from navigation menu...");
		await stagehand.act("click calendar from the navigation menu");

		// Filter to 2025 events - AI selects the year dropdown
		console.log("Selecting 2025 from the year dropdown...");
		await stagehand.act("select 2025 from the month dropdown");

		// Extract structured event data using AI to parse the events table
		console.log("Extracting event data from calendar...");
		const results = await stagehand.extract(
			"Extract the table with the name, date and time of the events",
			z.object({
				results: z.array(z.object({
					name: z.string(),
					date: z.string(),
					time: z.string(),
				})),
			}),
		);

		console.log(`Found ${results.results.length} events for 2025`);
		console.log("Event data extracted successfully:");
		console.log(JSON.stringify(results, null, 2));
		
		console.log("Session closed successfully");
	} catch (error) {
		console.error("Error during event extraction:", error);
		console.log("\nCommon issues:");
		console.log("- Check .env has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
		console.log("- Verify OPENAI_API_KEY is set");
		console.log("- Ensure internet access and phila.legistar.com is accessible");
		console.log("- Check if the website structure has changed");
		throw error;
	} finally {
		// Always close session to release resources and clean up
		await stagehand.close();
	}
}

main().catch((err) => {
	console.error("Application error:", err);
	process.exit(1);
});