# Stagehand + Browserbase: Company Address Finder

## AT A GLANCE
- Goal: automatically find and extract physical mailing addresses from company Terms of Service and Privacy Policy pages.
- CUA Navigation: uses Computer Use Agent to autonomously search Google and navigate to company homepages.
- Structured Extraction: extracts legal links and addresses using Stagehand extract() with Zod schemas.
- Concurrent Processing: supports batch operations for multiple companies (requires Startup or Developer plan).
  Docs → https://docs.stagehand.dev/stagehand/agents/computer-use-agent

## GLOSSARY
- CUA (Computer Use Agent): autonomous agent that can navigate web pages, click elements, and perform actions without explicit step-by-step instructions
  Docs → https://docs.stagehand.dev/stagehand/agents/computer-use-agent
- structured extraction: uses Stagehand extract() with Zod schemas to pull specific data fields from web pages
  Docs → https://docs.stagehand.dev/stagehand/extraction

## QUICKSTART
 1) npm install
 2) cp .env.example .env
 3) Add your Browserbase API key, Project ID, and Google Generative AI API key to .env
 4) npm start

## EXPECTED OUTPUT
- Initializes Browserbase session and displays live session link for monitoring
- Navigates to Google, then uses CUA agent to search and navigate to company homepage
- Extracts Terms of Service and Privacy Policy links from homepage using parallel extraction
- Navigates to Terms of Service page and extracts physical mailing address
- Falls back to Privacy Policy page if address not found in Terms of Service
- Closes browser session and outputs final JSON results with company name, homepage URL, legal links, and extracted address

## COMMON PITFALLS
- "Cannot find module": ensure all dependencies are installed via npm install
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_GENERATIVE_AI_API_KEY
- Access limitations: concurrent processing (MAX_CONCURRENT > 1) requires Startup or Developer plan or higher; sequential processing works on all plans
- CUA model access: ensure GOOGLE_GENERATIVE_AI_API_KEY has access to google/gemini-2.5-computer-use-preview-10-2025 model

## USE CASES

• Compliance audits: batch collect physical addresses from multiple companies' legal pages for regulatory documentation

• Lead enrichment: automate address discovery for companies in your CRM or prospect list

• Legal research: quickly gather contact information for legal notices or service of process requirements

## NEXT STEPS

• Add address validation and normalization using a geocoding API to standardize formats across results

• Extend extraction to capture additional legal metadata like incorporation state, registered agent, or business entity type

• Implement result caching to avoid re-processing companies when addresses haven't changed

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
💡 Templates:          https://github.com/browserbase/stagehand/tree/main/examples
📧 Need help?          support@browserbase.com

