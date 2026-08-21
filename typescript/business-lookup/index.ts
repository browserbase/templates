// Business Lookup with a bring-your-own agent - See README.md for full documentation

import "dotenv/config";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod/v4";

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

const businessName = "Jalebi Street";

const businessSchema = z.object({
  dbaName: z.string(),
  ownershipName: z.string().nullable(),
  businessAccountNumber: z.string(),
  locationId: z.string().nullable(),
  streetAddress: z.string().nullable(),
  businessStartDate: z.string().nullable(),
  businessEndDate: z.string().nullable(),
  neighborhood: z.string().nullable(),
  naicsCode: z.string().nullable(),
  naicsCodeDescription: z.string().nullable(),
});

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
        "You are a browser agent. Use code_execute for all browser work. Prefer deterministic page, locator, and page.evaluate APIs. Use no more than 8 code_execute calls. Once you have the requested record, stop calling tools and return the structured response immediately.",
      tools,
      output: Output.object({ schema: businessSchema }),
      prepareStep: ({ stepNumber }) =>
        stepNumber >= 8
          ? {
              activeTools: [],
              toolChoice: "none",
              instructions:
                "Return the structured business record now using the evidence already collected. Do not call another tool.",
            }
          : undefined,
      stopWhen: stepCountIs(10),
    });

    console.log(`Searching for business: ${businessName}`);
    const result = await agent.generate({
      prompt: `Open the official San Francisco Open Data API query https://data.sfgov.org/resource/g8m3-pdis.json?$q=${encodeURIComponent(businessName)}&$limit=5 and find the exact DBA record for ${JSON.stringify(businessName)}. Read the JSON rendered in the browser, map ttxid to businessAccountNumber and uniqueid to locationId, and return all requested fields. Use null when a field is not present.`,
    });

    console.log("Business Information:");
    console.log(JSON.stringify(result.output, null, 2));
  } finally {
    await mcpClient.close();
    console.log("Stagehand code-mode session closed successfully");
  }
}

main().catch((error) => {
  console.error("Error in business lookup:", error);
  console.error("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env");
  process.exit(1);
});
