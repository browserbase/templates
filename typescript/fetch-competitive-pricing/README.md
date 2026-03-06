# Stagehand + Browserbase + Anthropic: Competitive Pricing Intelligence

## AT A GLANCE

- **Goal**: Fetch competitor pricing pages in parallel via the Browserbase Fetch API, extract structured pricing data with Claude Haiku, then aggregate everything into a polished competitive comparison report with Claude Opus.
- **4-step pipeline**: Read URLs from `competitors.txt` → parallel fetch via Browserbase → parallel extraction with Claude Haiku → single aggregated report from Claude Opus.
- **No browser session required**: Uses the Browserbase Fetch API (a lightweight HTTP endpoint) — no Playwright or Stagehand install needed, just an API key.
- **Resilient by default**: Failed fetches are logged and skipped without aborting the run; each URL retries once automatically.
- Docs → [Browserbase Fetch API](https://docs.browserbase.com/features/fetch) | [Claude Haiku](https://www.anthropic.com/claude/haiku) | [Claude Opus](https://www.anthropic.com/claude)

## GLOSSARY

- **Browserbase Fetch API**: A single HTTP endpoint that renders any URL in a headless browser and returns the resulting HTML — no SDK or session management required.
  Docs → https://docs.browserbase.com/features/fetch
- **Claude Haiku**: Anthropic's fastest, most cost-efficient Claude model. Used here to extract structured pricing JSON from each page in parallel.
  Docs → https://www.anthropic.com/claude/haiku
- **Claude Opus**: Anthropic's most capable Claude model. Used for the final aggregation step to produce a polished, analyst-quality markdown report.
  Docs → https://www.anthropic.com/claude
- **Promise.all**: JavaScript pattern for running async tasks concurrently — all fetches fire simultaneously, and all extractions run simultaneously.

## QUICKSTART

1.  cd typescript/fetch-competitive-pricing
2.  npm install
3.  cp .env.example .env
4.  Add your `BROWSERBASE_API_KEY` and `ANTHROPIC_API_KEY` to .env
5.  Edit `competitors.txt` — add one competitor pricing URL per line
6.  npm start

## EXPECTED OUTPUT

- Reads URLs from `competitors.txt` and logs the count
- Fetches all pages in parallel, logging per-URL progress and any failures
- Runs Claude Haiku on each fetched page simultaneously to extract structured JSON (company name, tiers, prices, free-trial info, notes)
- Passes all extracted JSON to Claude Opus to generate a markdown report
- Saves the report to `analysis-summaries/<company1>-vs-<company2>-YYYY-MM-DD.md`
- Logs fetch time, report generation time, and total token usage

## COMMON PITFALLS

- Missing credentials: verify .env contains `BROWSERBASE_API_KEY` and `ANTHROPIC_API_KEY`
- Empty `competitors.txt`: add at least one URL (one per line; lines starting with `#` are comments)
- Pricing not found: some pages require JavaScript-heavy rendering — the Fetch API handles this, but heavily gated pages (login walls) will return incomplete HTML
- Haiku JSON parse errors: the model occasionally wraps JSON in markdown fences; the script strips these automatically, but malformed responses are skipped
- Rate limits: reduce parallelism by batching URLs if you hit Anthropic or Browserbase rate limits
- Find more information on your Browserbase dashboard → https://www.browserbase.com/sign-in

## USE CASES

• Competitive analysis: Monitor how competitors structure and price their tiers to inform your own pricing strategy.
• Market research: Aggregate pricing across an entire category to identify positioning gaps and free-tier patterns.
• Release prep: Run before major pricing changes to benchmark your new prices against the current competitive landscape.

## NEXT STEPS

• Schedule recurring runs: Set up a cron job or CI workflow to regenerate the report weekly and diff against the previous version.
• Add change detection: Cache previous extractions and highlight tiers or prices that changed since the last run.
• Expand the pipeline: Add more URLs to `competitors.txt` or swap Claude Opus for a custom summarisation prompt tailored to your industry.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
