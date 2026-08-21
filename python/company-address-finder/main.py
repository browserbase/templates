"""Find company legal pages and addresses with Deep Agents and Stagehand V4 code mode."""

from __future__ import annotations

import asyncio

from agent_runtime import (
    BROWSER_INSTRUCTIONS,
    SERVER_NAME,
    create_gateway_model,
    create_stagehand_client,
)
from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_mcp_adapters.tools import load_mcp_tools
from pydantic import BaseModel, ConfigDict

load_dotenv()

COMPANY_NAMES = ["Browserbase", "Mintlify", "Wordware", "Reducto"]

# Values above one require enough Browserbase concurrency for one browser per company.
MAX_CONCURRENT = 1


class CompanyData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_name: str
    homepage_url: str
    terms_of_service_link: str | None
    privacy_policy_link: str | None
    address: str | None


async def process_company(company_name: str) -> CompanyData:
    print(f"Processing {company_name}...")
    client = create_stagehand_client()

    try:
        async with client.session(SERVER_NAME) as session:
            tools = await load_mcp_tools(session)
            agent = create_deep_agent(
                model=create_gateway_model("anthropic/claude-sonnet-4.6"),
                tools=tools,
                system_prompt=(
                    BROWSER_INSTRUCTIONS
                    + "\nUse no more than eight browser-tool calls. Verify every returned URL "
                    "belongs to the requested company's official site, then return the structured "
                    "response immediately."
                ),
                response_format=CompanyData,
            )
            result = await agent.ainvoke(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                f"Find the official homepage for {company_name!r}, then find its "
                                "Terms of Service and Privacy Policy pages. Open the relevant legal "
                                "pages and extract the physical mailing address from Terms, falling "
                                "back to Privacy. Return null for a link or address only after "
                                "checking the relevant official pages."
                            ),
                        }
                    ]
                },
                config={"recursion_limit": 30},
            )
            company: CompanyData = result["structured_response"]

        return company
    except Exception as error:
        print(f"[{company_name}] Error: {error}")
        return CompanyData(
            company_name=company_name,
            homepage_url="",
            terms_of_service_link=None,
            privacy_policy_link=None,
            address=f"Error: {error}",
        )


async def main() -> None:
    print("Starting Company Address Finder...")
    results: list[CompanyData] = []
    max_concurrent = max(1, MAX_CONCURRENT)

    for index in range(0, len(COMPANY_NAMES), max_concurrent):
        batch = COMPANY_NAMES[index : index + max_concurrent]
        results.extend(await asyncio.gather(*(process_company(name) for name in batch)))

    print("Results:")
    print("[" + ",\n".join(company.model_dump_json(indent=2) for company in results) + "]")
    print(f"Complete: processed {len(results)}/{len(COMPANY_NAMES)} companies")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Application error: {error}")
        print("Check BROWSERBASE_API_KEY and AI_GATEWAY_API_KEY in .env")
        raise SystemExit(1) from error
