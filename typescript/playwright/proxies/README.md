# Browserbase Proxy Testing with Playwright

## AT A GLANCE

- Goal: demonstrate different proxy configurations with Browserbase sessions using pure Playwright (no Stagehand).

## GLOSSARY

- Proxies: Browserbase's default proxy rotation for enhanced privacy
  Docs → https://docs.browserbase.com/features/proxies

## QUICKSTART

1. `cd typescript/playwright/proxies` then `pnpm install` (or `npm install`)
2. Add `.env` in `typescript/` with `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` (script loads `../../.env` from this folder)
3. `pnpm start` (or `npx tsx index.ts`)

## EXPECTED OUTPUT

- Tests built-in proxy rotation
- Tests geolocation-specific proxies (New York)
- Tests custom external proxies (commented out by default; requires `CUSTOM_PROXY_SERVER`, `CUSTOM_PROXY_USERNAME`, `CUSTOM_PROXY_PASSWORD`)
- Displays IP information and geolocation data for each test
- Shows how different proxy configurations affect your apparent location

## COMMON PITFALLS

- Browserbase Developer plan or higher is required to use proxies
- "Cannot find module": ensure all dependencies are installed at project root (`@browserbasehq/sdk`, `playwright-core`, `dotenv`)
- Missing credentials: verify `.env` contains `BROWSERBASE_PROJECT_ID` and `BROWSERBASE_API_KEY`
- Custom proxy errors: verify external proxy server credentials and availability

## USE CASES

• Geo-testing: Verify location-specific content, pricing, or compliance banners.
• Scraping at scale: Rotate IPs to reduce blocks and increase CAPTCHA success rates.
• Custom routing: Mix built-in and external proxies, or apply domain-based rules for compliance.

## NEXT STEPS

• Add routing rules: Configure domainPattern to direct specific sites through targeted proxies.
• Test multiple geos: Compare responses from different cities/countries and log differences.
• Improve reliability: Add retries and fallbacks to handle proxy errors like ERR_TUNNEL_CONNECTION_FAILED.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
📚 Playwright Docs: https://playwright.dev/python/docs/intro
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
