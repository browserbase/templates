# Stagehand Code Mode + Vercel AI SDK: Gemini Browser Agent

## AT A GLANCE

- Goal: replace the former Stagehand CUA orchestration example with a bring-your-own Gemini agent.
- Vercel AI SDK `ToolLoopAgent` owns reasoning and tool selection.
- Stagehand code mode provides one stateful browser tool, `code_execute`.
- If Gemini spends the full loop on browser calls, a final tool-free model call synthesizes the
  evidence already collected.

## QUICKSTART

1. `cd gemini-cua`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. `pnpm start`

## EXPECTED OUTPUT

- Gemini calls `code_execute` as needed to research the next two visible solar eclipses in North
  America and cross-check live NASA and Timeanddate sources.
- The final response includes both expected dates and only source URLs the agent opened.
- Closing the MCP client closes Stagehand and the browser.

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Isolate it when prompts or pages are untrusted.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK MCP tools: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
