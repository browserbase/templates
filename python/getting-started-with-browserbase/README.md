# Browserbase: Getting Started

## AT A GLANCE

- Goal: demo all three core Browserbase capabilities in one script — Search API, Fetch API, and Browser Sessions.
- No AI required: uses Playwright and the Browserbase SDK directly — no model API key needed.
- Three demos in one: web search, lightweight HTTP fetch, and full cloud browser automation.
  Docs → https://docs.browserbase.com

## GLOSSARY

- Search API: run web searches through Browserbase — no browser session needed.
  Docs → https://docs.browserbase.com/features/search
- Fetch API: lightweight HTTP fetch through Browserbase infrastructure — no browser, no JS execution.
  Docs → https://docs.browserbase.com/features/fetch
- Session: a full cloud browser instance you connect to via CDP and control with Playwright.
  Docs → https://docs.browserbase.com/introduction/getting-started
- CDP (Chrome DevTools Protocol): the protocol Playwright uses to control the remote browser.
  Docs → https://docs.browserbase.com/introduction/playwright
- Playwright: browser automation library — `page.goto()`, `page.fill()`, `page.click()`, etc.
  Docs → https://playwright.dev/docs/api/class-page

## QUICKSTART

### Python

1. cd python/getting-started-with-browserbase
2. cp .env.example .env
3. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
4. `uv run python main.py`

### TypeScript

1. cd typescript/getting-started-with-browserbase
2. npm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
5. npm start

## EXPECTED OUTPUT

- Search API: searches the web for "Browser automation" and prints the top 5 results with titles and URLs
- Fetch API: fetches a Wikipedia page (no browser), prints status code, content length, and page title
- Browser Session: creates a cloud browser, connects via CDP, navigates to Wikipedia, searches, and extracts the article title, summary, and section headings
- Prints a session replay link for the browser demo
- Closes all resources cleanly

## COMMON PITFALLS

- Missing API key: verify .env contains BROWSERBASE_API_KEY — this is the only required credential
- Project ID confusion: BROWSERBASE_PROJECT_ID is optional — the API infers it from your API key. You only need it if you have multiple projects
- Search API not enabled: if you get a 403, the Search API may need to be enabled on your account — check your dashboard
- Fetch API size limit: responses over 1 MB return a 502 — use a browser session for large pages
- Fetch API no JS: the Fetch API returns raw HTML without executing JavaScript — JS-rendered pages will be empty shells
- Connection timeout: if CDP connection fails, check that your API key is valid at https://browserbase.com/settings
- Wikipedia layout changes: if selectors like `input[name="search"]` stop working, Wikipedia may have updated their HTML — consider using Stagehand for self-healing selectors via AI
- Playwright version mismatch: use `playwright-core` (not `playwright`) in TypeScript to avoid downloading unnecessary browser binaries — Browserbase provides the browser
- Session not closing: always close the browser in a `finally` block to avoid leaked sessions
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

• Getting started: understand all three Browserbase capabilities before deciding which to use in your project.
• Quick prototyping: use Search to find targets, Fetch for static pages, Sessions for JS-heavy ones.
• Cost-optimized scraping: Search and Fetch are cheaper than full browser sessions — use them when you can.
• Building blocks: fork this template and build on whichever API fits your use case.

## NEXT STEPS

• Add AI extraction: swap in Stagehand for AI-powered `act()`, `extract()`, and `observe()` — see the other templates in this repo.
• Chain the APIs: use Search to find URLs, Fetch to triage them, and Sessions for the ones that need a real browser.
• Enable proxies: pass `proxies: true` in `bb.sessions.create()` or `bb.fetchAPI.create()` for residential proxy support.
• Enable stealth mode: add `browserSettings: { advancedStealth: true, solveCaptchas: true }` to bypass bot detection.

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
