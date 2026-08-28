# Stagehand + Browserbase: Human-in-the-Loop Approval

## AT A GLANCE

- Goal: demonstrate how to pause an automated browser workflow at a decision point, give a human visibility via the live Browserbase session URL, and resume or abort based on their approve/reject input.
- Flow: navigate to a book product page → extract title/price/rating via Stagehand → evaluate configurable purchase rules → PAUSE if rules triggered → human types "approve" or "reject" in terminal → proceed with Add to basket or abort gracefully.

## GLOSSARY

- human-in-the-loop: a workflow design pattern where automation pauses at a critical decision point and waits for a human to review and approve or reject before continuing.
- decision gate: the specific point in the workflow where execution is suspended until a human provides input.
- approval timeout: a safety mechanism that auto-rejects if no human response is received within the configured time limit (default: 2 minutes).
- books.toscrape.com: a public practice site designed for scraping exercises — no credentials, no rate limits, safe for demos.

## QUICKSTART

1. cd typescript/human-in-the-loop
2. pnpm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and OPENAI_API_KEY to .env
5. pnpm start

## EXPECTED OUTPUT

- Navigates to a book product page on books.toscrape.com
- Extracts title, price, rating, and availability using Stagehand
- Evaluates configurable purchase rules (price > £20 or rating < 3 stars)
- Because the default book costs £51.77, the price rule triggers and prints a PAUSED banner with the live Browserbase session URL and extracted product data
- Waits for you to type "approve" or "reject" in the terminal (2-minute timeout)
- APPROVE: clicks "Add to basket" and confirms success
- REJECT: aborts gracefully with a message
- Closes the browser session cleanly

## COMMON PITFALLS

- "Cannot find module 'dotenv'": run pnpm install before pnpm start
- Missing credentials: verify .env contains BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and OPENAI_API_KEY
- Approval timeout: you have 2 minutes to respond after the PAUSED banner appears; increase APPROVAL_TIMEOUT_MS in the config block at the top of index.ts if needed
- Book URL changed: books.toscrape.com is a static practice site, but if the specific URL breaks, update BOOK_URL in the config block to any other product page on the site
- Testing the auto-approve path: set PRICE_THRESHOLD to 100 in the config block — the book at £51.77 will no longer trigger the rule and the workflow will auto-approve without pausing

## USE CASES

- Purchase approval: pause before completing a transaction above a dollar threshold, requiring a manager sign-off before the bot proceeds.
- Content moderation: pause before posting or publishing content flagged by automated rules, routing it to a human reviewer.
- Data pipeline review: pause an automated data entry workflow when an extracted value looks anomalous, letting a human verify before the record is committed.
- Compliance gates: pause before submitting forms on regulated platforms, ensuring a human has reviewed the data before the bot clicks Submit.

## NEXT STEPS

- Replace stdin with a webhook: instead of terminal input, send the decision payload to an HTTP endpoint (Slack, email, or a custom review UI) and poll for the response.
- Structured decisions: extend the input schema to accept "approve", "reject", or "modify:<new_value>" to allow humans to correct extracted data before resuming.
- Logging: record every pause event (session ID, extracted data, decision, timestamp) to a database for auditing.
- Parallel workflows: run multiple product checks concurrently and fan out approval requests, collecting decisions asynchronously.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
📚 Sessions Docs: https://docs.browserbase.com/features/sessions
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
