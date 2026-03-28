# Scoped Actions for Complex Pages

## AT A GLANCE

- Goal: demonstrate how to scope `observe`, `act`, and `extract` to a specific DOM subtree to reduce token usage and improve precision on complex pages.
- Scoped Observe + Act: uses `observe` with a `selector` to find actions within a target element, then passes the result to `act` — no extra inference needed.
- Scoped Extract: uses `extract` with a `selector` to pull structured data from a specific table instead of the entire page.
- Model: uses `openai/gpt-4.1-mini` for fast, cost-effective automation.
  Docs → https://docs.stagehand.dev

## GLOSSARY

- observe: find candidate actions on a page, optionally scoped to a selector
  Docs → https://docs.stagehand.dev/basics/observe
- act: execute an action (or a pre-observed action) on the page
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from pages using schemas, optionally scoped to a selector
  Docs → https://docs.stagehand.dev/basics/extract
- selector: a CSS selector or XPath that restricts the snapshot sent to the model to a specific DOM subtree

## QUICKSTART

1. cd typescript/scoped-actions
2. pnpm install
3. cp .env.example .env
4. Add BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and OPENAI_API_KEY to .env
5. pnpm start

## EXPECTED OUTPUT

- Initializes a Stagehand session with Browserbase
- Navigates to a Wikipedia GDP page (a data-heavy page with multiple tables)
- **Scoped Extract**: extracts the top countries by GDP from only the target table
- **Scoped Act**: clicks the first country link within the table only
- Outputs JSON to console and closes the session

## COMMON PITFALLS

- "Cannot find module": ensure all dependencies are installed (`pnpm install`)
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and OPENAI_API_KEY
- Selector not found: if the page layout changes, update SELECTOR_SCOPE in index.ts
- Empty results: the scoped selector must match at least one element on the page

## USE CASES

- Table-level automation: act on or extract from a specific table on pages with many tables
- Form scoping: restrict actions to a specific form on a page with multiple forms
- Component isolation: target a sidebar, modal, or card without the model seeing the rest of the page
- Cost control: reduce token usage by sending only the relevant subtree to inference

## NEXT STEPS

- Adapt the selectors to your own pages and use cases
- Combine scoped observe + act for multi-step workflows within a single component
- Use XPath selectors for cross-iframe scoping (e.g., `/html/body/div[2]/iframe/html/body/table`)

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
