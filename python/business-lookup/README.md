# Business lookup with a Python agent

Stagehand is the SDK for browser agents.

This template uses LangChain Deep Agents for the reasoning loop and Stagehand V4 code mode for the
browser. The agent opens San Francisco's official Open Data API, finds an exact DBA record, and
returns a validated Pydantic object.

## How it works

- `create_deep_agent` owns planning, model calls, and structured output.
- Stagehand code mode exposes one persistent Browserbase session through `run`, `snapshot`, and
  `screenshot` MCP tools.
- Vercel AI Gateway supplies the bring-your-own agent model.
- The Stagehand MCP server runs in an isolated `uvx` environment because the current Stagehand and
  Deep Agents clients require different `websockets` versions.
- The template closes the MCP session and browser process automatically.

## Quickstart

Requirements: Python 3.11–3.13 and [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY to .env.
uv sync
uv run python main.py
```

The first run installs the Stagehand Deep Agents integration from `stagehand/main` in `uvx`; the
integration pins its Stagehand server dependency to `stagehand==4.0.0`.

## Expected outcome

The agent opens the official SF Open Data JSON endpoint and returns the exact Jalebi Street record,
including its business account number, location ID, address, NAICS data when present, and the
official source URL. The script exits nonzero if the returned DBA or evidence source does not match.

## Configuration

- `BROWSERBASE_API_KEY`: launches the Browserbase session.
- `AI_GATEWAY_API_KEY`: authenticates the Deep Agents model through Vercel AI Gateway.
- `DEEPAGENTS_MODEL`: optional model override; defaults to `anthropic/claude-sonnet-4.6`.
- `STAGEHAND_RUN_TIMEOUT_MS`: optional browser-tool timeout; defaults to 120 seconds.

## Resources

- [Stagehand V4 documentation](https://docs.stagehand.dev/v4)
- [Stagehand Deep Agents integration](https://github.com/browserbase/stagehand/tree/main/packages/integrations/deepagents)
- [Browserbase sessions](https://www.browserbase.com/overview/sessions)
