// Dynamic Form Filling with a bring-your-own agent - See README.md for full documentation

import "dotenv/config";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { ToolLoopAgent, stepCountIs } from "ai";

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

const tripDetails = `I'm planning a Summer in Japan. We're going to Tokyo, Kyoto, and Osaka (Japan) for 14 days. There will be 2 of us, and our budget is around $3,500 USD. We have a couple of dietary needs: vegetarian, and no shellfish. For activities, we'd love food tours, historical sites and temples, nature/scenic walks, local markets, and generally an itinerary that's easy to do with public transit. For accommodation, we prefer mid-range hotels or a traditional ryokan. We like a relaxed pace, with maybe a few busier days mixed in. It's our first time in Japan, and we'd love help balancing must-see attractions with less touristy experiences, plus recommendations for vegetarian-friendly restaurants.`;

async function main() {
  const mcpClient = await createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: "stagehand-codemode",
      env: childEnv,
      stderr: "inherit",
    }),
  });

  try {
    const tools = await mcpClient.tools();
    if (!tools.code_execute) throw new Error("Stagehand code mode did not expose code_execute");

    const agent = new ToolLoopAgent({
      model: process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
      instructions:
        "You are a browser form-filling agent. Use code_execute for all browser work. Inspect the page before acting, prefer deterministic locators, use Stagehand act or observe inside code_execute when labels are ambiguous, and never invent values that the user did not provide.",
      tools,
      stopWhen: stepCountIs(20),
    });

    const result = await agent.generate({
      prompt: `Open https://forms.gle/DVX84XynAJwUWNu26 and complete the trip-planning form from these details:\n\n${tripDetails}\n\nReview every answer, submit the form, and report whether submission succeeded.`,
    });
    console.log(result.text);
  } finally {
    await mcpClient.close();
    console.log("Stagehand code-mode session closed successfully");
  }
}

main().catch((error) => {
  console.error("Error in dynamic form filling:", error);
  console.error("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env");
  process.exit(1);
});
