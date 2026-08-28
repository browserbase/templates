# Stagehand + Browserbase: AI-Powered Date Planner (TypeScript)

## AT A GLANCE
- Goal: Find personalized restaurant recommendations and plan the perfect date using AI-powered search and scoring.
- AI Integration: Uses OpenAI to generate search queries and score restaurants based on user preferences.
- Web-Wide Search: Searches Google to find restaurants across multiple platforms (OpenTable, Yelp, Resy, restaurant websites, etc.).
- Click-Through Verification: Visits restaurant pages directly to verify details, check availability, and extract comprehensive information.
- Concurrent Sessions: Runs multiple browser sessions simultaneously to search different queries in parallel.

## GLOSSARY
- act: perform UI actions from a prompt (search, click, type)
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from pages using schemas
  Docs → https://docs.stagehand.dev/basics/extract
- concurrent sessions: run multiple browser sessions simultaneously for faster searching
  Docs → https://docs.browserbase.com/guides/concurrency-rate-limits

## QUICKSTART
1) cd typescript/date-planner
2) npm install
3) cp .env.example .env
4) Add your Browserbase API key, Project ID, and OpenAI API key to .env
5) npm run dev

## EXPECTED OUTPUT
- Prompts user for date preferences, cuisine, location, budget, and special requirements
- Generates search queries using OpenAI based on user input
- Runs concurrent browser sessions to search the web via Google
- Extracts restaurant links from search results across multiple platforms
- Clicks through to restaurant pages to verify details (rating, price, cuisine, hours, contact info, reservations)
- Extracts comprehensive restaurant information from individual pages
- AI-scores restaurants based on user preferences (only recommends restaurants scoring 5/10 or higher that match cuisine)
- Displays verified restaurant details including address, phone, hours, and reservation availability
- Suggests nearby activities to extend the date
- Displays comprehensive date plan with primary restaurant, backups, and activities

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via npm
- Missing credentials: verify .env contains all required API keys
- Search failures: check internet connection and website accessibility
- Import errors: ensure TypeScript is properly configured
- Reservation failures: some restaurants may require manual booking

## USE CASES
• Date planning: Find restaurants based on preferences, check availability, and suggest activities
• Restaurant discovery: AI-powered search across multiple platforms with intelligent scoring
• Event planning: Extend functionality for group dining, special occasions, and venue booking
• Travel planning: Adapt for finding restaurants in different cities with local recommendations

## NEXT STEPS
• Add more restaurant platforms: Integrate with Resy, SevenRooms, and local booking sites
• Enhanced AI scoring: Include factors like ambiance, dietary restrictions, and seasonal menus
• Activity integration: Connect with event APIs, movie times, and local attractions
• Calendar integration: Sync with user calendars and send reminders

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com
