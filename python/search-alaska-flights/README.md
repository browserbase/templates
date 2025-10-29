# Stagehand + Browserbase: Alaska Airlines Flight Search

## AT A GLANCE
- Goal: automate flight search on Alaska Airlines website and extract structured flight data for analysis or booking.
- Flow: navigate to alaskaair.com → fill search form (origin, destination, dates) → search → extract flight data (number, times, price).
- Benefits: quickly search multiple routes/dates without manual form filling, structured data ready for price comparison or booking automation.
  Docs → https://docs.browserbase.com/stagehand

## GLOSSARY
- act: perform UI actions from a prompt (type, click, select dates).
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from a page using AI and Pydantic schemas.
  Docs → https://docs.stagehand.dev/basics/extract
- calendar widget: interactive date picker component for selecting departure/return dates.

## QUICKSTART
 1) cd search-alaska-flights
 2) python -m venv venv
 3) source venv/bin/activate  # On Windows: venv\Scripts\activate
 4) pip install stagehand python-dotenv pydantic
 5) cp .env.example .env
 6) Add your Browserbase API key, Project ID, and OpenAI API key to .env
 7) python main.py

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Navigates to Alaska Airlines booking page
- Fills flight search form: SFO → LAX, dates 02/01/2025 - 02/08/2025
- Clicks search button and waits for results
- Extracts flight data: flight numbers, departure/arrival times, prices
- Displays structured JSON output with all available flights
- Provides live session URL for monitoring
- Closes session cleanly

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and OPENAI_API_KEY
- No flights found: check if dates are valid or if route has available flights
- Calendar issues: ensure date format matches site expectations (MM/DD/YYYY)
- Network issues: ensure internet access and alaskaair.com is accessible
- Import errors: activate your virtual environment if you created one

## USE CASES
• Travel planning: Search multiple routes and dates to find optimal flight options and pricing.
• Price monitoring: Track flight prices over time to identify booking opportunities or price trends.
• Corporate travel: Automate flight searches for business travel planning and expense management.

## NEXT STEPS
• Multi-route search: Loop through multiple origin/destination pairs to compare options.
• Date range scanning: Search multiple date combinations to find cheapest travel windows.
• Booking integration: Extend to complete the booking process after finding preferred flights.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://github.com/browserbase/stagehand/tree/main/examples
📧 Need help?          support@browserbase.com

