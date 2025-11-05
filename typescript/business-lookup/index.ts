// Business Lookup with Agent - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Business search variables
const businessName = "Jalebi Street";

async function main() {
  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    model: "openai/gpt-4.1",
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(`Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);

    const page = stagehand.context.pages()[0];

    // Navigate to SF Business Registry search page.
    console.log(`Navigating to SF Business Registry...`);
    await page.goto("https://data.sfgov.org/stories/s/Registered-Business-Lookup/k6sk-2y6w/");

    // Create agent with computer use capabilities for autonomous business search.
    const agent = stagehand.agent({
      cua: true, // Enable Computer Use Agent mode
      model: {
        modelName: "google/gemini-2.5-computer-use-preview-10-2025",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    },
      systemPrompt: "You are a helpful assistant that can use a web browser to search for business information.",
    });

    console.log(`Searching for business: ${businessName}`);
    const result = await agent.execute({
      instruction: `Find and look up the business "${businessName}" in the SF Business Registry. Use the DBA Name filter to search for "${businessName}", apply the filter, and click on the business row to view detailed information. Scroll towards the right to see the NAICS code.`,
      maxSteps: 30,
    });

    if (!result.success) {
      throw new Error("Agent failed to complete the search");
    }

    // Extract comprehensive business information after agent completes the search.
    console.log("Extracting business information...");
    const businessInfo = await stagehand.extract(
      "Extract all visible business information including DBA Name, Ownership Name, Business Account Number, Location Id, Street Address, Business Start Date, Business End Date, Neighborhood, NAICS Code, and NAICS Code Description",
      z.object({
        dbaName: z.string(),
        ownershipName: z.string().optional(),
        businessAccountNumber: z.string(),
        locationId: z.string().optional(),
        streetAddress: z.string().optional(),
        businessStartDate: z.string().optional(),
        businessEndDate: z.string().optional(),
        neighborhood: z.string().optional(),
        naicsCode: z.string(),
        naicsCodeDescription: z.string().optional(),
      }),
      { page },
    );

    console.log("Business Information:");
    console.log(JSON.stringify(businessInfo, null, 2));

  } catch (error) {
    console.error("Error during business lookup:", error);
  } finally {
    // Always close session to release resources and clean up.
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in business lookup:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_API_KEY is set for the agent");
  console.error("Docs: https://docs.browserbase.com/stagehand");
  process.exit(1);
});

