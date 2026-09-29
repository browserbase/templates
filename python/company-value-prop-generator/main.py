"""Generate a concise company value proposition with Browserbase Fetch API."""

import asyncio
import json
import os

from browserbase import AsyncBrowserbase
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

TARGET_URL = os.environ.get("TARGET_URL", "https://www.browserbase.com")


class ValueProposition(BaseModel):
    value_proposition: str = Field(
        min_length=1,
        description="The company's central value proposition stated on the landing page",
    )
    personalized_opener: str = Field(
        min_length=1,
        description=(
            "A unique English phrase grounded in the value proposition, no more than 9 words, "
            'beginning with "Your"'
        ),
    )


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")

    print(f"Extracting a value proposition from {TARGET_URL} with Fetch API...")
    async with AsyncBrowserbase(api_key=api_key) as api:
        response = await api.fetch_api.create(
            url=TARGET_URL,
            format="json",
            schema=ValueProposition.model_json_schema(),
            allow_redirects=True,
        )
    if not 200 <= response.status_code < 300:
        raise RuntimeError(f"Target returned HTTP {response.status_code}")

    result = ValueProposition.model_validate(response.content)
    print(json.dumps({"target_url": TARGET_URL, **result.model_dump()}, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Value proposition extraction failed: {error}")
        raise SystemExit(1) from error
