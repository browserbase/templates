"""Run a Gemini browser-research agent with Deep Agents and Stagehand V4 code mode."""

from __future__ import annotations

import asyncio
from datetime import date

from agent_runtime import (
    BROWSER_INSTRUCTIONS,
    SERVER_NAME,
    create_gateway_model,
    create_stagehand_client,
)
from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_mcp_adapters.tools import load_mcp_tools

load_dotenv()


def message_text(message: object) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        )
    return str(content)


async def main() -> None:
    today = date.today().isoformat()
    instruction = (
        f"As of {today}, use these two live sources to find the next visible solar eclipse in "
        "North America and its expected date, then the one after that: "
        "https://eclipse.gsfc.nasa.gov/solar.html and "
        "https://www.timeanddate.com/eclipse/list-solar.html?region=north-america. "
        "Open and cross-check both sources, then cite each URL."
    )
    print("Executing instruction:", instruction)

    client = create_stagehand_client()
    async with client.session(SERVER_NAME) as session:
        tools = await load_mcp_tools(session)
        agent = create_deep_agent(
            model=create_gateway_model("google/gemini-3-flash-preview"),
            tools=tools,
            system_prompt=(
                BROWSER_INSTRUCTIONS
                + "\nUse no more than six browser-tool calls. Prefer deterministic browser APIs, "
                "cross-check at least two reliable sources, and return an evidence-backed answer "
                "after finding two future eclipse dates."
            ),
        )
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": instruction}]},
            config={"recursion_limit": 25},
        )
        answer = message_text(result["messages"][-1]).strip()

    print(answer)
    print("Stagehand code-mode session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Error in Gemini browser agent example: {error}")
        print("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env")
        raise SystemExit(1) from error
