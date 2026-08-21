# Company address finder with Python agents

Stagehand is the SDK for browser agents.

This template gives one LangChain Deep Agent at a time a persistent Stagehand V4 browser. Each
agent finds a company's official homepage and legal pages, then returns a validated physical
mailing address when the company publishes one.

## How it works

- `create_deep_agent` owns planning, model calls, and Pydantic structured output.
- Stagehand code mode exposes `run`, `snapshot`, and `screenshot` over a stateful MCP session.
- Vercel AI Gateway supplies the bring-your-own agent model.
- Each company gets a separate Browserbase session; `MAX_CONCURRENT` controls the batch size.
- The Stagehand server runs in an isolated `uvx` environment to keep its dependencies separate
  from the Deep Agents client.

## Quickstart

Requirements: Python 3.11–3.13 and [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY to .env.
uv sync
uv run python main.py
```

Edit `COMPANY_NAMES` in `main.py` to change the batch. Keep `MAX_CONCURRENT = 1` unless your
Browserbase plan supports enough simultaneous sessions.

The first run installs the Stagehand Deep Agents integration from `stagehand/main` in `uvx`; the
integration pins its Stagehand server dependency to `stagehand==4.0.0`.

## Expected outcome

The script processes Browserbase, Mintlify, Wordware, and Reducto. For each company it returns the
official homepage, Terms and Privacy links when found, and a physical address when published. A
missing address may be `null`; a per-company browser failure is included in that company's output.

## Configuration

- `BROWSERBASE_API_KEY`: launches each Browserbase session.
- `AI_GATEWAY_API_KEY`: authenticates the Deep Agents model through Vercel AI Gateway.
- `DEEPAGENTS_MODEL`: optional model override; defaults to `anthropic/claude-sonnet-4.6`.
- `STAGEHAND_RUN_TIMEOUT_MS`: optional browser-tool timeout; defaults to 120 seconds.

## Resources

- [Stagehand V4 documentation](https://docs.stagehand.dev/v4)
- [Stagehand Deep Agents integration](https://github.com/browserbase/stagehand/tree/main/packages/integrations/deepagents)
- [Browserbase concurrency](https://docs.browserbase.com/features/concurrency-rate-limits)
