# Stagehand + Browserbase: Download Apple's Quarterly Financial Statements

## AT A GLANCE
- Goal: automate downloading Apple's quarterly financial statements (PDFs) from their investor relations site.
- Download Handling: Browserbase automatically captures PDFs opened during the session and bundles them into a ZIP file.
- Retry Logic: polls Browserbase downloads API with configurable timeout to ensure files are ready before retrieval.
- Live Debugging: displays live view URL for real-time session monitoring.

## GLOSSARY
- act: perform UI actions from a prompt (click, scroll, navigate)
  Docs → https://docs.stagehand.dev/basics/act
- downloads API: retrieve files downloaded during a Browserbase session as a ZIP archive
  Docs → https://docs.browserbase.com/features/screenshots#pdfs
- live view: real-time browser debugging interface for monitoring automation
  Docs → https://docs.browserbase.com/features/session-live-view

## QUICKSTART
 1) cd download-financial-statements
 2) npm install
 3) cp .env.example .env
 4) Add your Browserbase API key and Project ID to .env
 5) npm start

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Navigates to Apple.com → Investors section
- Locates Q1-Q4 2025 quarterly earnings reports
- Clicks each Financial Statements PDF link (triggers downloads)
- Polls Browserbase API until downloads are ready
- Saves all PDFs as `downloaded_files.zip` in current directory
- Displays session history and closes cleanly

## COMMON PITFALLS
- "Cannot find module": ensure all dependencies are installed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Download timeout: increase `retryForSeconds` parameter if downloads take longer than 45 seconds
- Empty ZIP file: ensure PDFs were actually triggered (check live view link to debug)
- Network issues: check internet connection and Apple website accessibility

## USE CASES
• Financial reporting automation: Download quarterly/annual reports from investor relations sites for analysis, archiving, or compliance.
• Document batch retrieval: Collect multiple PDFs (contracts, invoices, statements) from web portals without manual clicking.
• Scheduled data collection: Run on cron/Lambda to automatically fetch latest financial filings or regulatory documents.

## NEXT STEPS
• Generalize for other sites: Extract URL patterns, adapt act() prompts, and support multiple companies/document types.
• Parse downloaded PDFs: Unzip, OCR/parse text (PyPDF2/pdfplumber), and load into structured format (CSV/DB/JSON).
• Add validation: Check file count, sizes, naming conventions; alert on failures; retry missing quarters.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com

