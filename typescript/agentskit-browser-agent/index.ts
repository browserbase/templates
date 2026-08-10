import { openrouter } from "@agentskit/adapters";
import { createRuntime, type RuntimeConfig } from "@agentskit/runtime";
import { browserAgent } from "@agentskit/tools/integrations";
import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";
import { chromium } from "playwright-core";
import { createBrowserPage } from "./browser-page.js";

function required(name: "BROWSERBASE_API_KEY" | "OPENROUTER_API_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and add the key.`);
  }
  return value;
}

async function main(): Promise<void> {
  const browserbaseApiKey = required("BROWSERBASE_API_KEY");
  const openrouterApiKey = required("OPENROUTER_API_KEY");
  const model = process.env.OPENROUTER_MODEL ?? "openrouter/free";
  const task = process.env.AGENT_TASK ?? "Open example.com and report its page heading.";

  const bb = new Browserbase({ apiKey: browserbaseApiKey });
  const session = await bb.sessions.create();
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const page = browser.contexts()[0]?.pages()[0];

  if (!page) {
    await browser.close();
    throw new Error("Browserbase session did not provide a page.");
  }

  console.log(`Session replay: https://browserbase.com/sessions/${session.id}`);

  try {
    const tools = browserAgent({ page: createBrowserPage(page) }) as unknown as NonNullable<
      RuntimeConfig["tools"]
    >;
    const runtime = createRuntime({
      adapter: openrouter({
        apiKey: openrouterApiKey,
        model,
      }),
      tools,
      systemPrompt:
        "Use the browser tools to complete the task. Prefer reading the page over guessing, and report only what you can verify.",
      maxSteps: 8,
    });

    const result = await runtime.run(task);
    console.log(result.content);
    console.log(`Completed in ${result.steps} steps with ${result.toolCalls.length} tool calls.`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
