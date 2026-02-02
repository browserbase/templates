# Stagehand + Browserbase: Amazon Product Scraping

## AT A GLANCE

- Goal: scrape the first 3 Amazon search results for a given query and return structured product data.
- AI-Powered Search: uses Stagehand `act` to type in the search bar and click search (or optionally navigate directly to the search URL).
- Structured Extraction: uses `extract` with a Zod schema to get product name, price, rating, review count, and product URL.
- Model: uses `google/gemini-2.5-flash` for fast, cost-effective automation.
  Docs → https://docs.stagehand.dev

## GLOSSARY

- act: perform UI actions from a prompt (type in search bar, click search)
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from pages using schemas
  Docs → https://docs.stagehand.dev/basics/extract

## QUICKSTART

1. cd typescript/amazon-product-scraping
2. npm install
3. cp .env.example .env (or create .env with required keys)
4. Add BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY to .env
5. Optionally edit SEARCH_QUERY in index.ts
6. npm start

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Displays live session link for monitoring
- Navigates to Amazon and performs search (or direct URL navigation if uncommented)
- Extracts the first 3 products with name, price, rating, reviews count, and product URL
- Outputs JSON to console
- Closes session cleanly

## COMMON PITFALLS

- "Cannot find module": ensure npm install completed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY
- Google API access: ensure you have access to the gemini-2.5-flash model
- Amazon layout changes: extraction may need prompt/schema updates if Amazon changes their search results UI
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

• Price monitoring: Scrape top results for a product query to track prices and availability over time.
• Competitor research: Extract product titles, ratings, and review counts for comparison.
• Catalog building: Pull structured product data for feeds, dashboards, or internal tools.

## NEXT STEPS

• Switch to direct URL: Uncomment the URL-based search block in index.ts for faster runs without LLM search actions.
• Parameterize query: Accept SEARCH_QUERY from CLI or env for different products without editing code.
• Paginate: Extend extraction to multiple pages or increase the number of products per run.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
