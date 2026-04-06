# Browser Agent Demo: Search, Fetch & Stagehand Agent on Browserbase

## AT A GLANCE

- **Goal**: build a browser agent that searches the web, fetches page content, and autonomously extracts information — all through one Browserbase API key.
- **Pattern**: Search → Fetch → Stagehand Agent. Lightweight primitives (Search, Fetch) gather context cheaply before spinning up a full browser agent for interaction.
- **Single API key**: the Model Gateway routes LLM requests through Browserbase — no separate OpenAI/Anthropic/Google keys needed.
- **Full platform demo**: uses Browsers, Search API, Fetch API, Stagehand, and Model Gateway together.
  Docs → https://docs.browserbase.com

## GLOSSARY

- **Search API**: search the web for structured results (titles, URLs, metadata) without a browser session.
  Docs → https://docs.browserbase.com/features/search
- **Fetch API**: fetch page content (HTML, status, headers) for token-efficient context — no browser needed.
  Docs → https://docs.browserbase.com/features/fetch
- **Stagehand**: the AI SDK for browser agents — act, extract, observe, and agent primitives.
  Docs → https://docs.stagehand.dev
- **agent()**: Stagehand primitive that gives a model full control of a headless browser via natural-language instructions.
  Docs → https://docs.stagehand.dev/v3/basics/agent
- **Model Gateway**: routes LLM requests through Browserbase with unified billing across OpenAI, Anthropic, and Google.
  Docs → https://docs.browserbase.com/features/model-gateway
- **Agent Identity**: built-in credential management and strategic partnerships for accessing any website.
  Docs → https://docs.browserbase.com/features/agent-identity

## QUICKSTART

1. cd typescript/browser-agent-demo
2. pnpm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
5. pnpm start

## EXPECTED OUTPUT

- Searches the web for "best coffee shops in San Francisco" and displays 5 structured results
- Selects the top result and fetches its HTML content with status code, content type, and preview
- Launches a Stagehand browser agent on Browserbase and prints the session replay URL
- Navigates to the selected page and autonomously extracts the top 3 recommendations
- Outputs the agent's structured findings and closes the session

## COMMON PITFALLS

- Missing API key: verify .env contains BROWSERBASE_API_KEY — this is the only required credential
- No separate LLM keys needed: the Model Gateway handles model access through your Browserbase key
- Search returns no results: try a different query string — some queries may return empty depending on availability
- Agent timeout: increase `maxSteps` if the page is complex and the agent needs more interactions
- Session not closing: the demo uses `try/finally` to ensure `stagehand.close()` runs — always clean up sessions
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Building research agents that search, evaluate, and extract from web pages
• Token-efficient web browsing pipelines (cheap Search/Fetch before expensive browser sessions)
• Autonomous data extraction from any website without writing selectors
• Prototyping browser agents with the full Browserbase platform

## NEXT STEPS

• **Customize the query**: change the search query and agent instructions to extract different types of information
• **Add multi-page navigation**: chain multiple `agent.execute()` calls to browse across several pages
• **Deploy as a Function**: run the agent on Browserbase infrastructure with <5ms browser latency
Docs → https://docs.browserbase.com/features/functions
• **Enable stealth mode**: add `browserSettings: { advancedStealth: true, solveCaptchas: true }` for protected sites
• **Switch models**: change `model` in the Stagehand constructor to use OpenAI or Google models via the Model Gateway

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
