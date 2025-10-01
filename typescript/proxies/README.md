# Browserbase Proxy Testing Script

## AT A GLANCE
- Goal: demonstrate different proxy configurations with Browserbase sessions.

## GLOSSARY
- Proxies: Browserbase's default proxy rotation for enhanced privacy
  Docs → https://docs.browserbase.com/features/proxies

## QUICKSTART
 1) pnpm init
 2) pnpm add @browserbasehq/sdk playwright-core dotenv
    pnpm add -D typescript tsx && pnpm tsc --init
 3) Create .env with:
      BROWSERBASE_PROJECT_ID=...
      BROWSERBASE_API_KEY=...
 4) Run the script:
      pnpm run proxies

## EXPECTED OUTPUT
- Tests built-in proxy rotation
- Tests geolocation-specific proxies (New York)
- Tests custom external proxies (commented out by default)
- Displays IP information and geolocation data for each test
- Shows how different proxy configurations affect your apparent location

## COMMON PITFALLS
- Browserbase Developer plan or higher is required to use proxies
- "Cannot find module": ensure all dependencies are installed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
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
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
📧 Need help?          support@browserbase.com
