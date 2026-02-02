# Amazon Global Price Comparison

## AT A GLANCE

- Goal: compare Amazon product prices across multiple countries using geolocation proxies.
- Uses Browserbase's managed proxy infrastructure to route traffic through different geographic locations (US, UK, Germany, France, Italy, Spain).
- Extracts structured product data (name, price, rating, reviews) using Stagehand's extraction capabilities with Zod schema validation.
- Sequential processing shows how different proxy locations return different pricing from the same Amazon search.
- Docs → https://docs.browserbase.com/features/proxies

## GLOSSARY

- geolocation proxies: route traffic through specific geographic locations (city, country) to access location-specific content and pricing
  Docs → https://docs.browserbase.com/features/proxies#set-proxy-geolocation
- extract: extract structured data from web pages using natural language instructions and Zod schemas
  Docs → https://docs.stagehand.dev/basics/extract
- proxies: Browserbase's managed proxy infrastructure supporting 201+ countries for geolocation-based routing
  Docs → https://docs.browserbase.com/features/proxies

## QUICKSTART

1. cd amazon-global-price-comparison
2. pnpm install
3. cp .env.example .env
4. Add your Browserbase API key and Project ID to .env
5. pnpm start

## EXPECTED OUTPUT

- Creates Browserbase sessions with geolocation proxies for each country (US, UK, DE, FR, IT, ES)
- Navigates to Amazon search results through location-specific proxies
- Extracts product name, price, rating, and review count for each location
- Displays formatted comparison table showing price differences across countries
- Outputs JSON results for programmatic use

## COMMON PITFALLS

- Browserbase Developer plan or higher is required to use proxies
- "Cannot find module": ensure all dependencies are installed (`pnpm install`)
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Geolocation fields are case-insensitive (city, country can be any case)
- Amazon may show different products in different regions - comparison works best for globally available products
- ERR_TUNNEL_CONNECTION_FAILED: indicates either a temporary proxy hiccup or a site unsupported by built-in proxies

## USE CASES

• Price arbitrage: Find the best country to purchase products from for international shipping
• Market research: Compare pricing strategies across different Amazon regions
• Competitive analysis: Monitor how competitors price products globally
• Travel shopping: Check prices before international trips to plan purchases

## NEXT STEPS

• Add more countries: Extend the COUNTRIES array with additional regions (Japan, Australia, Canada, etc.)
• Currency conversion: Add real-time currency conversion to normalize prices for comparison
• Price tracking: Store results over time to track price changes across regions
• Email alerts: Send notifications when price drops below a threshold in any country

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
