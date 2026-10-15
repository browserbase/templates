# Stagehand + Browserbase: Resilient Payment Agent (Sanitized Template)

## AT A GLANCE

- Goal: Distill robust payment-form automation patterns from a customer demo into a public-safe template.
- Includes a synthetic checkout test site with no customer data and no real payment processing.
- Demonstrates guarded agent execution with CAPTCHA pause/resume and a custom field verification tool.
- Produces structured output (success, confirmation ID, charged amount, error reasoning).
- Docs -> https://docs.stagehand.dev/basics/agent

## LESSONS DISTILLED

- Explicit payload contract: map normalized business data to deterministic field expectations.
- Verification loop: fill fields, run `verifyFields`, fix issues, verify again before submit.
- Safety boundaries: avoid hidden/disabled inputs and avoid manual CAPTCHA interaction.
- Structured completion: use a schema so downstream systems get predictable output fields.
- Environment split: local synthetic sandbox by default, public URL when running in Browserbase cloud.

## QUICKSTART

1. `cd typescript/resilient-payment-agent`
2. `pnpm install`
3. `cp .env.example .env`
4. Add API keys for your chosen model provider in `.env` (for Google models, either `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` works)
5. `pnpm start`

## HOW IT RUNS

- Default mode (`STAGEHAND_ENV=LOCAL`) starts a local synthetic checkout site on `TEST_SITE_PORT`.
- The script visits that sandbox URL, fills synthetic payment data, verifies fields, and submits.
- The sandbox emits `browserbase-solving-started` and `browserbase-solving-finished` console events so the agent can pause while CAPTCHA is "solving."
- Final output is JSON with `success`, `confirmation_id`, `charged_amount`, and `error_reasoning`.

## USING BROWSERBASE CLOUD

- Set `STAGEHAND_ENV=BROWSERBASE`.
- Set `TARGET_FORM_URL` to a public URL (not localhost).
- Include `BROWSERBASE_PROJECT_ID` and `BROWSERBASE_API_KEY`.
- Keep synthetic-only data in payloads for demos and testing.

## COMMON PITFALLS

- Browserbase cannot access localhost URLs; publish the sandbox site if you need cloud sessions.
- Missing model API keys will fail initialization.
- Overly broad agent prompts can cause mismatched field mapping; keep labels and payload keys explicit.

## SAFE DEMO NOTES

- No real merchants or customer portals are used by default.
- No PII is required; all sample values are synthetic.
- No payment network call is made; submission renders a fake sandbox confirmation panel.

## HELPFUL RESOURCES

- Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
- Browserbase Docs: https://docs.browserbase.com
- Templates: https://www.browserbase.com/templates
