# Stagehand + Browserbase + Extend: Download Expense Receipts and Parse with Extend AI

Stagehand is the SDK for browser agents.

## AT A GLANCE

- **Goal**: Automate downloading receipts from an expense portal and extract structured receipt data using AI-powered document parsing.
- **Pattern Template**: Demonstrates the integration pattern of Browserbase (browser automation + download capture) + Extend AI (schema-based document extraction) in Go.
- **Workflow**: Stagehand navigates the expense portal and clicks each receipt's download link; Browserbase captures downloads. The program polls the Browserbase Downloads API for the session's files, saves them locally, then optionally sends them to Extend for structured extraction (vendor, date, totals, line items, etc.).
- **Download Handling**: Implements retry/polling around Browserbase's Downloads API until the expected files have synced.
- **Structured Extraction**: Extend AI extraction with a typed inline config built from the Extend Go SDK; results written to `output/results/receipts.json` and `receipts.csv`.
- Docs → [Browserbase Downloads](https://docs.browserbase.com/features/downloads) | [Extend AI](https://docs.extend.ai)

## GLOSSARY

- **Act**: perform UI actions from natural language prompts or observed actions (click, scroll, navigate)
  Docs → https://docs.stagehand.dev/v4/basics/act
- **Observe**: find and return interactive elements on the page matching a description, without performing actions. Used here to locate all individual download buttons before clicking them.
  Docs → https://docs.stagehand.dev/v4/basics/observe
- **Browserbase Downloads**: When files are downloaded during a browser session, Browserbase captures and stores them. Files are listed and retrieved individually via the Downloads REST API.
  Docs → https://docs.browserbase.com/features/downloads
- **Extend AI extraction**: A configurable document extraction pipeline that parses files against a JSON schema and returns structured data. Config can be passed inline or via a saved extractor resource.
  Docs → https://docs.extend.ai/extraction/overview
- **Download polling**: Browserbase syncs downloads in real time; the program retries every 2 seconds until the files are available or a timeout is reached.

## QUICKSTART

1. Install Go 1.26 or newer (`go version`).
2. `cd go/extend-browserbase`
3. Set the required API keys in your environment:
   - `export BROWSERBASE_API_KEY=your_browserbase_api_key`
   - `export EXTEND_API_KEY=your_extend_api_key` (optional — enables receipt parsing)
4. `go mod download`
5. `go run .`

## EXPECTED OUTPUT

- Launches a Browserbase browser and attaches Stagehand V4; Live View remains available in the Sessions dashboard
- Navigates to the expense portal and finds all per-receipt download links via Observe
- Clicks each download link; Browserbase captures files
- After closing the session, polls the Downloads API and saves each file to `output/documents/`
- If `EXTEND_API_KEY` is set: uploads each file to Extend and runs extraction with the inline config, writes `output/results/receipts.json` and `receipts.csv`
- Closes Stagehand and the browser cleanly

## COMMON PITFALLS

- Missing Go installation: ensure Go 1.26+ is installed
- Module not found: run `go mod download` if dependencies are not resolved
- Missing credentials: verify `BROWSERBASE_API_KEY` is set in your environment
- Download timeout: increase `downloadTimeout` if downloads take longer than 60 seconds
- No downloads found: ensure the download clicks actually triggered (inspect the session in the Browserbase dashboard)
- Rate limiting on Extend: the Extend SDK retries 429 and 5xx responses with exponential backoff (`option.WithMaxAttempts`), but very large batches may need `extractBatchSize` reduced from 9
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

• Expense automation: Download receipts from expense portals and extract vendor, date, totals, and line items for accounting systems.
• Document batch processing: Collect files from web portals and run structured extraction across all of them with a single program.
• Receipt digitization: Convert paper/PDF receipts into structured JSON and CSV for import into ERP, bookkeeping, or reimbursement tools.

## NEXT STEPS

• Parameterize the portal URL: Accept the expense portal URL from an env var or flag to support different receipt sources.
• Custom schemas: Modify `receiptExtractionConfig` to extract different document types (invoices, W-2s, contracts) by changing the JSON schema.
• Add validation: Compare extracted totals against line item sums to flag discrepancies or incomplete extractions.
• Production extraction: Swap the synchronous `client.Extract` call for `client.ExtractRuns.Create` with polling or webhooks for long-running documents.
• Scheduled runs: Deploy on cron/Lambda to periodically check for new receipts and process them automatically.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v4/first-steps/introduction
📚 Browserbase Downloads: https://docs.browserbase.com/features/downloads
📚 Extend AI: https://docs.extend.ai
📚 Extend Go SDK: https://github.com/extend-hq/extend-go-sdk
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
