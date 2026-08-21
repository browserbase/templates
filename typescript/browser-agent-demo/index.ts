import { Browserbase } from "@browserbasehq/sdk";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { ToolLoopAgent, stepCountIs } from "ai";
import "dotenv/config";

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

async function main() {
  const apiKey = process.env.BROWSERBASE_API_KEY!;

  if (!apiKey) {
    throw new Error("Missing BROWSERBASE_API_KEY. Get one at https://browserbase.com/settings");
  }

  // One API key, everything your agent needs to browse the web.
  // Docs: https://docs.browserbase.com
  const bb = new Browserbase({ apiKey });

  const query = "best coffee shops in San Francisco";

  // ─── STEP 1: SEARCH ─────────────────────────────────────────────────────────
  // Agents can quickly search the web for context without spinning up a browser.
  // Returns structured results (titles, URLs, metadata) for token-efficient decisions.
  // Docs: https://docs.browserbase.com/features/search

  console.log(`\nSTEP 1: SEARCH`);
  console.log(`   Searching for: "${query}"\n`);

  const searchData = await bb.search.web({
    query,
    numResults: 5,
  });

  console.log(`   Found ${searchData.results.length} results:`);
  for (const [i, result] of searchData.results.entries()) {
    console.log(`   ${i + 1}. ${result.title}`);
    console.log(`      ${result.url}`);
    if (result.publishedDate) {
      console.log(`      Published: ${result.publishedDate}`);
    }
  }

  const topResult = searchData.results[0];
  if (!topResult) {
    throw new Error("No search results found. Try a different query.");
  }

  const targetUrl = topResult.url;
  const targetTitle = topResult.title;
  console.log(`\n   -> Selected top result: "${targetTitle}"\n`);

  // ─── STEP 2: FETCH ──────────────────────────────────────────────────────────
  // Fetch page content (HTML, status, headers) for quick, token-efficient context —
  // no browser session needed. Use it for recon before sending an agent to interact.
  // Docs: https://docs.browserbase.com/features/fetch

  console.log(`STEP 2: FETCH`);
  console.log(`   Fetching content from: ${targetUrl}\n`);

  const fetchResult = await bb.fetchAPI.create({
    url: targetUrl,
    allowRedirects: true,
  });

  console.log(`   Status:         ${fetchResult.statusCode}`);
  console.log(`   Content-Type:   ${fetchResult.contentType}`);
  const fetchedContent =
    typeof fetchResult.content === "string"
      ? fetchResult.content
      : JSON.stringify(fetchResult.content);
  console.log(`   Content length: ${fetchedContent.length} chars`);

  const textPreview = fetchedContent
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300);
  console.log(`   Preview:        ${textPreview}...`);
  console.log();

  // ─── STEP 3: BRING-YOUR-OWN AGENT + STAGEHAND CODE MODE ─────────────────────
  // V4 exposes browser-agent capabilities through the packaged code_execute MCP tool.
  // The Vercel AI SDK owns the agent loop; Stagehand owns browser execution.

  console.log(`STEP 3: VERCEL AI SDK + STAGEHAND CODE MODE`);
  console.log(`   Starting code-mode MCP...\n`);

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
        "You are a browser research agent. Use code_execute for all browser work. Prefer deterministic page and locator APIs; use Stagehand AI primitives inside code_execute when semantic extraction is useful. Return concise factual findings.",
      tools,
      stopWhen: stepCountIs(15),
    });

    const result = await agent.generate({
      prompt:
        `Navigate to ${targetUrl}, which was selected for ${JSON.stringify(targetTitle)}. ` +
        "Return the top 3 recommendations or key points, each with a name and a one-sentence explanation of why it is notable.",
    });

    console.log(`\n   ── Agent Result ──`);
    console.log(result.text);
  } finally {
    await mcpClient.close();
  }

  console.log(`\nDone!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
