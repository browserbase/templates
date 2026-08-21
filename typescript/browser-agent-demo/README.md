# Browser Agent Demo: Search, Fetch & Stagehand Code Mode

## AT A GLANCE

- **Goal**: search the web, fetch page content, and extract structured information — all through one Browserbase API key.
- **Pattern**: Search → Fetch → Vercel AI SDK agent → Stagehand `code_execute`. Lightweight APIs gather context before the agent opens a browser.
- **Bring your own agent**: Vercel AI SDK owns reasoning and tool selection; Stagehand code mode owns stateful browser execution.
- **Full platform demo**: uses Browserbase Search and Fetch APIs, Vercel AI Gateway, and Stagehand code mode together.
  Docs → https://docs.browserbase.com

## GLOSSARY

- **Search API**: search the web for structured results (titles, URLs, metadata) without a browser session.
  Docs → https://docs.browserbase.com/features/search
- **Fetch API**: fetch page content (HTML, status, headers) for token-efficient context — no browser needed.
  Docs → https://docs.browserbase.com/features/fetch
- **Stagehand**: the SDK for browser agents. Code mode exposes its V4 browser APIs through `code_execute`.
  Docs → https://docs.stagehand.dev
- **ToolLoopAgent**: Vercel AI SDK's multi-step agent loop.
  Docs → https://ai-sdk.dev/docs/agents/building-agents
- **code_execute**: the one stateful MCP tool the agent uses for all browser work.
- **Agent Identity**: built-in credential management and strategic partnerships for accessing any website.
  Docs → https://docs.browserbase.com/features/agent-identity

## QUICKSTART

1. cd typescript/browser-agent-demo
2. pnpm install
3. cp .env.example .env
4. Add `BROWSERBASE_API_KEY` and `AI_GATEWAY_API_KEY` to `.env`
5. pnpm start

## EXPECTED OUTPUT

- Searches the web for "best coffee shops in San Francisco" and displays 5 structured results
- Selects the top result and fetches its HTML content with status code, content type, and preview
- Starts Stagehand code mode over MCP and gives `code_execute` to a Vercel AI SDK agent
- The agent navigates to the selected page and returns the top 3 recommendations
- Closes the MCP client, Stagehand, and the Browserbase browser

## COMMON PITFALLS

- Missing API key: Browserbase needs `BROWSERBASE_API_KEY`; the outer agent needs `AI_GATEWAY_API_KEY`
- No provider-specific key needed: Vercel AI Gateway handles the outer model selected by `AGENT_MODEL`
- Search returns no results: try a different query string — some queries may return empty depending on availability
- Session not closing: the demo uses `try/finally` to close the MCP client, which closes Stagehand and the browser
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Building research agents that search, evaluate, and extract from web pages
• Token-efficient web browsing pipelines (cheap Search/Fetch before expensive browser sessions)
• Agent-driven browsing with deterministic APIs and Stagehand AI primitives available inside `code_execute`
• Prototyping browser agents with the full Browserbase platform

## NEXT STEPS

• **Customize the query**: change the search query and extraction instruction
• **Add multi-page navigation**: ask the agent to work across pages in the stateful code-mode session
• **Deploy as a Function**: run the agent on Browserbase infrastructure with <5ms browser latency
Docs → https://docs.browserbase.com/features/functions
• **Enable stealth mode**: add `browserSettings: { advancedStealth: true, solveCaptchas: true }` for protected sites
• **Switch outer models**: set `AGENT_MODEL` to another Vercel AI Gateway model ID

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Isolate it when prompts or pages are untrusted.

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
📚 Stagehand Docs: https://docs.stagehand.dev
📚 Search API: https://docs.browserbase.com/features/search
📚 Fetch API: https://docs.browserbase.com/features/fetch
📚 Implementation Docs: https://docs.browserbase.com/features/fetch
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
