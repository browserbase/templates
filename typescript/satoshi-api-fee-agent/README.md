# Satoshi API Fee Agent

## AT A GLANCE

- Goal: give a Browserbase Stagehand agent live Bitcoin fee intelligence before
  it acts on a payment, wallet, exchange, or checkout page.
- Uses Satoshi API's free `GET /api/v1/fees/recommended` endpoint for the
  first no-token fee decision.
- Opens a Browserbase cloud browser, visits a live Bitcoin fee page, and
  extracts visible page context to compare with the API response.
- Documents the optional x402 paid path, starting with `GET /api/v1/fees/now`,
  for accountless premium Bitcoin data.

## GLOSSARY

- Satoshi API: a self-hostable Bitcoin REST API and hosted service for
  structured Bitcoin data.
  Docs -> https://bitcoinsapi.com
- fee recommendation: current sat/vB guidance for next-block and lower-urgency
  confirmation targets.
  Docs -> https://bitcoinsapi.com/docs
- x402: HTTP `402 Payment Required` flow for accountless pay-per-call API
  access.
  Docs -> https://bitcoinsapi.com/x402/start

## QUICKSTART

1. cd typescript/satoshi-api-fee-agent
2. pnpm install
3. cp .env.example .env
4. Add your Browserbase API key to .env
5. pnpm start

## EXPECTED OUTPUT

- Fetches live Bitcoin fee guidance from Satoshi API
- Starts a Browserbase Stagehand session
- Opens `https://mempool.space/` for live browser context
- Extracts visible fee page context
- Prints the Satoshi API recommendation, Browserbase session link, page title,
  and extracted page summary
- Closes the browser session cleanly

## COMMON PITFALLS

- Missing Browserbase credentials: verify `.env` contains `BROWSERBASE_API_KEY`
- Satoshi API rate limits: add `SATOSHI_API_KEY` for higher limits, or self-host
  Satoshi API
- Paid endpoint confusion: use `/api/v1/fees/recommended` for the free
  quickstart; `/api/v1/fees/now` is the x402 paid first-call route
- Page extraction drift: keep the Satoshi API decision separate from selectors;
  Browserbase handles browser context while Satoshi API handles the Bitcoin fee
  decision

## USE CASES

- Fee-aware payment agents: decide whether to send now or wait before clicking
  through a payment flow
- Wallet and checkout QA: compare UI fee suggestions against live mempool
  guidance
- Exchange monitoring: attach fee context to Browserbase session replays
- x402-native workflows: combine Browserbase browser sessions with paid Bitcoin
  data calls on demand

## NEXT STEPS

- Swap `https://mempool.space/` for your wallet, checkout, or exchange URL
- Persist the Satoshi API response next to the Browserbase session replay URL
- Call `GET /api/v1/tx/{txid}/status` after a Browserbase agent finds or submits
  a transaction ID
- Try the x402 paid route at `GET /api/v1/fees/now` when you need accountless
  premium analysis

## HELPFUL RESOURCES

Satoshi API: https://bitcoinsapi.com
Satoshi API source: https://github.com/Bortlesboat/bitcoin-api
Browserbase Docs: https://docs.browserbase.com
Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
Browserbase x402 Docs: https://docs.browserbase.com/integrations/x402/introduction
Templates: https://www.browserbase.com/templates
