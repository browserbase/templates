// Stagehand code mode + Vercel AI SDK: Gemini 3 Flash agent example

import "dotenv/config";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { generateText, ToolLoopAgent, stepCountIs } from "ai";

const today = new Date().toISOString().slice(0, 10);
const instruction = `As of ${today}, use these two live sources to find the next visible solar eclipse in North America and its expected date, then the one after that: https://eclipse.gsfc.nasa.gov/solar.html and https://www.timeanddate.com/eclipse/list-solar.html?region=north-america. Open and cross-check both sources, then cite each URL.`;

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

async function main() {
  const mcpClient = await createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: "stagehand-codemode",
      env: { ...childEnv, STAGEHAND_MODEL_NAME: "google/gemini-3-flash-preview" },
      stderr: "inherit",
    }),
  });

  try {
    const tools = await mcpClient.tools();
    if (!tools.code_execute) throw new Error("Stagehand code mode did not expose code_execute");
    const model = process.env.AGENT_MODEL ?? "google/gemini-3-flash-preview";

    const agent = new ToolLoopAgent({
      model,
      instructions:
        "You are a browser research agent powered by Gemini. Use code_execute for all browser work, prefer deterministic page APIs, and return source URLs for factual claims. Never cite a URL unless you navigated directly to it in the browser.",
      tools,
      prepareStep: ({ stepNumber }) =>
        stepNumber >= 6
          ? {
              activeTools: [],
              toolChoice: "none",
              instructions:
                "Return the evidence-backed answer now. Include at least two source URLs you opened directly. Do not call another tool.",
            }
          : undefined,
      stopWhen: stepCountIs(8),
    });

    console.log("Executing instruction:", instruction);
    const result = await agent.generate({ prompt: instruction });
    let answer = result.text.trim();
    if (!answer) {
      const browserEvidence = result.toolResults.map((toolResult) => toolResult.output);
      const synthesis = await generateText({
        model,
        prompt: [
          instruction,
          "The browser research loop used every available step. Using only the browser evidence below, return the concise evidence-backed answer now. Do not request another tool.",
          JSON.stringify(browserEvidence),
        ].join("\n\n"),
      });
      answer = synthesis.text.trim();
    }
    if (!answer) throw new Error("Gemini returned no final text");
    console.log(answer);
  } finally {
    await mcpClient.close();
  }
}

main().catch((error) => {
  console.error("Error in Gemini 3 Flash agent example:", error);
  console.error("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env");
  process.exit(1);
});
