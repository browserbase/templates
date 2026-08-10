# AgentsKit Browser Agent on Browserbase

## Introduction

- **Goal**: run an inspectable AgentsKit agent against a recorded Browserbase cloud browser session.
- **Pattern**: Browserbase session → Playwright over CDP → six-method AgentsKit browser contract → bounded agent run.
- **Provider-portable**: the example defaults to OpenRouter's free router, and the model can be replaced through one environment variable. The browser integration does not depend on the model provider.
- **Auditable**: Browserbase records the session, while AgentsKit returns the answer, step count, and tool calls.

## Quickstart

1. `cd typescript/agentskit-browser-agent`
2. `npm install`
3. `cp .env.example .env`
4. Add `BROWSERBASE_API_KEY` and `OPENROUTER_API_KEY` to `.env`
5. `npm start`

The default task opens `example.com` and reports its heading. Change `AGENT_TASK` to run another browser task. Keep tasks scoped to sites you are authorized to automate.

## Expected output

- A Browserbase session replay URL
- A grounded answer produced from the remote page
- The number of agent steps and browser tool calls

## How it works

`createBrowserPage()` maps the Browserbase Playwright page to AgentsKit's small browser contract: navigate, click, fill, read, screenshot, and wait. `browserAgent()` exposes those capabilities as model-callable tools. The runtime limits execution to eight steps and closes the remote browser in a `finally` block.

This separation keeps both sides replaceable:

- Switch the LLM by changing `OPENROUTER_MODEL`, or replace the AgentsKit adapter.
- Switch browser infrastructure by providing any Playwright- or Puppeteer-compatible page with the same six methods.
- Add AgentsKit memory, RAG, observability, or approval policies without rewriting the browser adapter.

## Validation

- `npm test` verifies the complete Playwright-to-AgentsKit method mapping without credentials or a live browser.
- `npm run typecheck` checks the template in TypeScript strict mode.
- `npm start` performs the live Browserbase and model-provider validation.

## Common pitfalls

- Missing key: both `BROWSERBASE_API_KEY` and `OPENROUTER_API_KEY` are required for the live example.
- Free model capacity: `openrouter/free` may be rate-limited; set `OPENROUTER_MODEL` to another model when needed.
- Selector failure: the model can only use selectors that exist on the current page. Use the Browserbase replay to inspect failures.
- Long-running tasks: the runtime intentionally stops after eight steps. Increase `maxSteps` only for a clearly bounded workflow.

## Resources

- [AgentsKit](https://www.agentskit.io)
- [AgentsKit browser tools](https://www.agentskit.io/docs/agents/tools/integrations/browser-agent)
- [Browserbase Playwright quickstart](https://docs.browserbase.com/welcome/quickstarts/playwright)
- [Browserbase session inspector](https://docs.browserbase.com/platform/browser/observability/session-recording)
- [OpenRouter models](https://openrouter.ai/models)
