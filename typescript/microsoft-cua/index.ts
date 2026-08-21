// Stagehand code mode + Vercel AI SDK: browser agent example

import "dotenv/config";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { ToolLoopAgent, stepCountIs } from "ai";

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

const today = new Date().toISOString().slice(0, 10);
const instruction = `As of ${today}, search live sources for the next visible solar eclipse in North America and its expected date, then the one after that. Cite the source URLs you actually opened.`;

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
      model: process.env.AGENT_MODEL ?? "openai/gpt-5.4",
      instructions:
        "You are a browser research agent. Use code_execute for every browser operation. Prefer deterministic Stagehand V4 page and locator methods and include source URLs in the final answer. Never cite a URL unless you navigated directly to it in the browser.",
      tools,
      prepareStep: ({ stepNumber }) =>
        stepNumber >= 10
          ? {
              activeTools: [],
              toolChoice: "none",
              instructions:
                "Return the evidence-backed answer now. Include only source URLs you opened directly. Do not call another tool.",
            }
          : undefined,
      stopWhen: stepCountIs(12),
    });

    console.log("Executing instruction:", instruction);
    const result = await agent.generate({ prompt: instruction });
    console.log(result.text);
  } finally {
    await mcpClient.close();
  }
}

main().catch((error) => {
  console.error("Error in browser agent example:", error);
  console.error("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env");
  process.exit(1);
});
