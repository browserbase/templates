// Stagehand + Browserbase: Computer Use Agent (CUA) Example - See README.md for full documentation

import { Stagehand } from "@browserbasehq/stagehand";

// ============================================================================
// EXAMPLE INSTRUCTIONS - Choose one to test different scenarios
// ============================================================================

// Example 1: Learning Plan Creation
// const instruction = `I want to learn more about Sourdough Bread Making. It's my first time learning about it, and want to get a good grasp by investing 1 hour a day for the next 2 months. Go find online courses/resources, create a plan cross-referencing the time I want to invest with the modules/timelines of the courses and return the plan`;

// Example 2: Flight Search
// const instruction = `Use flights.google.com to find the lowest fare from all eligible one-way flights for 1 adult from JFK to Heathrow in the next 30 days.`;

// Example 3: Solar Eclipse Research
const instruction = `Search for the next visible solar eclipse in North America and its expected date, and what about the one after that.`;

// Example 4: GitHub PR Verification
// const instruction = `Find the most recently opened non-draft PR on Github for Browserbase's Stagehand project and make sure the combination-evals in the PR validation passed.`;

// ============================================================================

async function main() {

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    // model: "google/gemini-2.5-pro", // this is the model stagehand uses in act, observe, extract (not agent)
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: true, // Using proxies will give the agent a better chance of success - requires Developer Plan or higher, comment out if you don't have access
      region: "us-west-2",
      browserSettings: {
        blockAds: true,
        viewport: {
          width: 1288,
          height: 711
        }
      },
    },
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(`Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);

    const page = stagehand.context.pages()[0];

    // Navigate to search engine with extended timeout for slow-loading sites.
    await page.goto("https://www.google.com/", {
      waitUntil: 'domcontentloaded',
    });

    // Create agent with computer use capabilities for autonomous web browsing.
    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "google/gemini-2.5-computer-use-preview-10-2025",
        apiKey: process.env.GOOGLE_API_KEY
      },
      systemPrompt: `You are a helpful assistant that can use a web browser.
      You are currently on the following page: ${page.url()}.
      Do not ask follow up questions, the user will trust your judgement. If you are getting blocked on google, try another search engine.`
    });

    console.log("Executing instruction:", instruction);
    const result = await agent.execute({
      instruction: instruction,
      maxSteps: 30,
      highlightCursor: true
    });

    if (result.success === true) {
      console.log("Task completed successfully!");
      console.log("Result:", result);
    } else {
      console.log("Task failed or was incomplete");
    }

  } catch (error) {
    console.error("Error executing computer use agent:", error);
  } finally {
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in computer use agent example:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_API_KEY is set for the agent");
  console.error("Docs: https://docs.browserbase.com/stagehand");
  process.exit(1);
});