# Stagehand + Browserbase: Cerebras Documentation Checker

## AT A GLANCE

- Goal: Crawl any documentation site, discover its source repo, and verify docs accuracy against the actual codebase using Cerebras LLMs.
- Parallel browser workers crawl docs pages and extract accessibility trees via Stagehand BYOB (Bring Your Own Browser).
- Cerebras-powered verification agent uses tool calling to grep and read source code, cross-referencing every function, parameter, and code example.
- Falls back to content-only analysis when no source repository is found.
- Docs → https://docs.stagehand.dev

## GLOSSARY

- extract: pull structured data or the accessibility tree from a page without LLM cost
  Docs → https://docs.stagehand.dev/basics/extract
- execute: run a multi-step Stagehand agent with an instruction and step limit
  Docs → https://docs.stagehand.dev/basics/agent
- BYOB (Bring Your Own Browser): connect Playwright directly to a Browserbase session for low-level control
  Docs → https://docs.browserbase.com

## QUICKSTART

1. uv sync && playwright install chromium
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
- Configurable models: Support switching between Cerebras models (llama-3.3-70b for speed, qwen-3-235b for precision) via CLI flags.
- Incremental checks: Cache previously verified pages and only re-check pages whose content has changed.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
