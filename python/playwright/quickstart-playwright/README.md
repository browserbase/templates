# Quickstart: Playwright + Browserbase

## AT A GLANCE

- Goal: connect to a cloud browser via Playwright and Browserbase, navigate a real website (SFMOMA), interact with UI elements, and extract page content.
- No AI required: uses Playwright and the Browserbase SDK directly — no model API key needed.
- Minimal setup: one script, one API key, instant cloud browser.
  Docs → https://docs.browserbase.com/introduction/playwright

## GLOSSARY

- Session: a full cloud browser instance you connect to via CDP and control with Playwright.
  Docs → https://docs.browserbase.com/introduction/getting-started
- CDP (Chrome DevTools Protocol): the protocol Playwright uses to control the remote browser.
  Docs → https://docs.browserbase.com/introduction/playwright
- Playwright: browser automation library — `page.goto()`, `page.fill()`, `page.click()`, etc.
  Docs → https://playwright.dev/python/docs/api/class-page
- Debug URL: a live view of your session in the Browserbase dashboard.
  Docs → https://docs.browserbase.com/features/session-inspector

## QUICKSTART

1. cd python/playwright/quickstart-playwright
2. cp .env.example .env
3. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
4. uvx --with browserbase --with playwright --with python-dotenv python main.py

## EXPECTED OUTPUT

- Creates a Browserbase cloud browser session
- Connects via CDP using Playwright
- Navigates to https://www.sfmoma.org/ and prints the page title
- Opens and closes the search overlay
- Clicks the Membership link and navigates to the membership page
- Extracts the heading and intro text from the membership page
- Closes the browser and prints a session replay link

## COMMON PITFALLS

- Missing API key: verify .env contains BROWSERBASE_API_KEY — this is the only required credential
- Project ID confusion: BROWSERBASE_PROJECT_ID is optional — the API infers it from your API key
- Playwright install: run `playwright install chromium` if you get browser-not-found errors (though Browserbase provides the browser)
- Session not closing: always close the browser to avoid leaked sessions
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Getting started with Browserbase and Playwright
• Cloud browser automation without managing infrastructure
• Interacting with UI elements and extracting content from web pages
• Building browser-based workflows with Playwright

## NEXT STEPS

• Add AI extraction: swap in Stagehand for AI-powered `act()`, `extract()`, and `observe()`
• Enable proxies: pass `proxies=True` in `bb.sessions.create()` for residential proxy support
• Enable stealth mode: add `browser_settings={"advanced_stealth": True, "solve_captchas": True}` to bypass bot detection
• Run in parallel: create multiple sessions for concurrent browser automation

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
