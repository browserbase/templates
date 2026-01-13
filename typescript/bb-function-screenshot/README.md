# Browserbase Functions: Screenshot Capture

## AT A GLANCE

- Goal: Demonstrate Browserbase Functions by creating a serverless screenshot API that captures web pages on-demand.
- Shows how to define, test, and deploy browser automation as serverless functions.
- Supports full-page screenshots and wait times for dynamic content.
- Returns base64-encoded PNG images ready for immediate use in applications.
- Docs → https://docs.browserbase.com/functions/quickstart

## GLOSSARY

- Browserbase Functions: serverless browser automation deployed to Browserbase infrastructure, invokable via API
  Docs → https://docs.browserbase.com/functions/quickstart
- defineFn: function used to define a Browserbase Function with name and handler
  Docs → https://docs.browserbase.com/functions/reference
- base64 encoding: binary-to-text encoding scheme for embedding images in JSON responses

## QUICKSTART

1. pnpm install
2. cp .env.example .env
3. Add your BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY to .env
4. pnpm dev (starts local dev server)
5. Test with curl or deploy with pnpm publish

## EXPECTED OUTPUT

**Local Testing:**
- Starts dev server on http://127.0.0.1:14113
- Function accessible at POST http://127.0.0.1:14113/v1/functions/screenshot/invoke
- Returns JSON with base64 screenshot, URL, and metadata
- Console shows navigation progress and timing

**Deployed Function:**
- Returns function ID and invocation URL
- Callable via API with authentication
- Asynchronous execution with polling for results
- 15 minute maximum execution time

## FUNCTION PARAMETERS

**Required:**
- `url` (string): Target URL to capture

**Optional:**
- `fullPage` (boolean): Capture entire scrollable page (default: false)
- `waitTime` (number): Milliseconds to wait before capture (default: 1000)

**Example request:**
```json
{
  "params": {
    "url": "https://www.browserbase.com",
    "fullPage": false,
    "waitTime": 2000
  }
}
```

**Example response:**
```json
{
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
  "url": "https://www.browserbase.com",
  "metadata": {
    "fullPage": false,
    "timestamp": "2024-01-15T10:30:45.123Z",
    "captureTime": 3421
  }
}
```

## LOCAL TESTING

Start the dev server:
```bash
pnpm dev
```

Test with curl:
```bash
# Basic screenshot
curl -X POST http://127.0.0.1:14113/v1/functions/screenshot/invoke \
  -H "Content-Type: application/json" \
  --data '{"params": {"url": "https://www.browserbase.com"}}'

# Full-page screenshot with wait time
curl -X POST http://127.0.0.1:14113/v1/functions/screenshot/invoke \
  -H "Content-Type: application/json" \
  --data '{"params": {"url": "https://www.espn.com", "fullPage": true, "waitTime": 3000}}'

# Save screenshot to file
curl -X POST http://127.0.0.1:14113/v1/functions/screenshot/invoke \
  -H "Content-Type: application/json" \
  --data '{"params": {"url": "https://www.browserbase.com"}}' \
  | jq -r '.screenshot' | base64 -d > screenshot.png
```

## DEPLOYMENT

Deploy your function:
```bash
pnpm publish
```

This returns a function ID (e.g., `func_abc123xyz`). Invoke it via API:
```bash
curl -X POST https://api.browserbase.com/v1/functions/func_abc123xyz/invoke \
  -H "x-bb-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"params": {"url": "https://www.browserbase.com"}}'
```

Poll for results using the invocation ID returned.

## COMMON PITFALLS

- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Wrong endpoint: use `/v1/functions/screenshot/invoke` not `/screenshot`
- Parameters format: wrap parameters in `"params"` object
- Function not found: deploy with `pnpm publish` first and use the returned function ID
- Timeout errors: increase waitTime for slow-loading sites
- Large screenshots: full-page screenshots of long pages can be very large (>10MB base64)
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

• Visual monitoring and testing: Screenshot websites on schedule for visual regression testing and monitor competitor sites for changes.
• Content archival: Capture news articles or social media posts at specific timestamps for compliance and records.
• Preview generation: Generate link previews for chat applications, thumbnails for bookmarking services, or visual search engines.
• API integration: Webhook endpoint for screenshot requests, CI/CD pipeline integration, or power screenshot features in SaaS applications.

## HELPFUL RESOURCES

📚 Browserbase Functions: https://docs.browserbase.com/functions/quickstart
📖 Functions Reference: https://docs.browserbase.com/functions/reference
🎭 Playwright Docs: https://playwright.dev/docs/intro
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
