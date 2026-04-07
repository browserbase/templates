// Dynamic Form Filling with Agent - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

// Trip details to be used for form filling
const tripDetails = `I'm planning a Summer in Japan. We're going to Tokyo, Kyoto, and Osaka (Japan) for 14 days. There will be 2 of us, and our budget is around $3,500 USD. We have a couple of dietary needs: vegetarian, and no shellfish. For activities, we'd love food tours, historical sites and temples, nature/scenic walks, local markets, and generally an itinerary that's easy to do with public transit. For accommodation, we prefer mid-range hotels or a traditional ryokan. We like a relaxed pace, with maybe a few busier days mixed in. It's our first time in Japan, and we'd love help balancing must-see attractions with less touristy experiences, plus recommendations for vegetarian-friendly restaurants.`;

async function main() {
  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log(`Stagehand Session Started`);
    console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);

    const page = stagehand.context.pages()[0];

    // Navigate to the trip example form.
    console.log("Navigating to form...");
    await page.goto("https://forms.gle/DVX84XynAJwUWNu26");

    // Create agent with custom system prompt for intelligent form filling.
    // The agent will use semantic matching to select appropriate form options.
    const agent = stagehand.agent({
      cua: false,
      model: "google/gemini-2.5-pro", // Routed through Model Gateway
      systemPrompt: `You are filling out a trip planning form. 
    - When filling out fields, extract relevant information from the trip details provided
    - For fields with options (radio buttons, dropdowns, checkboxes), always choose the closest matching option from the available choices
    - Use semantic matching - look for options that convey similar meaning even if the exact wording differs
    - Only select "Other" if no other option reasonably matches the trip details
    - For checkbox fields, select all options that semantically match the trip details`,
    });

    // Instruction for the agent to fill out the form with trip details.
    const instruction = `Fill out this form with the following trip details: ${tripDetails}

Make sure to:
- Fill in all required fields
- When an exact match isn't available, choose the closest matching option from the available choices
- Use semantic matching to find the best option - look for options that convey similar meaning even if the wording differs
- Only select "Other" if no other option reasonably matches the trip details
- Extract relevant information from the trip details (duration, accommodation preferences, activities, dietary needs, etc.) and map them to the form fields
- IMPORTANT: Once all fields are filled out, you must click the submit button to complete the form submission`;

    // Execute agent to autonomously fill out the form based on details.
    console.log("\nFilling out the form with agent...");
    const result = await agent.execute({
      instruction,
      maxSteps: 30,
    });

    if (result.success) {
      console.log("Form filled successfully!");
      console.log("Agent message:", result.message);
    } else {
      console.log("Form filling may be incomplete");
      console.log("Agent message:", result.message);
    }
  } catch (error) {
    console.error("Error during form filling:", error);
  } finally {
    // Always close session to release resources and clean up.
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in dynamic form filling:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY");
  console.error("  - Ensure the form URL is accessible and form fields are available");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
