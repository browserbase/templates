# Stagehand + Browserbase: Data Extraction with Structured Schemas

## AT A GLANCE
- Goal: show how to extract structured, validated data from websites using Stagehand + Zod.
- Data Extraction: automate navigation, form submission, and structured scraping in one flow.
- Schema Validation: enforce type safety and consistency with Zod schemas.
- Practical Example: verify California real estate license details with a typed output object.

## GLOSSARY
- act: perform UI actions from a prompt (type, click, navigate).
  Docs → https://docs.stagehand.dev/basics/act
- extract: pull structured data from web pages into validated objects.
  Docs → https://docs.stagehand.dev/basics/extract
- schema: a Zod definition that enforces data types, optional fields, and validation rules.
  Docs → https://zod.dev/
- form automation: filling and submitting inputs to trigger results before extraction.
- structured scraping: extracting consistent, typed data that can flow into apps, CRMs, or compliance systems.

## QUICKSTART
 1) pnpm init
 2) pnpm add @browserbasehq/stagehand dotenv @types/node zod
    pnpm add -D typescript && pnpm tsc --init
 3) Create .env with:
      BROWSERBASE_PROJECT_ID=...
      BROWSERBASE_API_KEY=...
 4) Compile + run:
      pnpm tsc && node product.js

## EXPECTED OUTPUT
- Navigates to California DRE license verification website
- Fills in license ID and submits form
- Extracts structured license data using Zod schema
- Returns typed object with license verification details

## COMMON PITFALLS
- "Cannot find module 'dotenv'": ensure pnpm install ran successfully
- Missing API key: verify .env is loaded and file is not committed
- Schema validation errors: ensure extracted data matches Zod schema structure
- Form submission failures: check if website structure has changed

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
📧 Need help?          support@browserbase.com
