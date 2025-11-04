# Stagehand + Browserbase: Data Extraction with Structured Schemas

## AT A GLANCE
- Goal: show how to extract structured, validated data from websites using Stagehand + Pydantic.
- Data Extraction: automate navigation, form submission, and structured scraping in one flow.
- Schema Validation: enforce type safety and consistency with Pydantic schemas.
- Practical Example: verify California real estate license details with a typed output object.

## GLOSSARY
- act: perform UI actions from a prompt (type, click, navigate).
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from web pages into validated objects.
  Docs → https://docs.stagehand.dev/basics/extract
- schema: a Pydantic definition that enforces data types, optional fields, and validation rules.
  Docs → https://docs.pydantic.dev/
- form automation: filling and submitting inputs to trigger results before extraction.
- structured scraping: extracting consistent, typed data that can flow into apps, CRMs, or compliance systems.

## QUICKSTART
 1) cd license-verification-template
 2) python -m venv venv
 3) source venv/bin/activate  # On Windows: venv\Scripts\activate
 4) pip install -r requirements.txt
 5) pip install pydantic
 6) cp .env.example .env
 7) Add your Browserbase API key and Project ID to .env
 8) python main.py

## EXPECTED OUTPUT
- Navigates to California DRE license verification website
- Fills in license ID and submits form
- Extracts structured license data using Pydantic schema
- Returns typed object with license verification details

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing API key: verify .env is loaded and file is not committed
- Schema validation errors: ensure extracted data matches Pydantic schema structure
- Form submission failures: check if website structure has changed
- Import errors: activate your virtual environment if you created one

## USE CASES
• License & credential verification: Extract and validate professional license data from regulatory portals.
• Compliance automation: Monitor status changes (active, expired, disciplinary) for risk and regulatory workflows.
• Structured research: Collect validated datasets from government or industry registries for BI or due diligence.

## NEXT STEPS
• Expand schema coverage: Add more fields (disciplinary actions, broker info, historical data) for richer records.
• Scale across sources: Point the same flow at other jurisdictions, databases, or professional directories.
• Persist & integrate: Store structured results in a database or push directly into CRM/compliance systems.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com
