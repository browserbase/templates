# Stagehand Code Mode + Vercel AI SDK: Browser Agent

## AT A GLANCE

- Goal: replace the former computer-use orchestration example with a bring-your-own agent.
- Vercel AI SDK `ToolLoopAgent` owns the agent loop.
- Stagehand code mode supplies the stateful `code_execute` MCP browser tool.

## QUICKSTART

1. `cd microsoft-cua`
2. `pnpm install`
3. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
4. `pnpm start`

Set `AGENT_MODEL` to select another AI Gateway model; the default is `openai/gpt-5.4`.

## EXPECTED OUTPUT

- The agent browses with `code_execute` and returns cited research findings.
- Closing the MCP client closes Stagehand and its Browserbase browser.

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Isolate it for untrusted content.

## RESOURCES

- Stagehand: https://docs.stagehand.dev
- Vercel AI SDK agents: https://ai-sdk.dev/docs/agents/building-agents
