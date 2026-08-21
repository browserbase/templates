# Stagehand Code Mode + Vercel AI SDK: Company Address Finder

## AT A GLANCE

- Goal: find official legal pages and physical mailing addresses for a list of companies.
- Agent framework: one Vercel AI SDK `ToolLoopAgent` per company.
- Browser tool: each agent receives only Stagehand's stateful `code_execute` MCP tool.
- Concurrency: increase `MAX_CONCURRENT` only when your Browserbase plan supports it.

## QUICKSTART

1. `cd company-address-finder`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. Edit `COMPANY_NAMES` and `MAX_CONCURRENT` in `index.ts`
5. `pnpm start`

## EXPECTED OUTPUT

- Each agent verifies an official homepage, Terms page, and Privacy page.
- It checks Terms first for an address and falls back to Privacy.
- Zod validates the final record for each company.
- Every MCP client is closed, which closes its Stagehand and browser lifecycle.

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Use an isolation boundary for untrusted prompts or pages.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK agents: https://ai-sdk.dev/docs/agents/building-agents
- Browserbase concurrency: https://docs.browserbase.com/guides/concurrency-rate-limits
