# Stagehand + Browserbase: Credit Karma with Caching & Variables

## AT A GLANCE

- Goal: Automate Credit Karma mortgage rate comparisons using caching and parameterized actions
- Cache DOM snapshots for 10x faster subsequent runs
- Parameterize form inputs with variables for flexible automation
- Get mortgage refinance rates programmatically
- Docs → https://docs.stagehand.dev | https://docs.browserbase.com

## GLOSSARY

- Caching: Stagehand stores DOM snapshots in a local cache directory to dramatically speed up repeat automations
  Docs → https://docs.stagehand.dev/v3/best-practices/caching
- Variables: Parameterize your `act()` instructions with `%variableName%` syntax to make automations reusable and dynamic
  Docs → https://docs.stagehand.dev/v3/basics/act
- act: Stagehand's natural language instruction method that performs UI actions (clicking, typing, selecting) without selectors
  Docs → https://docs.stagehand.dev/v3/basics/act
- Browserbase: Cloud browser infrastructure for reliable, scalable web automation with stealth mode and CAPTCHA solving
  Docs → https://docs.browserbase.com

## QUICKSTART

1. cd typescript/credit-karma-cache
2. npm install
3. cp .env.example .env # Add your Browserbase API key and Project ID to .env
4. npm run start

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Displays live session link for monitoring
- Navigates to Credit Karma mortgage rates page
- Selects Refinance tab
- Fills in credit score, ZIP code, loan balance, home value, and cash-out amount
- Clicks 'Get my rates' button
- Extracts and displays mortgage rate offers
- Closes session cleanly

On subsequent runs: The automation runs ~10x faster thanks to caching! Stagehand reuses DOM snapshots instead of re-analyzing every page element.

## COMMON PITFALLS

- "Cannot find module": ensure all dependencies are installed via npm install
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Cache directory conflicts: if running multiple automations simultaneously, use different cacheDir values
- Stale cache issues: if Credit Karma's UI changes significantly, delete the cache directory to regenerate fresh snapshots
- Rate limiting: Credit Karma may rate-limit requests; use Browserbase's stealth mode or add delays between runs

Find more information on your Browserbase dashboard → https://browserbase.com/sessions

## USE CASES

- Mortgage shopping automation: Compare refinance rates across different credit scores and loan amounts without manual data entry
- Financial data aggregation: Scrape mortgage rates for market analysis, customer comparison tools, or personal finance apps
- Testing and QA: Validate Credit Karma's UI flows and form handling across different user scenarios
- Personal finance tracking: Monitor how rate changes affect your specific refinance scenario over time
- Lead generation tools: Pre-qualify mortgage leads by automating rate checks based on customer-provided information

## NEXT STEPS

- Extract rate data: Use Stagehand's `extract()` method to scrape the mortgage rates table and return structured JSON data
- Loop through scenarios: Iterate through multiple USER_CONFIG objects to compare rates across different credit scores or ZIP codes
- Add error recovery: Implement retry logic with exponential backoff for network failures or CAPTCHA challenges
- Schedule regular runs: Set up a cron job or GitHub Action to track rate changes daily/weekly
- Integrate with databases: Store extracted rates in PostgreSQL, MongoDB, or Airtable for historical tracking
- Enable proxies: Set `proxies: true` in browserbaseSessionCreateParams to rotate IPs and avoid rate limiting

## HELPFUL RESOURCES

- Stagehand Docs: https://docs.stagehand.dev
- Browserbase Docs: https://docs.browserbase.com
- Caching Guide: https://docs.stagehand.dev/v3/best-practices/caching
- act() with Variables: https://docs.stagehand.dev/v3/basics/act
- Browserbase Dashboard: https://browserbase.com/dashboard
- Browserbase Playground: https://www.browserbase.com/playground
- Try it out: https://www.creditkarma.com/home-loans/mortgage-rates
