# Stagehand + Browserbase: Company Address Finder

## AT A GLANCE
- Goal: Automate discovery of company legal information and physical addresses from Terms of Service and Privacy Policy pages.
- CUA Agent: Uses autonomous computer-use agent to search for company homepages via Google and navigate to legal documents.
- Data Extraction: Extracts structured data including homepage URLs, ToS/Privacy Policy links, and physical mailing addresses.
- Fallback Strategy: Intelligently falls back from Terms of Service to Privacy Policy if address is not found.
- Retry Logic: Built-in exponential backoff for reliability against network failures.
- Scalable: Supports both sequential and concurrent processing (concurrent requires Startup/Developer plan or higher).

## GLOSSARY
- agent: autonomous AI agent with computer-use capabilities that can navigate websites like a human
  Docs → https://docs.stagehand.dev/basics/agent
- extract: pull structured data from web pages using natural language instructions and Zod schemas
  Docs → https://docs.stagehand.dev/basics/extract
- CUA (Computer Use Agent): agent mode that enables full browser interaction (search, click, scroll, type)
  Docs → https://docs.stagehand.dev/basics/agent#what-is-cua-mode
- concurrent sessions: run multiple browser sessions simultaneously for faster batch processing
  Docs → https://docs.browserbase.com/guides/concurrency-rate-limits
- exponential backoff: retry strategy that increases wait time between attempts for reliability

## QUICKSTART
1) cd company-address-finder
2) npm install
3) cp .env.example .env
4) Add your Browserbase API key, Project ID, and Google Generative AI API key to .env
5) Edit COMPANY_NAMES array in index.ts to specify which companies to process
6) npm start

## EXPECTED OUTPUT
- Initializes browser session for each company with live view link
- Agent navigates to Google and searches for company homepage
- Extracts Terms of Service and Privacy Policy links from homepage
- Navigates to Terms of Service and extracts physical address
- Falls back to Privacy Policy if address not found in ToS
- Outputs comprehensive JSON with all extracted data for each company
- Displays processing status and session closure for each company

## COMMON PITFALLS
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_GENERATIVE_AI_API_KEY
- Google API access: ensure you have access to google/gemini-2.5-computer-use-preview-10-2025 model
- Concurrent processing: MAX_CONCURRENT > 1 requires Browserbase Startup or Developer plan or higher (default is 1 for sequential)
- Company not found: agent may fail if company name is ambiguous or doesn't have a clear web presence
- Address extraction: some companies may not list physical addresses in their legal documents
- Session timeouts: long-running batches may hit 900s timeout (adjust browserbaseSessionCreateParams if needed)

## USE CASES
• Legal compliance research: Collect company addresses and legal document URLs for due diligence, vendor verification, or compliance audits.
• Business intelligence: Build datasets of company locations and legal information for market research or competitive analysis.
• Contact data enrichment: Augment CRM or database records with verified physical addresses extracted from official company documents.
• Multi-company batch processing: Process lists of companies (investors, partners, clients) to gather standardized location data at scale.

## NEXT STEPS
• Parameterize inputs: Accept company names from CSV files, command-line arguments, or API endpoints for dynamic batch processing.
• Expand extraction: Add support for additional fields like contact emails, phone numbers, business registration numbers, or founding dates.
• Multi-source validation: Cross-reference addresses from multiple pages (About, Contact, Footer) to improve accuracy and confidence.
• Export formats: Add CSV, Excel, or database export options with configurable field mappings for downstream integrations.
• Error handling: Implement more granular error categorization (not found vs. no address vs. extraction failure) for better reporting.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com

