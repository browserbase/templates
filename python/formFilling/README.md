# Stagehand + Browserbase: Form Filling Automation

## AT A GLANCE
- Goal: showcase how to automate form filling with Stagehand and Browserbase.
- Smart Form Automation: dynamically fill contact forms with variable-driven data.
- Field Detection: analyze page structure with `observe` before interacting with fields.
- AI-Powered Interaction: leverage Stagehand to map inputs to the right fields reliably.
  Docs → https://docs.browserbase.com/features/sessions

## GLOSSARY
- act: perform UI actions from a prompt (type, click, fill forms)
  Docs → https://docs.stagehand.dev/basics/act
- observe: analyze a page and return selectors or action plans before executing
  Docs → https://docs.stagehand.dev/basics/observe
- variable substitution: inject dynamic values into actions using `%variable%` syntax

## QUICKSTART
 1) Create virtual environment (optional but recommended):
      python -m venv venv
      source venv/bin/activate  # On Windows: venv\Scripts\activate
 2) Install dependencies:
      pip install stagehand python-dotenv
 3) Create .env with:
      BROWSERBASE_PROJECT_ID=...
      BROWSERBASE_API_KEY=...
      OPENAI_API_KEY=...
 4) Run:
      python index.py

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Navigates to contact form page
- Analyzes available form fields using observe
- Fills form with sample data using variable substitution
- Displays session recording link for monitoring
- Closes session cleanly

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains all required API keys
- Form detection: ensure target page has fillable form fields
- Variable mismatch: ensure variable names in action match variables object
- Network issues: check internet connection and website accessibility
- Import errors: activate your virtual environment if you created one

## USE CASES
• Lead & intake automation: Auto-fill contact/quote/request forms from CRM or CSV to speed up inbound/outbound workflows.
• QA & regression testing: Validate form fields, required rules, and error states across releases/environments.
• Bulk registrations & surveys: Programmatically complete repeatable sign-ups or survey passes for pilots and internal ops.

## NEXT STEPS
• Wire in data sources: Load variables from CSV/JSON/CRM, map fields via observe, and support per-site field aliases.
• Submit & verify: Enable submit, capture success toasts/emails, take screenshots, and retry on validation errors.
• Handle complex widgets: Add file uploads, multi-step flows, dropdown/radio/datepickers, and basic anti-bot tactics (delays/proxies).

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
📧 Need help?          support@browserbase.com
