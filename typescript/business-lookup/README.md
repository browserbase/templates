# Stagehand Code Mode + Vercel AI SDK: Business Lookup

## AT A GLANCE

- Goal: give an external agent a Browserbase browser and have it research one SF business record.
- Agent framework: Vercel AI SDK `ToolLoopAgent` owns the reasoning loop.
- Browser tool: Stagehand code mode exposes one stateful MCP tool, `code_execute`.
- Stagehand is the SDK for browser agents.

## QUICKSTART

1. `cd business-lookup`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. `pnpm start`

Set `AGENT_MODEL` to override the default `anthropic/claude-sonnet-4.6` outer-agent model.

## EXPECTED OUTPUT

- The AI SDK starts the packaged Stagehand code-mode MCP over stdio.
- The agent uses `code_execute` to search the SF business registry.
- The final result is validated against a Zod schema and printed as JSON.
- Closing the MCP client closes Stagehand and the Browserbase browser.

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Run it inside an isolation boundary when prompts or pages are untrusted.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK agents: https://ai-sdk.dev/docs/agents/building-agents
- Vercel AI SDK MCP tools: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
