import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config";

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
  console.log(`   Content length: ${fetchResult.content.length} chars`);

  const textPreview = fetchResult.content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300);
  console.log(`   Preview:        ${textPreview}...`);
  console.log();

  // ─── STEP 3: STAGEHAND AGENT ────────────────────────────────────────────────
  // Stagehand is the AI SDK for browser agents — act, extract, observe, and agent
  // primitives that let agents browse and interact with the web like humans.
  // Docs: https://docs.stagehand.dev | Agent: https://docs.stagehand.dev/v3/basics/agent

  console.log(`STEP 3: STAGEHAND AGENT`);
  console.log(`   Launching browser...\n`);

  // env: "BROWSERBASE" runs on Browserbase's headless browser infrastructure with
  // session replay, Agent Identity, and proxies built in.
  // The Model Gateway routes LLM requests through Browserbase — one API key gives
  // access to models from OpenAI, Anthropic, and Google with unified billing.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "anthropic/claude-sonnet-4-6",
  });

  await stagehand.init();

  try {
    console.log(`   Session:  https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);
    console.log(`   Navigating to: ${targetUrl}`);

    const page = stagehand.context.pages()[0]!;
    await page.goto(targetUrl);

    console.log(`   Starting autonomous agent...\n`);

    // stagehand.agent() creates a browser agent that can autonomously navigate, click,
    // type, scroll, and extract data — driven by a natural-language instruction.
    const agent = stagehand.agent({
      systemPrompt:
        "You are a helpful research assistant browsing the web. " +
        "Extract factual information from pages. Be concise and structured.",
    });

    const agentResult = await agent.execute({
      instruction:
        `You're on a page about "${targetTitle}". ` +
        `Extract the top 3 recommendations or key points from this page. ` +
        `For each, include the name and a one-sentence summary of why it's notable.`,
      maxSteps: 10,
    });

    console.log(`\n   ── Agent Result ──`);
    console.log(agentResult);
  } finally {
    await stagehand.close();
  }

  console.log(`\nDone! Watch the session replay at the URL above to see what the agent did.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
