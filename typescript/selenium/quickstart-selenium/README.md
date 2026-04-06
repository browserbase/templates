# Quickstart: Selenium + Browserbase (TypeScript)

## AT A GLANCE

- Goal: connect to a cloud browser via Selenium and Browserbase, click interactive elements, navigate between pages, and extract page copy.
- No AI required: uses Selenium WebDriver and the Browserbase SDK directly — no model API key needed.
- Demonstrates core Selenium patterns: navigation, element clicking, waiting, and text extraction.
- Minimal setup: one script, one API key, instant cloud browser.
  Docs → https://docs.browserbase.com/introduction/selenium

## GLOSSARY

- Session: a full cloud browser instance you connect to via Selenium WebDriver.
  Docs → https://docs.browserbase.com/introduction/getting-started
- Signing Key: a per-session key used to authenticate Selenium HTTP requests to Browserbase.
  Docs → https://docs.browserbase.com/introduction/selenium
- Selenium WebDriver: browser automation library — `driver.get()`, `driver.findElement()`, etc.
  Docs → https://www.selenium.dev/documentation/webdriver/
- WebDriverWait (until): robust element waiting — waits for elements to be clickable/visible before interacting, avoids brittle `setTimeout()`.
  Docs → https://www.selenium.dev/documentation/webdriver/waits/

## QUICKSTART

1. cd typescript/selenium/quickstart-selenium
2. npm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env (get it from https://browserbase.com/settings)
5. npm start

## EXPECTED OUTPUT

- Creates a Browserbase cloud browser session
- Connects via HTTP using Selenium WebDriver with a custom signing key
- Prints browser name and version
- Prints a live debug URL
- Navigates to https://www.sfmoma.org and prints the URL and title
- Clicks the search button to open the search overlay, then closes it
- Clicks the Membership link and navigates to the membership page
- Extracts the heading and intro copy from the membership page
- Closes the driver

## COMMON PITFALLS

- Missing API key: verify .env contains BROWSERBASE_API_KEY — this is the only required credential
- Project ID confusion: BROWSERBASE_PROJECT_ID is optional — the API infers it from your API key
- Custom HTTP agent: Selenium requires a custom `http.Agent` to inject the `x-bb-signing-key` header — this is handled in the template code
- Selenium uses HTTP not WebSocket: unlike Playwright/Puppeteer, Selenium connects over HTTP via `seleniumRemoteUrl`
- Session not closing: always call `driver.quit()` in a `finally` block to avoid leaked sessions
- Element not found: if selectors change on the target site, inspect the page and update `By.css()` or `By.linkText()` values
- Timeout waiting for element: increase the `until` timeout (default 10000ms) for slow-loading pages
- Click intercepted: another element (cookie banner, overlay) may be covering the target — close it first or use `driver.wait()` to wait for it to disappear
- Stale element reference: if the page reloads between finding and clicking an element, re-locate it with a fresh `driver.wait()` call
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Getting started with Browserbase and Selenium in TypeScript
• Migrating existing Selenium scripts to the cloud
• Cloud browser automation without managing infrastructure
• Cross-browser testing with Selenium Grid compatibility

## NEXT STEPS

• Add AI extraction: swap in Stagehand for AI-powered `act()`, `extract()`, and `observe()`
• Enable proxies: pass `proxies: true` in `bb.sessions.create()` for residential proxy support
• Enable stealth mode: add `browserSettings: { advancedStealth: true, solveCaptchas: true }` to bypass bot detection
• Run in parallel: create multiple sessions for concurrent browser automation

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
