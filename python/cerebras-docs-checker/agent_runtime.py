"""Cerebras Deep Agents + Stagehand V4 code-mode setup."""

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
BROWSER_INSTRUCTIONS = """You control one persistent Browserbase browser through the Stagehand
V4 code-mode tools snapshot, run, and screenshot. Inspect before acting, prefer deterministic
page APIs, and return only evidence from pages you actually opened.
"""


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def create_cerebras_model(model: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=SecretStr(require_env("CEREBRAS_API_KEY")),
        base_url="https://api.cerebras.ai/v1",
    )


def create_stagehand_client() -> MultiServerMCPClient:
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
                "env": {
                    "BROWSERBASE_API_KEY": require_env("BROWSERBASE_API_KEY"),
                    "STAGEHAND_BROWSER": "browserbase",
                    "STAGEHAND_RUN_TIMEOUT_MS": "120000",
                },
            }
        }
    )
