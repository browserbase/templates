# bb research engine

## AT A GLANCE

- Goal: build a cited research brief from the open web using Browserbase Search API for discovery, Fetch API for fast page retrieval, and Stagehand browser sessions only when needed.
- Search-first: runs several targeted web searches and deduplicates candidate URLs.
- Fetch-first: retrieves raw page content without launching a browser, parses HTML locally, and scores usable sources.
- Browser fallback: escalates JS-heavy, blocked, very thin, or oversized pages to a Stagehand session with AI-powered extraction.
- Plan-first research: creates an explicit research plan before searching, including assumptions, evidence requirements, source-quality rules, and risky-source hints.
- AutoBrowse-inspired learning loop: writes traces, evaluates quality, improves `strategy.md`, and runs another pass with one concrete hypothesis per iteration.
- Claim-level evidence: extracts claim candidates from every usable source, not just page summaries.
- Live web enrichment: records search snapshots, retrieval timestamps, content hashes, excerpt hashes, and source snippets so live-web runs are auditable after pages drift.
- Universal-verifier stage: creates a rubric before retrieval, then separately scores research process and final report outcome after synthesis.
- FARA/WebTailBench-style benchmark mode: runs a TSV/JSON/JSONL task suite, preserves precomputed rubrics when present, and emits JSONL plus aggregate metrics.
- Synthesis: uses Stagehand through Browserbase Model Gateway to produce a structured brief with source IDs, claim map, confidence notes, contradictions, gaps, and follow-up questions.

## GLOSSARY

- Search API: perform web searches and get structured result metadata without a browser session.
  Docs -> https://docs.browserbase.com/reference/api/web-search
- Fetch API: fetch a page through Browserbase infrastructure and receive content, headers, status, content type, and encoding.
  Docs -> https://docs.browserbase.com/reference/api/fetch-a-page
- Stagehand: AI browser automation framework with `act`, `observe`, and `extract` primitives.
  Docs -> https://docs.browserbase.com/introduction/stagehand
- Model Gateway: route Stagehand model calls through your Browserbase API key.
  Docs -> https://docs.browserbase.com/platform/model-gateway/overview
- AutoBrowse: self-improving browser automation pattern that evaluates a run, reads traces, updates strategy, and repeats.
  Skill -> https://skills.sh/browserbase/skills/autobrowse
- Universal Verifier: process/outcome verification pattern using a pre-generated rubric and conservative scoring.
  Paper -> https://arxiv.org/html/2604.06240v1
- FARA/WebTailBench: benchmark/evaluation infrastructure for browser agents and Universal Verifier scoring.
  Repo -> https://github.com/microsoft/fara

## QUICKSTART

1. cd typescript/deep-research-agent
2. npm install
3. cp .env.example .env
4. Add BROWSERBASE_API_KEY to .env
5. npm start -- "What changed in browser automation platforms in 2026?"

## DASHBOARD MODE

This template also includes a lightweight dashboard for running research topics and inspecting results.

```bash
npm run web
```

Open http://localhost:3000 in your browser.

## BENCHMARK MODE

Set `BENCH_TASKS_FILE` to run a FARA/WebTailBench-style task suite instead of one topic:

```bash
BENCH_TASKS_FILE=./benchmark.example.tsv BENCH_TASK_LIMIT=1 npm run bench
```

Supported task formats:

- WebTailBench-style TSV with `id`, `task_summary`, `benchmark`, `init_url`, and optional `precomputed_rubric`.
- JSON array or `{ "tasks": [...] }`.
- JSONL with one task object per line.

Recognized task fields:

- `id`, `task_id`, or `subdir`
- `question`, `task_summary`, `confirmed_task`, or `instruction`
- `category`, `benchmark`, or `split`
- `init_url` or `website`
- `precomputed_rubric` or `precomputedRubric`

Benchmark outputs:

