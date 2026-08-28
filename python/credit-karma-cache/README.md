# Stagehand + Browserbase: Credit Karma with Caching & Variables

## AT A GLANCE

- **Goal**: Automate Credit Karma mortgage rate comparisons using caching and parameterized actions
- **Key Features**:
  - Cache DOM snapshots for 10x faster subsequent runs
  - Parameterize form inputs with variables for flexible automation
  - Get mortgage refinance rates programmatically
- **Tech Stack**: Stagehand, Browserbase, Python
- **Docs** → [Stagehand](https://docs.stagehand.dev) | [Browserbase](https://docs.browserbase.com)

## GLOSSARY

- **Caching**: Stagehand stores DOM snapshots in a local cache directory to dramatically speed up repeat automations. On subsequent runs, Stagehand uses cached DOM state instead of re-analyzing pages from scratch. Docs → [Caching Guide](https://docs.stagehand.dev/v3/best-practices/caching)
- **Variables**: Parameterize your `act()` instructions with `%variableName%` syntax to make automations reusable and dynamic. Docs → [act() with Variables](https://docs.stagehand.dev/v3/basics/act)
- **act()**: Stagehand's natural language instruction method that performs UI actions (clicking, typing, selecting) without selectors. Docs → [act() Method](https://docs.stagehand.dev/v3/basics/act)
- **Browserbase**: Cloud browser infrastructure for reliable, scalable web automation with stealth mode and CAPTCHA solving. Docs → [Browserbase Platform](https://docs.browserbase.com)

## QUICKSTART

1. cd python/credit-karma-cache
2. uv venv venv
3. source venv/bin/activate # On Windows: venv\Scripts\activate
4. uv pip install .
5. cp .env.example .env # Add your Browserbase API key and Project ID to .env
6. python main.py

## EXPECTED OUTPUT

On the first run, you'll see:
```
🏠 Starting Credit Karma mortgage rate automation...

✓ Successfully navigated to Credit Karma mortgage rates page
✓ Selected Refinance tab
✓ Selected credit score: Above 760
✓ Entered ZIP code: 10001
✓ Entered loan balance: $100000
✓ Entered home value: $150000
✓ Entered cash-out amount: $0
✓ Clicked 'Get my rates' button

✓ Mortgage rates loaded successfully!

┌─────────────────────────────────────┐
│ Credit Karma Refinance Query        │
├─────────────────────────────────────┤
│ Credit Score: Above 760             │
│ ZIP Code: 10001                     │
│ Loan Balance: $100000               │
│ Home Value: $150000                 │
│ Cash Out: $0                        │
└─────────────────────────────────────┘
```

**On subsequent runs**: The automation runs ~10x faster thanks to caching! Stagehand reuses DOM snapshots from the `credit-karma-cache/` directory instead of re-analyzing every page element.

## COMMON PITFALLS

- **Missing environment variables**: Ensure your `.env` file contains valid `BROWSERBASE_PROJECT_ID` and `BROWSERBASE_API_KEY`. The script will fail silently if these are missing.
- **Cache directory conflicts**: If you run multiple Credit Karma automations simultaneously, use different `cache_dir` values to avoid conflicts. Example: `cache_dir="credit-karma-cache-user1"`
- **Stale cache issues**: If Credit Karma's UI changes significantly, delete the `credit-karma-cache/` directory to regenerate fresh snapshots.
- **Rate limiting**: Credit Karma may rate-limit requests. Use Browserbase's stealth mode (`advanced_stealth=True`) or add delays between runs if you encounter blocks.

Find more information on your Browserbase dashboard → [Sessions](https://browserbase.com/sessions)

## USE CASES

- **Mortgage shopping automation**: Compare refinance rates across different credit scores and loan amounts without manual data entry
- **Financial data aggregation**: Scrape mortgage rates for market analysis, customer comparison tools, or personal finance apps
- **Testing and QA**: Validate Credit Karma's UI flows and form handling across different user scenarios
- **Personal finance tracking**: Monitor how rate changes affect your specific refinance scenario over time
- **Lead generation tools**: Pre-qualify mortgage leads by automating rate checks based on customer-provided information

## NEXT STEPS

- **Extract rate data**: Use Stagehand's `extract()` method to scrape the mortgage rates table and return structured JSON data
- **Loop through scenarios**: Iterate through multiple `USER_CONFIG` dictionaries to compare rates across different credit scores or ZIP codes
- **Add error recovery**: Implement retry logic with exponential backoff for network failures or CAPTCHA challenges
- **Schedule regular runs**: Set up a cron job or GitHub Action to track rate changes daily/weekly
- **Integrate with databases**: Store extracted rates in PostgreSQL, MongoDB, or Airtable for historical tracking
- **Enable proxies**: Set `proxies=True` in `browserbase_session_create_params` to rotate IPs and avoid rate limiting

## HELPFUL RESOURCES

- 📚 [Stagehand Documentation](https://docs.stagehand.dev)
- 📚 [Browserbase Documentation](https://docs.browserbase.com)
- 📚 [Caching Guide](https://docs.stagehand.dev/v3/best-practices/caching)
- 📚 [act() with Variables](https://docs.stagehand.dev/v3/basics/act)
- 🎮 [Browserbase Dashboard](https://browserbase.com/dashboard)
- 🎮 [Browserbase Playground](https://www.browserbase.com/playground)
- 💡 [Try it out: Credit Karma Mortgage Rates](https://www.creditkarma.com/home-loans/mortgage-rates)
- 📧 [Browserbase Support](mailto:support@browserbase.com)
- 💬 [Join the Discord](https://discord.gg/browserbase)
