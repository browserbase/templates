# Playwright + Browserbase + Claude: Competitor Pricing Monitor

## AT A GLANCE

- Goal: visit competitor pricing pages, take full-page screenshots, and extract structured pricing data using Claude vision.
- Browser Automation: uses Playwright + Browserbase to navigate pricing pages in a remote browser.
- AI Analysis: sends screenshots to Claude claude-opus-4-7 which extracts plan names, prices, and key features as JSON.
- Flexible Targets: defaults to Asana, Linear, and Notion; pass any URLs as CLI arguments to override.
  Docs → https://docs.browserbase.com

## GLOSSARY

- Browserbase: cloud browser infrastructure for reliable, scalable web automation
  Docs → https://docs.browserbase.com
- CDP: Chrome DevTools Protocol — used to connect Playwright to a remote Browserbase session
- Claude Vision: multimodal Claude API that can analyze screenshots and extract structured data

## QUICKSTART

1. cd typescript/competitor-monitoring
2. npm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and MODEL_API_KEY to .env
5. npm start

To monitor custom URLs instead of the defaults:

```
npm start -- https://example.com/pricing https://other.com/pricing
```

## EXPECTED OUTPUT

- Creates a remote Browserbase browser session
- Visits each competitor pricing page and takes a full-page screenshot
- Saves screenshots to ./screenshots/
- Sends all screenshots to Claude for analysis
- Prints a formatted pricing comparison table to the console
- Saves the comparison as ./comparison.md
- Closes the browser session

## COMMON PITFALLS

- "Cannot find module": ensure npm install completed
- Missing credentials: verify .env contains BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and MODEL_API_KEY
- JSON parse error: Claude occasionally returns markdown-wrapped JSON; the template strips fences automatically
- Pricing page layout changes: Claude's extraction is prompt-based and may need updates if a site restructures its pricing page

## USE CASES

• Track competitor pricing changes over time by scheduling periodic runs and diffing the output.
• Onboard new competitors quickly by passing their pricing URLs as CLI arguments.
• Feed extracted pricing data into a dashboard or alerting system via the JSON output.

## NEXT STEPS

• Schedule runs with a cron job and diff comparison.md against the previous version to detect price changes.
• Add more competitors by extending DEFAULT_COMPETITORS in index.ts or passing additional URLs at runtime.
• Store results in a database to build a pricing history timeline.

## HELPFUL RESOURCES

📚 Browserbase Docs: https://docs.browserbase.com
🤖 Claude API: https://docs.anthropic.com
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
