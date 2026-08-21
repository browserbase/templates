# Stagehand + Browserbase: Nurse License Verification

## AT A GLANCE

- Goal: automate verification of nurse licenses by filling forms and extracting structured results from verification sites.
- Flow: loop through license records → navigate to verification site → fill form → search → extract verification results.
- Benefits: quickly verify multiple licenses without manual form filling, structured data ready for compliance tracking or HR systems.
  Docs → https://docs.stagehand.dev/v4/basics/act

## GLOSSARY

- act: perform UI actions from a prompt (type, click, fill forms).
  Docs → https://docs.stagehand.dev/v4/basics/act
- extract: pull structured data from a page using AI and Zod schemas.
  Docs → https://docs.stagehand.dev/v4/basics/extract
- schema: a Zod definition that enforces data types, optional fields, and validation rules.
  Docs → https://zod.dev/
- license verification: process of confirming the validity and status of professional licenses.

## QUICKSTART

1. cd nurse-verification
2. npm install
3. cp .env.example .env
4. Add your Browserbase API key to .env
5. npm start

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Loops through license records in LicenseRecords array
- For each record: navigates to verification site, fills form, searches
- Extracts verification results: name, license number, status, info URL
- Displays structured JSON output with all verification results
- Closes both the Stagehand instance and browser handle after verification
- Closes session cleanly

## COMMON PITFALLS

- "Cannot find module 'dotenv'": ensure npm install ran successfully
- Missing credentials: verify .env contains BROWSERBASE_API_KEY
- No results found: check if license numbers are valid or if verification site structure has changed
- Network issues: ensure internet access and verification sites are accessible
- Schema validation errors: ensure extracted data matches Zod schema structure

## USE CASES

• HR compliance: Automate license verification for healthcare staff onboarding and annual reviews.
• Healthcare staffing: Verify credentials of temporary or contract nurses before assignment.
• Regulatory reporting: Collect license status data for compliance reporting and audits.

## NEXT STEPS

• Multi-site support: Add support for different license verification sites and adapt form filling logic.
• Batch processing: Load license records from CSV/Excel files for large-scale verification.
• Status monitoring: Set up scheduled runs to track license status changes and expiration dates.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v4/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