- `bench-output/bench-results-<timestamp>.jsonl`
- `bench-output/bench-summary-<timestamp>.json`
- one normal research workspace per task

## HOW IT WORKS

1. Creates a per-run workspace under `research-workspace/<topic>-<timestamp>/`.
2. Builds `plan.md` with assumptions, report sections, required evidence, search queries, and source-quality rules.
3. Builds `rubric.md` before retrieval, separating process criteria from outcome criteria.
4. Writes an initial `strategy.md` with a fast path, source quality rules, fallback rules, and stop criteria.
5. Builds query variants from the current strategy.
6. Calls `bb.search.web()` for each query.
7. Deduplicates candidate URLs and prioritizes strategy-selected browser fallback URLs.
8. Calls `bb.fetchAPI.create()` for each candidate.
9. Parses usable HTML with Cheerio and extracts title, metadata, headings, links, word count, excerpts, quality signals, risk flags, and claim candidates.
10. Falls back to a Stagehand browser session for pages that need JavaScript, are blocked, are too thin, or return unusable content.
11. Runs a hot-path quality evaluation covering source count, domain diversity, claim count, missing angles, and risk flags.
12. Writes JSON and Markdown traces for the iteration.
13. Enriches accepted and rejected sources with live-web metadata: search snapshot, retrieval method, timestamps, status/content type, hashes, snippets, and fallback reasons.
14. Reads the trace with a Strategy Planner and updates `strategy.md` for the next iteration.
15. Synthesizes the top diverse sources into a report.
16. Verifies the process and outcome against `rubric.md`, classifies controllable vs uncontrollable failures, and writes final Markdown/JSON under both the run workspace and `output/`.

## WHAT MAKES IT DIFFERENT

Most research templates are one of three shapes: search-and-summarize, multi-agent fanout, or browser-only exploration. This template is built around a different loop:

- It treats Browserbase Search and Fetch as the cheap, high-throughput research substrate, then spends full browser sessions only when diagnostics justify it.
- It adapts the AutoBrowse trace loop to research, so each pass records what failed and improves one strategy hypothesis.
- It preserves claim candidates, reliability signals, and prompt-injection risk flags before synthesis.
- It generates a verifier rubric before seeing results, avoiding post-hoc grading bias.
- It can import benchmark `precomputed_rubric` data, matching the reproducibility direction used by FARA/WebTailBench.
- It separately scores the research process and final report outcome, then classifies repairable vs access-related failures.
- It enforces source diversity with `MAX_SOURCES_PER_DOMAIN`, reducing the common failure mode where one domain dominates the report.
- It upgrades traceability into live web enrichment by preserving the retrieval context, snippets, and hashes behind each source.
- It produces auditable artifacts: `plan.md`, `rubric.md`, `strategy.md`, per-iteration traces, `verification.md`, final Markdown, and final JSON.
- It can stop early on quality thresholds or keep iterating for higher confidence.

## AUTOBROWSE PATTERN

This template adapts the AutoBrowse loop from site automation to research:

- Inner loop: Search, Fetch, browser fallback, source scoring, and trace writing.
- Outer loop: read the trace, identify the failure mode, form one improvement hypothesis, update strategy, and repeat.
- Strategy memory: `strategy.md` preserves what worked, browser fallback URLs, source quality rules, and recovery heuristics.
- Durable evidence: every iteration writes `traces/iteration-N.json` and `traces/iteration-N.md`.
- Final report: the report cites source IDs and includes contradictions, gaps, source quality notes, and follow-up questions.

## EXPECTED OUTPUT

