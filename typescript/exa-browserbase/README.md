# Stagehand + Browserbase + Exa: Review Job Applications

## AT A GLANCE

- **Goal**: Discover live jobs, extract structured role details, and prepare applications for human review.
- **Pattern**: Exa finds direct careers or ATS pages; Stagehand V4 uses `act`, `extract`, and `observe` to inspect and fill them.
- **Safety**: Fills only non-empty supplied applicant values, uploads a test résumé when requested, and never submits.
- **Plans**: Sequential mode works on all plans. Bounded concurrency is opt-in and requires sufficient Browserbase concurrency.
- Docs → [Stagehand V4](https://docs.stagehand.dev/v4/first-steps/introduction) | [Exa Search](https://docs.exa.ai/reference/search)

## THE 5-STEP FLOW

1. **Discover jobs** — one focused Exa search returns a small ranked set of direct company careers or recognized ATS pages.
2. **Inspect a role** — `act()` opens one live role and `extract()` returns its title, requirements, and responsibilities.
3. **Inspect the application** — `act()` opens the form and `observe()` inventories its fields.
4. **Prepare for review** — `act()` fills matching non-empty applicant values; the exact file input uploads the résumé.
5. **Report, do not submit** — a final `extract()` summarizes the review and the required fields that remain.

Direct page methods are limited to exact navigation, résumé upload, and session lifecycle. They do not replace Stagehand's primary interaction primitives.

## QUICKSTART

1. `cd exa-browserbase`
2. `pnpm install`
3. `cp .env.example .env`
4. Add `BROWSERBASE_API_KEY` and `EXA_API_KEY` to `.env`.
5. Replace the synthetic `applicant` and `Dummy_CV.pdf` with your test data.
6. `pnpm start`

The default run reviews one application sequentially, trying up to three ranked candidates when an earlier live result has no usable form. For a small, repeatable smoke run, set `COMPANY_QUERY=Browserbase NUM_COMPANIES=1`.

Set `NUM_COMPANIES` to review more candidates. Set `CONCURRENT=true MAX_CONCURRENT_BROWSERS=2` to opt into bounded concurrent sessions.

## RESULT CONTRACT

- A run succeeds when it reaches at least one real application and returns a review.
- `fieldsAttempted` lists the fields whose Stagehand actions reported success; it is intentionally not a claim that every ATS persisted every value.
- `resumeUploaded` reports that the deterministic file-upload command completed without throwing; persistence is left to external E2E validation.
- Null, empty, absent, or ambiguous fields remain outstanding instead of being invented or treated as infrastructure failures.
- The final submit button is never clicked.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v4/first-steps/introduction
📚 Exa API: https://docs.exa.ai/reference/search
🎮 Browserbase: https://www.browserbase.com
🔧 Templates: https://www.browserbase.com/templates
💬 Discord: http://stagehand.dev/discord
