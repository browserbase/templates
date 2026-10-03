# Fetch API Shoe Data

## AT A GLANCE

- Goal: demonstrate scraping websites that block standard HTTP requests using Browserbase's Fetch API.
- No browser session needed — the Fetch API is a lightweight HTTP request routed through Browserbase's infrastructure.
- Faster and cheaper than spinning up a full browser session for server-rendered pages.
- Shows a side-by-side comparison: standard HTTP request (403 blocked, even with Chrome headers) vs Browserbase Fetch API (200 OK with full content).
  Docs → https://docs.browserbase.com/features/fetch

## GLOSSARY

- Fetch API: Browserbase's lightweight HTTP fetch — bypasses basic bot detection without spinning up a full browser session
  Docs → https://docs.browserbase.com/features/fetch
- Server-rendered page: a page where the HTML returned by the server already contains the content (no JavaScript needed)
- Bot detection: techniques websites use to block automated requests (IP reputation, TLS fingerprinting, header analysis)

## QUICKSTART

1. cd typescript/fetch-api-shoe-data
2. pnpm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env (no project ID needed for Fetch API)
5. pnpm start

## EXPECTED OUTPUT

- **Step 1**: Standard HTTP request with full Chrome headers — gets blocked with 403
- **Step 2**: Browserbase Fetch API returns 200 with full HTML, parses and displays 10 sneaker listings with name, price, and URL

## COMMON PITFALLS

- "Cannot find module": ensure all dependencies are installed (`pnpm install`)
- Missing credentials: verify .env contains BROWSERBASE_API_KEY
- 502 error: Browserbase Fetch API has a 1MB response limit — use a browser session for larger pages
- Empty results: the regex parser expects the current HTML structure — if the site changes their markup, update `parseSneakers()`
- JS-rendered pages: the Fetch API does not execute JavaScript — for SPAs, use a browser session instead

## USE CASES

- Scraping server-rendered pages that block all standard HTTP requests
- Lightweight price monitoring without the cost of a full browser session
- Quick data collection where JavaScript execution isn't needed
- Building data pipelines that need to bypass bot detection cheaply

## NEXT STEPS

- Swap the target URL for any server-rendered site that blocks standard requests
- Add proxy geolocation to access region-specific content
- Combine with a browser session fallback for pages that need JS (see smart-fetch-scraper template)

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
