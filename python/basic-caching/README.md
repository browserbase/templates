# Stagehand + Browserbase: Basic Caching

## AT A GLANCE

- Goal: Demonstrate how Stagehand's caching feature dramatically reduces cost and latency by reusing previously computed actions instead of calling the LLM every time.
- Shows side-by-side comparison of workflows with and without caching enabled.
- Demonstrates massive cost savings for repeated workflows (99.9% reduction in LLM calls).
- Docs → https://docs.stagehand.dev/v2/best-practices/caching#caching-actions

## GLOSSARY

- caching: Stagehand can cache action results based on instruction text and page context, eliminating redundant LLM calls
  Docs → https://docs.stagehand.dev/v2/best-practices/caching#caching-actions
- act: execute actions on web pages using natural language instructions
  Docs → https://docs.stagehand.dev/v2/basics/act
- observe: observe page elements and generate actions that can be cached and reused
  Docs → https://docs.stagehand.dev/v2/basics/observe

## QUICKSTART

1. uv venv venv
2. source venv/bin/activate # On Windows: venv\Scripts\activate
3. uvx install stagehand python-dotenv aiofiles
4. cp .env.example .env
5. Add required API keys/IDs to .env
6. python main.py (run twice to see cache benefits!)

## EXPECTED OUTPUT

- First run: Executes workflow without cache, then with cache enabled (populates cache)
- Subsequent runs: Uses cached actions for instant execution with zero LLM calls
- Displays timing comparison, cost savings, and cache statistics
- Shows cache location and file structure

## HOW CACHING WORKS

**Cache Key Generation:**

- Based on instruction text (used as cache key)
- Actions are observed once and cached
- Automatically computed

**When Cache is Used:**

- ✅ Same instruction text
- ✅ Cache file exists (`cache.json`)
- ❌ Different instruction text
- ❌ Cache file cleared or missing

**Cache Storage:**

- Location: `cache.json` in the same directory as `main.py`
- Format: JSON file containing cached actions
- Persistent across runs

## BENEFITS FOR REPEATED WORKFLOWS

**Example Scenario: 1,000 customers × 10 portals = 10,000 payment flows**

**Without caching:**

- 10,000 workflows × 5 actions = 50,000 LLM calls
- Cost: ~$500-2,500
- Latency: 2-3s per action × 5 = 10-15s per payment

**With caching:**

- First payment per portal: 5 LLM calls (populate cache)
- Next 999 payments: 0 LLM calls (use cache)
- Total: 10 portals × 5 actions = 50 LLM calls
- Cost: ~$0.50-2.50 (99.9% savings!)
- Latency: <100ms per action × 5 = <0.5s per payment

**Key Insight:**
Payment portals rarely change → Cache actions once → Reuse for thousands of payments → Massive cost + latency reduction

## COMMON PITFALLS

- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY
- Cache not working: ensure cache.json is writable and check that instruction text matches exactly
- First run slower: expected behavior - cache is populated on first run, subsequent runs will be instant
- ModuleNotFoundError: ensure virtual environment is activated and dependencies are installed via `uvx install`
- Import errors: activate your virtual environment if you created one
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Payment processing: Cache form-filling actions for payment portals that don't change frequently, processing thousands of payments with minimal LLM calls.
• Data entry automation: Reuse actions for repetitive data entry tasks across similar forms or interfaces.
• Testing workflows: Cache test actions to speed up regression testing and reduce API costs during development.

## BEST PRACTICES

- ✅ Enable caching in production for repeated workflows
- ✅ One cache per portal/interface type
- ✅ Invalidate cache when page structure changes significantly
- ✅ Monitor cache hit rate to optimize cache effectiveness
- ✅ Warm cache with test runs before production deployment

## NEXT STEPS

• Customize cache file location: Modify CACHE_FILE path to organize caches by workflow type or environment.
• Add cache invalidation: Implement logic to clear cache when page structure changes or after a certain time period.
• Monitor cache performance: Track cache hit rates and cost savings to measure effectiveness.

## TRY IT YOURSELF

1. Run this script again: `python main.py`
   → Second run will be MUCH faster (cache hits)

2. Clear cache and run again:
   `rm cache.json && python main.py`
   → Back to first-run behavior

3. Check cache contents:
   `cat cache.json`
   → See cached action data

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
