# Stagehand + Browserbase: Cerebras Documentation Checker

Stagehand is the SDK for browser agents.

## AT A GLANCE

- Goal: Crawl any documentation site, discover its source repo, and verify docs accuracy against the actual codebase using Cerebras LLMs.
- Parallel Browserbase workers crawl docs pages and capture Playwright accessibility snapshots.
- A Deep Agents verification agent uses Cerebras for planning and Stagehand V4 code-mode browser tools for fallback research, while local code tools cross-reference functions, parameters, and examples.
- Falls back to content-only analysis when no source repository is found.
- Docs → https://docs.stagehand.dev

## GLOSSARY

- snapshot: capture the current page's structured accessibility representation.
- code mode: Stagehand's `snapshot`, `run`, and `screenshot` tools, exposed to a bring-your-own Deep Agents loop over MCP.
- Deep Agents: the external agent framework; Stagehand V4 does not expose `stagehand.agent()`.

## QUICKSTART

1. uv sync
2. cp .env.example .env # Add your CEREBRAS_API_KEY and BROWSERBASE_API_KEY
3. uv run python main.py https://your-docs-site.com

## EXPECTED OUTPUT

- Spins up parallel crawl workers with live Browserbase session links
- BFS-crawls the docs site, extracting aria trees and checking for broken links/anchors
- Discovers the GitHub source repository from crawled page content
- Clones the repo and runs a Cerebras verification agent on each page
- Prints a summary table with issue counts by severity and type
- Saves a detailed Markdown report to `docs_report_YYYYMMDD_HHMM.md`

## COMMON PITFALLS

- "Missing required API keys": verify .env contains CEREBRAS_API_KEY and BROWSERBASE_API_KEY
- Playwright not installed: run `playwright install chromium` after `uv sync`
- Cerebras 422 errors: the model may rate-limit under heavy load — reduce MAX_PAGES or MAX_CRAWL_WORKERS in main.py
- Clone failures: ensure the target docs site links to a public GitHub repo
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

- Documentation audits: Automatically verify that API docs match the actual source code before a release.
- Broken link detection: Crawl a docs site and surface all broken external links and internal anchors.
- CI/CD integration: Run as a scheduled check to catch documentation drift as the codebase evolves.

## NEXT STEPS

- Add JSON export: Extend the output to include a machine-readable JSON issues file for downstream tooling.
- Configurable models: Set `CEREBRAS_MODEL` to any model available to your Cerebras account; the template defaults to `gpt-oss-120b`.
- Incremental checks: Cache previously verified pages and only re-check pages whose content has changed.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v4/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
