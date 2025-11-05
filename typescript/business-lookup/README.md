# Stagehand + Browserbase: Business Lookup with Agent

## AT A GLANCE
- Goal: Automate business registry searches using an autonomous AI agent with computer-use capabilities.
- Uses Stagehand Agent in CUA mode to navigate complex UI elements, apply filters, and extract structured business data.
- Demonstrates extraction with Zod schema validation for consistent data retrieval.
- Docs → https://docs.stagehand.dev/basics/agent

## GLOSSARY
- agent: create an autonomous AI agent that can execute complex multi-step tasks
  Docs → https://docs.stagehand.dev/basics/agent#what-is-agent
- extract: extract structured data from web pages using natural language instructions
  Docs → https://docs.stagehand.dev/basics/extract

## QUICKSTART
1) npm install
2) cp .env.example .env
3) Add required API keys/IDs to .env
4) npm start

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Displays live session link for monitoring
- Navigates to SF Business Registry search page
- Agent searches for business using DBA Name filter
- Agent completes search and opens business details
- Extracts structured business information (DBA Name, Account Number, NAICS Code, etc.)
- Outputs extracted data as JSON
- Closes session cleanly

## COMMON PITFALLS
- Dependency install errors: ensure npm install completed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY
- Google API access: ensure you have access to Google's gemini-2.5-computer-use-preview-10-2025 model
- Agent failures: check that the business name exists in the registry and that maxSteps is sufficient for complex searches
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES
• Business verification: Automate registration status checks, license validation, and compliance verification for multiple businesses.
• Data enrichment: Collect structured business metadata (NAICS codes, addresses, ownership) for research or CRM updates.
• Due diligence: Streamline background checks by autonomously searching and extracting business registration details from public registries.

## NEXT STEPS
• Parameterize search: Accept business names as command-line arguments or from a CSV file for batch processing.
• Expand extraction: Add support for additional fields like tax status, licenses, or historical registration changes.
• Multi-registry support: Extend agent to search across multiple city or state business registries with routing logic.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction 
🎮 Browserbase:        https://www.browserbase.com
💡 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com
