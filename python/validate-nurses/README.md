# Stagehand + Browserbase: Nurse License Verification

## AT A GLANCE
- Goal: automate verification of nurse licenses by filling forms and extracting structured results from verification sites.
- Flow: loop through license records → navigate to verification site → fill form → search → extract verification results.
- Benefits: quickly verify multiple licenses without manual form filling, structured data ready for compliance tracking or HR systems.
  Docs → https://docs.stagehand.dev/basics/act

## GLOSSARY
- act: perform UI actions from a prompt (type, click, fill forms).
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from a page using AI and Pydantic schemas.
  Docs → https://docs.stagehand.dev/basics/extract
- schema: a Pydantic model that enforces data types, optional fields, and validation rules.
  Docs → https://docs.pydantic.dev/
- license verification: process of confirming the validity and status of professional licenses.

## QUICKSTART
 1) cd validate-nurses
 2) python -m venv venv
 3) source venv/bin/activate  # On Windows: venv\Scripts\activate
 4) pip install stagehand python-dotenv pydantic
 5) cp .env.example .env
 6) Add your Browserbase API key, Project ID, and OpenAI API key to .env
 7) python main.py

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Loops through license records in LICENSE_RECORDS array
- For each record: navigates to verification site, fills form, searches
- Extracts verification results: name, license number, status, info URL
- Displays structured JSON output with all verification results
- Provides live session URL for monitoring
- Closes session cleanly

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and OPENAI_API_KEY
- No results found: check if license numbers are valid or if verification site structure has changed
- Network issues: ensure internet access and verification sites are accessible
- Schema validation errors: ensure extracted data matches Pydantic schema structure
- Import errors: activate your virtual environment if you created one

## USE CASES
• HR compliance: Automate license verification for healthcare staff onboarding and annual reviews.
• Healthcare staffing: Verify credentials of temporary or contract nurses before assignment.
• Regulatory reporting: Collect license status data for compliance reporting and audits.

## NEXT STEPS
• Multi-site support: Add support for different license verification sites and adapt form filling logic.
• Batch processing: Load license records from CSV/Excel files for large-scale verification.
• Status monitoring: Set up scheduled runs to track license status changes and expiration dates.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com