- Console progress for search, fetch, fallback, and synthesis steps.
- `research-workspace/<topic>-<timestamp>/plan.md` with the initial research plan.
- `research-workspace/<topic>-<timestamp>/rubric.md` with process and outcome verification criteria.
- `research-workspace/<topic>-<timestamp>/strategy.md` with the evolving strategy.
- `research-workspace/<topic>-<timestamp>/traces/iteration-N.json` and `.md` files.
- `research-workspace/<topic>-<timestamp>/verification.md` with pass/fail, process score, outcome score, unsupported claims, weak citations, and repair actions.
- A Markdown report with methodology, executive summary, key findings, claim map, contradictions, gaps, follow-up questions, and source list.
- A JSON file containing the topic, generated queries, scored sources, live-web enrichment metadata, and structured report object.

## CONFIGURATION

- `RESEARCH_MODEL`: Stagehand model routed through Model Gateway. Default: `google/gemini-2.5-flash`.
- `RESEARCH_ITERATIONS`: evaluate -> trace -> improve cycles. Default: `2`.
- `NUM_QUERIES`: number of generated query variants to run. Default: `4`.
- `RESULTS_PER_QUERY`: Search API results per query. Default: `5`.
- `MAX_FETCHES`: maximum candidate URLs to fetch. Default: `10`.
- `MAX_BROWSER_FALLBACKS`: maximum pages to inspect with a full browser when Fetch is insufficient. Default: `2`.
- `MAX_SOURCES`: maximum sources included in the final synthesis. Default: `8`.
- `MAX_SOURCES_PER_DOMAIN`: source diversity guardrail. Default: `2`.
- `CLAIMS_PER_SOURCE`: maximum claim candidates kept from each source. Default: `5`.
- `MIN_QUALITY_SCORE`: quality score needed for early stopping. Default: `75`.
- `MIN_DISTINCT_DOMAINS`: minimum distinct domains for high-confidence synthesis. Default: `3`.
- `USE_RESEARCH_PLANNER`: set to `false` to skip the initial Model Gateway planning pass. Default: `true`.
- `USE_STRATEGY_PLANNER`: set to `false` to skip AutoBrowse-style trace reading and use deterministic query expansion. Default: `true`.
- `USE_BROWSER_SYNTHESIS`: set to `false` to skip Stagehand synthesis and emit a deterministic evidence brief. Default: `true`.
- `USE_VERIFIER`: set to `false` to skip rubric generation and process/outcome verification. Default: `true`.
- `STOP_EARLY_ON_QUALITY`: set to `true` to stop once the quality threshold is met. Default: `false`.
- `VERIFICATION_PASS_SCORE`: conservative verifier pass threshold. Default: `80`.
- `USE_PROXIES`: set to `true` to enable Browserbase proxy support for Fetch requests and browser sessions. Default: `false`.
- `OUT_DIR`: output directory. Default: `output`.
- `RESEARCH_WORKSPACE`: trace and strategy workspace. Default: `research-workspace`.
- `BENCH_TASKS_FILE`: optional TSV/JSON/JSONL task file. When set, the template runs benchmark mode.
- `BENCH_TASK_FORMAT`: `auto`, `tsv`, `json`, or `jsonl`. Default: `auto`.
- `BENCH_TASK_LIMIT`: maximum benchmark tasks to run. Default: `25`.
- `BENCH_OUTPUT_DIR`: directory for benchmark JSONL and summary files. Default: `bench-output`.
- `BENCH_SUCCESS_CRITERION`: `outcome`, `process`, or `both`. Default: `outcome`.

## VERCEL DEPLOYMENT

This template includes a static Vercel web UI in `public/index.html` and serverless functions in `api/`.

1. Import this GitHub repo in Vercel.
2. Add `BROWSERBASE_API_KEY` in Project Settings -> Environment Variables.
3. For a lower-cost first deploy, set these Vercel environment variables:
   - `RESEARCH_ITERATIONS=1`
   - `NUM_QUERIES=2`
   - `RESULTS_PER_QUERY=3`
   - `MAX_FETCHES=4`
   - `MAX_BROWSER_FALLBACKS=1`
   - `USE_RESEARCH_PLANNER=false`
   - `USE_STRATEGY_PLANNER=false`
   - `USE_BROWSER_SYNTHESIS=false`
   - `USE_VERIFIER=false`

