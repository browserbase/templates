# Stagehand + Browserbase: Alaska Airlines Flight Search Automation

## AT A GLANCE
- Goal: demonstrate how to automate flight searches on Alaska Airlines using Stagehand.
- Navigation & Interaction: automate form filling, date selection, and search execution.
- Data Extraction: extract structured flight data including prices, times, and flight numbers.
- Practical Example: search for flights between cities and extract available flight options.

## GLOSSARY
- act: perform UI actions from a natural language prompt (type, click, navigate).
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from web pages into validated objects.
  Docs → https://docs.stagehand.dev/basics/extract
- schema: a Zod definition that enforces data types, optional fields, and validation rules.
  Docs → https://zod.dev/
- flight search automation: navigate airline websites, fill search forms, and extract flight data.
- structured data extraction: convert unstructured web content into typed, validated objects.

## QUICKSTART
1) cd searchAlaskaFlights
2) npm install
3) cp ../../.env.example .env (or create .env with BROWSERBASE_API_KEY)
4) Add your Browserbase API key to .env
5) npm start

## EXPECTED OUTPUT
- Navigates to Alaska Airlines website
- Fills in origin, destination, and date fields
- Executes flight search
- Extracts structured flight data including flight numbers, times, and prices
- Returns typed object with flight information

## COMMON PITFALLS
- "Cannot find module 'dotenv'": ensure npm install ran successfully
- Missing API key: verify .env is loaded and file is not committed
- Search results not found: check if flights are available for selected dates/routes
- Schema validation errors: ensure extracted data matches Zod schema structure
- Calendar date selection: date formats may vary; adjust date format strings if needed

## USE CASES
• Flight price monitoring: automate checking flight prices for specific routes over time.
• Travel planning: quickly compare available flights and schedules without manual browsing.
• Price tracking: extract prices to track changes and find best booking times.
• Multi-route searches: extend the flow to search multiple route combinations.

## NEXT STEPS
• Parameterize search inputs: make origin, destination, and dates configurable via CLI or environment variables.
• Multi-airline search: extend the flow to search across multiple airline websites in parallel.
• Price history tracking: persist extracted data over time to track price changes.
• Notification system: add logic to monitor specific price thresholds and send alerts.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
📧 Need help?          support@browserbase.com

