# Playwright + Browserbase: Download Financial Statements

## AT A GLANCE

- Goal: Automatically download Apple's quarterly financial statements (PDFs) from their investor relations page.
- Uses pure Playwright with Browserbase SDK (no AI/Stagehand required).
- Demonstrates file downloads, page navigation, and the Browserbase downloads API.
- Docs → https://docs.browserbase.com/introduction/playwright

## GLOSSARY

- Browserbase SDK: Cloud browser infrastructure that provides managed browser sessions with built-in download handling
  Docs → https://docs.browserbase.com/sdk
- CDP (Chrome DevTools Protocol): Low-level protocol for communicating with Chrome/Chromium browsers
  Docs → https://chromedevtools.github.io/devtools-protocol/
- Downloads API: Browserbase feature that captures and retrieves files downloaded during a session
  Docs → https://docs.browserbase.com/features/file-downloads

## QUICKSTART

1. pnpm install
2. cp .env.example .env
3. Add required API keys/IDs to .env
4. pnpm start

## EXPECTED OUTPUT

- Console logs showing navigation through Apple's investor relations pages
- Live view URL to watch the automation in real-time
- Downloaded `downloaded_files.zip` containing quarterly financial statement PDFs
- Session replay URL for debugging

## HOW IT WORKS

**Navigation Flow:**

1. Navigate to apple.com
2. Scroll to footer and click "Investors" link
3. Navigate to investor relations page
4. Scroll to "Quarterly Earnings Reports" section
5. Click year tab (2025)
6. Click "Financial Statements" links for Q1-Q4

**Download Handling:**

1. Configure CDP download behavior to allow downloads
2. Click PDF links to trigger downloads
3. Poll Browserbase downloads API until files are ready
4. Save downloaded files as a zip archive

## STAGEHAND VS PLAYWRIGHT

This template uses **pure Playwright** for browser automation. The Stagehand version of this template uses AI-powered natural language commands instead. Here's how they compare:

| Task | Stagehand (AI) | Playwright (Selectors) |
|------|----------------|------------------------|
| Click link | `await stagehand.act("Click 'Investors'")` | `await page.getByRole("link", { name: "Investors" }).click()` |
| Scroll | `await stagehand.act("Scroll to Financial Data")` | `await page.evaluate(() => window.scrollTo(...))` |
| Find element | AI interprets intent | Explicit selectors required |

**Example - Clicking a link:**

```typescript
// Stagehand: Natural language, AI finds the element
await stagehand.act("Click the 'Investors' button at the bottom of the page");

// Playwright: Explicit selector, you specify how to find it
await page.getByRole("link", { name: "Investors" }).click();
```

**Example - Downloading quarterly statements:**

```typescript
// Stagehand: AI understands context
await stagehand.act("Click the 'Financial Statements' link under Q4");

// Playwright: Must build selector logic to find correct link
const link = page.locator("text=Q4").locator("..").locator("..")
  .getByRole("link", { name: /Financial Statements/i }).first();
await link.click();
```

## COMMON PITFALLS

- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Download timeout: increase retryForSeconds if downloads are large or network is slow
- Page structure changes: Apple may update their investor relations page layout
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

- Financial data collection: Automate downloading quarterly/annual reports from investor relations pages.
- Document archival: Build automated pipelines to archive public financial documents.
- Compliance monitoring: Track and download regulatory filings as they're published.
- Research automation: Collect financial statements across multiple companies for analysis.

## CUSTOMIZATION

**Change target company:**
Modify the navigation flow in `main()` to target a different company's investor relations page.

**Adjust download timeout:**

```typescript
await saveDownloadsWithRetry(bb, session.id, 60); // 60 seconds timeout
```

**Download specific quarters:**

```typescript
// Only download Q4 and Q3
await clickFinancialStatementsLink(page, "Q4");
await clickFinancialStatementsLink(page, "Q3");
```

## NEXT STEPS

- Add error recovery: Implement retry logic for failed navigation steps.
- Extract metadata: Parse downloaded PDFs to extract key financial metrics.
- Schedule automation: Run on a schedule to capture new filings as they're published.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v2/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
