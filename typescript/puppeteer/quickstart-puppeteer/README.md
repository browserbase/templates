# Quickstart: Puppeteer + Browserbase (TypeScript)

## AT A GLANCE

- Goal: connect to a cloud browser via Puppeteer and Browserbase, click interactive elements, navigate between pages, and extract page copy.
- No AI required: uses Puppeteer and the Browserbase SDK directly — no model API key needed.
- Demonstrates core Puppeteer patterns: navigation, element clicking, waiting, and text extraction.
- Minimal setup: one script, one API key, instant cloud browser.
  Docs → https://docs.browserbase.com/introduction/puppeteer

## GLOSSARY

- Session: a full cloud browser instance you connect to via WebSocket and control with Puppeteer.
  Docs → https://docs.browserbase.com/introduction/getting-started
- WebSocket: the protocol Puppeteer uses to connect to the remote browser via `connectUrl`.
  Docs → https://docs.browserbase.com/introduction/puppeteer
- Puppeteer: Node.js browser automation library — `page.goto()`, `page.click()`, `page.$eval()`, etc.
  Docs → https://pptr.dev/api/puppeteer.page
- waitForSelector: waits for an element matching the CSS selector to appear in the DOM before interacting — avoids race conditions.
  Docs → https://pptr.dev/api/puppeteer.page.waitforselector

## QUICKSTART

1. cd typescript/puppeteer/quickstart-puppeteer
2. npm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
5. npm start

## EXPECTED OUTPUT

- Creates a Browserbase cloud browser session
- Connects via WebSocket using Puppeteer
- Prints a live debug URL
- Navigates to https://www.sfmoma.org and prints the URL and title
- Clicks the search button to open the search overlay, then closes it
- Navigates to the membership page
- Extracts the heading and intro copy from the membership page
- Closes the browser

## COMMON PITFALLS

- Missing API key: verify .env contains BROWSERBASE_API_KEY — this is the only required credential
- Project ID confusion: BROWSERBASE_PROJECT_ID is optional — the API infers it from your API key
- Puppeteer version: use `puppeteer-core` (not `puppeteer`) to avoid downloading unnecessary browser binaries — Browserbase provides the browser
- Puppeteer is Node.js only: there is no maintained Python equivalent — use Playwright or Selenium for Python
- Session not closing: always call `browser.close()` in a `finally` block to avoid leaked sessions
- Element not found: if selectors change on the target site, inspect the page and update the CSS selectors
- Navigation timeout: increase the timeout in `page.waitForNavigation()` for slow-loading pages
- Click intercepted: another element (cookie banner, overlay) may be covering the target — close it first or use `page.waitForSelector()` to wait for it to disappear
- Stale element: if the page reloads between finding and clicking an element, re-query with a fresh `page.waitForSelector()` call
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

- Getting started with Browserbase and Puppeteer in TypeScript
- Migrating existing Puppeteer scripts to the cloud
- Cloud browser automation without managing infrastructure
- Web scraping and data extraction at scale

## NEXT STEPS

- Add AI extraction: swap in Stagehand for AI-powered `act()`, `extract()`, and `observe()`
- Enable proxies: pass `proxies: true` in `bb.sessions.create()` for residential proxy support
- Enable stealth mode: add `browserSettings: { advancedStealth: true, solveCaptchas: true }` to bypass bot detection
- Run in parallel: create multiple sessions for concurrent browser automation

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
