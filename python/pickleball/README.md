# Stagehand + Browserbase: AI-Powered Court Booking Automation

## AT A GLANCE
- Goal: automate tennis and pickleball court bookings in San Francisco Recreation & Parks system.
- AI Integration: Stagehand for UI interaction and data extraction.
- Browser Automation: automates login, filtering, court selection, and booking confirmation.
- User Interaction: prompts for activity type, date, and time preferences with validation.
  Docs → https://docs.browserbase.com/features/sessions

## GLOSSARY
- act: perform UI actions from a prompt (click, type, select)
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from pages using schemas
  Docs → https://docs.stagehand.dev/basics/extract
- observe: plan actions and get selectors before executing
  Docs → https://docs.stagehand.dev/basics/observe
- browser automation: automated interaction with web applications for booking systems
  Docs → https://docs.browserbase.com/features/sessions
- form validation: ensure user input meets booking system requirements

## QUICKSTART
1) Create an account with SF Recreation & Parks website -> https://www.rec.us/organizations/san-francisco-rec-park
2) Create virtual environment (optional but recommended):
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
3) Install dependencies:
   pip install stagehand python-dotenv InquirerPy pydantic
4) Create .env with:
   BROWSERBASE_PROJECT_ID=...
   BROWSERBASE_API_KEY=...
   SF_REC_PARK_EMAIL=...
   SF_REC_PARK_PASSWORD=...
5) Run:
   python index.py

## EXPECTED OUTPUT
- Prompts user for activity type (Tennis/Pickleball), date, and time
- Automates login to SF Recreation & Parks booking system
- Filters courts by activity, date, and time preferences
- Extracts available court information and displays options
- Automates court booking with verification code handling
- Confirms successful booking with details

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains all required API keys and SF Rec Park login
- Login failures: check SF Rec Park credentials and account status
- Booking errors: verify court availability and booking system accessibility
- Verification codes: ensure you can receive SMS/email codes for booking confirmation
- Import errors: activate your virtual environment if you created one

## FURTHER USE CASES
• Court Booking: Automate tennis and pickleball court reservations in San Francisco
• Recreation & ticketing: courts, parks, events, museum passes, campsite reservations
• Appointments & scheduling: DMV, healthcare visits, test centers, field service dispatch
• Permits & licensing: business licenses, parking permits, construction approvals, hunting/fishing tags
• Procurement portals: reserve inventory, request quotes, confirm orders
• Travel & logistics: dock door scheduling, freight pickups, crew shifts, equipment rentals
• Education & training: lab reservations, proctored exam slots, workshop sign-ups
• Internal admin portals: hardware checkout, conference-room overflow, cafeteria or shift scheduling

## NEXT STEPS
• Swap the target site: point the script at a different booking or reservation portal (e.g., gyms, coworking, campsites)
• Generalize filters: extend date/time/activity prompts to handle more categories or custom filters
• Automate recurring bookings: wrap the script in a scheduler (cron/queue) to secure slots automatically
• Add notifications: send booking confirmations to Slack, email, or SMS once a reservation succeeds
• Handle multi-user accounts: support multiple credentials so a team can share automation
• Export structured results: save court/slot data as JSON, CSV, or push to a database for reporting
• Integrate with APIs: connect confirmed reservations to a calendar system (Google Calendar, Outlook)
• Enhance verification flow: add support for automatically fetching OTP codes from email/SMS inboxes
• Improve resilience: add retries, backoff, and selector caching to handle UI changes gracefully
• Template it: strip out "pickleball" wording and reuse as a boilerplate for any authenticate → filter → extract → book workflow

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
🏓 SF Rec & Parks:     https://www.rec.us/organizations/san-francisco-rec-park
📧 Need help?          support@browserbase.com
