# Stagehand Code Mode + Vercel AI SDK: Dynamic Form Filling

## AT A GLANCE

- Goal: let a bring-your-own agent interpret trip details and complete a dynamic form.
- Agent framework: Vercel AI SDK `ToolLoopAgent` owns the multi-step loop.
- Browser tool: Stagehand code mode exposes the single `code_execute` MCP tool.
- The agent is instructed to inspect before acting and never invent missing values.

## QUICKSTART

1. `cd dynamic-form-filling`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. Customize `tripDetails` in `index.ts`
5. `pnpm start`

## EXPECTED OUTPUT

- The agent opens the form, maps the supplied trip details to its fields, reviews the result, and submits it.
- The MCP client closes the Stagehand client and Browserbase browser in `finally`.

## SAFETY

This example submits a form. Use a test form and review the prompt before running. Code mode executes model-authored JavaScript and is not itself a security sandbox.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK MCP tools: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