The Vercel deployment exposes `/api/health` and `/health` for health checks. Generated artifacts are written to `/tmp` while running on Vercel because serverless function filesystems are ephemeral.

## COMMON PITFALLS

- Missing API key: verify `.env` contains `BROWSERBASE_API_KEY`.
- Search query length: Search API queries must be 1 to 200 characters. This template trims generated queries.
- Search result volume: Search API supports 1 to 25 results per query. This template clamps `RESULTS_PER_QUERY`.
- Live web drift: traces and live-web enrichment make runs auditable, but exact page replay still requires external archiving if you need full raw-page snapshots.
- Fetch API does not execute JavaScript. Thin app-shell pages should fall back to Stagehand.
- Fetch API has a 1 MB content limit and 10 second timeout. Use browser sessions for large or slow pages.
- More iterations cost more because each improvement pass may use Search, Fetch, browser fallback, and Model Gateway calls.
- Keep `MAX_BROWSER_FALLBACKS` low at first. The template is designed to spend browser sessions only after Fetch produces useful diagnostics.
- Prompt injection can appear inside web pages. This template flags suspicious text and instructs synthesis to treat page content as evidence, never instructions.
- If you open `public/index.html` directly from disk, start `npm run web` first so the page can call the local API at `http://localhost:3000`.
- Source diversity is a guardrail, not a guarantee. For regulated or high-stakes use, add domain allowlists and human review.
- Synthesis quality depends on source quality. Tune query variants, source scoring, and domain filters for production workflows.

## USE CASES

- Competitive research: gather recent pages, source snippets, and a quick cited brief.
- Due diligence: collect public web evidence before escalating to authenticated or paid sources.
- Monitoring: schedule recurring research over a topic and compare source changes over time.
- Agent pipelines: let Search and Fetch do cheap triage before spending browser and model budget.

## OTHER BROWSERBASE TOOLS WORTH ADDING

- Browser Sessions: use Playwright or Stagehand when a page requires JavaScript, interaction, downloads, or authenticated browsing.
- Stagehand `observe`: inspect available page actions before deciding whether to click or extract.
- Contexts: persist login state for authenticated research sources.
- Proxies: get geography-specific results or improve access to protected pages.
- Browser Settings: use advanced stealth, ad blocking, and captcha solving for difficult browser fallback targets.
- Functions: deploy this research agent as an API endpoint or scheduled job on Browserbase infrastructure.
- Browserbase Skills and CLI: useful if you want coding agents to run search, fetch, browser, and deployment workflows consistently.
- AutoBrowse: use the full skill when you need to train reliable browser workflows for specific sites, then graduate those workflows into reusable skills.

## HELPFUL RESOURCES

- Fetch API blog: https://www.browserbase.com/blog/fetch-api
- Fetch API reference: https://docs.browserbase.com/reference/api/fetch-a-page
- Search API reference: https://docs.browserbase.com/reference/api/web-search
- Stagehand docs: https://docs.browserbase.com/introduction/stagehand
- Model Gateway: https://docs.browserbase.com/platform/model-gateway/overview
- AutoBrowse skill: https://skills.sh/browserbase/skills/autobrowse
- Browserbase Skills repo: https://github.com/browserbase/skills/tree/main/skills/autobrowse
- FARA repo: https://github.com/microsoft/fara
- WebTailBench dataset: https://huggingface.co/datasets/microsoft/WebTailBench
- CUAVerifierBench dataset: https://huggingface.co/datasets/microsoft/CUAVerifierBench
- Functions: https://docs.browserbase.com/features/functions
- Contexts: https://docs.browserbase.com/features/contexts
- Proxies: https://docs.browserbase.com/features/proxies
- Skills: https://docs.browserbase.com/integrations/skills/introduction
- Templates: https://github.com/browserbase/templates
