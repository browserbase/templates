# Stagehand Code Mode + Vercel AI SDK: Gemini 3 Flash Agent

## AT A GLANCE

- Goal: run a Gemini 3 Flash research agent with a Browserbase browser.
- Vercel AI SDK owns the agent loop; Stagehand code mode supplies `code_execute` over MCP.
- `STAGEHAND_MODEL_NAME` is passed to the code-mode process so Stagehand AI primitives also use Gemini.
- If Gemini spends the full loop on browser calls, a final tool-free model call synthesizes the
  evidence already collected.

## QUICKSTART

1. `cd gemini-3-flash`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. `pnpm start`

Set `AGENT_MODEL` to override the outer agent's default `google/gemini-3-flash-preview` model.

## EXPECTED OUTPUT

- The agent uses `code_execute` to research the next two visible solar eclipses in North America,
  cross-check live NASA and Timeanddate sources, and return both expected dates with citations.
- Closing the MCP client closes Stagehand and its Browserbase browser.

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Isolate it when browsing untrusted content.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK agents: https://ai-sdk.dev/docs/agents/building-agents
