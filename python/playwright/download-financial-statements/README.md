# Playwright + Browserbase: Download Financial Statements (Python)

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

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -e .
   playwright install chromium
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Add BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID to .env
   ```

4. Run the script:
   ```bash
   python main.py
   ```

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

This template uses **pure Playwright** for browser automation. The Stagehand v3 Python SDK uses a session-based API with **observe** (find actions) and **act** (execute an action), so you describe intent in natural language instead of writing selectors. Here's how they compare:

| Task         | Stagehand v3 — natural language (you describe intent) | Playwright — specific selectors (you target exact elements)   |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| Click link   | *"Click the Investors link"*                             | `page.get_by_role("link", name="Investors").click()`          |
| Scroll       | *"Scroll to the Financial Data section"*                 | `page.evaluate("window.scrollTo(...)")`                       |
| Find element | *"Find the Financial Statements link under Q4"*         | `page.locator("text=Q4").locator("..").get_by_role("link", ...)` |

**Example - Clicking a link:**

```python
# Stagehand v3: natural language; observe finds the action, act runs it
session = await client.sessions.create(model_name="openai/gpt-5-nano")
await session.navigate(url="https://apple.com/investor")
observe_resp = await session.observe(instruction="Click the Investors link at the bottom of the page")
action = observe_resp.data.result[0].to_dict(exclude_none=True)
await session.act(input=action)

# Playwright: you specify the exact element
await page.get_by_role("link", name="Investors").click()
```

**Example - Downloading quarterly statements:**

```python
# Stagehand v3: describe what you want in plain language
observe_resp = await session.observe(
    instruction="Click the Financial Statements link under Q4"
)
await session.act(input=observe_resp.data.result[0].to_dict(exclude_none=True))

# Playwright: build selector logic to find the right link
link = (page.locator("text=Q4").locator("..").locator("..")
        .get_by_role("link", name="Financial Statements").first)
await link.click()
```

## COMMON PITFALLS

- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Playwright not installed: run `playwright install chromium` after pip install
- Download timeout: increase retry_for_seconds if downloads are large or network is slow
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

```python
await save_downloads_with_retry(bb, session.id, 60)  # 60 seconds timeout
```

**Download specific quarters:**

```python
# Only download Q4 and Q3
await click_financial_statements_link(page, "Q4")
await click_financial_statements_link(page, "Q3")
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
