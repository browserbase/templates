# Stagehand + Browserbase: Weather Proxy Demo

## AT A GLANCE

- Goal: demonstrate geolocation proxies by fetching location-specific weather data from multiple cities using Browserbase's proxy infrastructure.
- Uses geolocation proxies to route traffic through specific geographic locations (New York, London, Tokyo, São Paulo).
- Extracts structured weather data using Stagehand's extraction capabilities with Zod schema validation.
- Sequential processing shows how different proxy locations return different weather data from the same website.
- Docs → https://docs.browserbase.com/features/proxies

## GLOSSARY

- geolocation proxies: route traffic through specific geographic locations (city, country, state) to access location-specific content
  Docs → https://docs.browserbase.com/features/proxies#set-proxy-geolocation
- extract: extract structured data from web pages using natural language instructions and Zod schemas
  Docs → https://docs.stagehand.dev/basics/extract
- proxies: Browserbase's managed proxy infrastructure supporting 201+ countries for geolocation-based routing
  Docs → https://docs.browserbase.com/features/proxies

## QUICKSTART

1. cd proxies-weather-template
2. pnpm install
3. pnpm install @browserbasehq/sdk @browserbasehq/stagehand zod
4. cp .env.example .env
5. Add your Browserbase API key and Project ID to .env
6. pnpm start

## EXPECTED OUTPUT

- Creates Browserbase sessions with geolocation proxies for each location (New York, London, Tokyo, São Paulo)
- Displays session URLs for each location for monitoring
- Navigates to weather service (windy.com) through location-specific proxies
- Extracts temperature and unit for each location
- Displays formatted results showing different weather data based on proxy location
- Demonstrates how geolocation proxies enable location-specific content access

## COMMON PITFALLS

- Browserbase Developer plan or higher is required to use proxies
- "Cannot find module": ensure all dependencies are installed (@browserbasehq/sdk, @browserbasehq/stagehand, zod)
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Geolocation fields are case-insensitive (city, country, state can be any case)
- State is required for US locations to ensure accurate geolocation
- ERR_TUNNEL_CONNECTION_FAILED: indicates either a temporary proxy hiccup or a site unsupported by our built-in proxies

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
