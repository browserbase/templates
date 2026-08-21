"""Shared Deep Agents + Stagehand V4 code-mode setup for this template."""

from __future__ import annotations

import os

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

SERVER_NAME = "stagehand_browser"

STAGEHAND_DEEPAGENTS_SOURCE = (
    "git+https://github.com/browserbase/stagehand.git@main"
    "#subdirectory=packages/integrations/deepagents"
)

BROWSER_INSTRUCTIONS = """You control one persistent Browserbase browser through exactly three
Stagehand code-mode tools:
- snapshot: inspect the active page and hydrate bracketed element IDs.
- run: execute snapshot actions or JavaScript with the Playwright-shaped page API.
- screenshot: inspect the rendered page visually.

Use run with deterministic page APIs for known URLs and structured pages. Use snapshot before
interacting with an unfamiliar UI. Snapshot IDs are valid only for the latest snapshot. Do not
launch another browser, and never cite a URL unless you opened it in the browser.
"""


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def create_gateway_model(default_model: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=os.environ.get("DEEPAGENTS_MODEL", default_model),
        api_key=SecretStr(require_env("AI_GATEWAY_API_KEY")),
        base_url="https://ai-gateway.vercel.sh/v1",
    )


def create_stagehand_client() -> MultiServerMCPClient:
    server_env = {
        "BROWSERBASE_API_KEY": require_env("BROWSERBASE_API_KEY"),
        "STAGEHAND_BROWSER": "browserbase",
        "STAGEHAND_RUN_TIMEOUT_MS": os.environ.get("STAGEHAND_RUN_TIMEOUT_MS", "120000"),
    }
    return MultiServerMCPClient(
        {
            SERVER_NAME: {
                "transport": "stdio",
                "command": os.environ.get("UVX_COMMAND", "uvx"),
                "args": [
                    "--from",
                    STAGEHAND_DEEPAGENTS_SOURCE,
                    "--with",
                    "stagehand==4.0.0",
                    "stagehand-deepagents-mcp",
                ],
                "env": server_env,
            }
        }
    )
