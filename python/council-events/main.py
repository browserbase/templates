"""Extract current Philadelphia City Council events with Browserbase Fetch API."""

import asyncio
import json
import os
from datetime import UTC, datetime

from browserbase import AsyncBrowserbase
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

CALENDAR_URL = "https://phila.legistar.com/Calendar.aspx"


class CouncilEvent(BaseModel):
    name: str = Field(description="The event or meeting name")
    date: str = Field(description="The displayed event date")
    time: str = Field(description="The displayed event time")


class CouncilEvents(BaseModel):
    events: list[CouncilEvent]


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")

    year = datetime.now(UTC).year
    calendar_url = f"{CALENDAR_URL}?Mode={year}"
    schema = CouncilEvents.model_json_schema()
    schema["properties"]["events"]["description"] = (
        f"Every {year} event displayed in the council calendar table"
    )

    print(f"Fetching the {year} Philadelphia Council calendar...")
    async with AsyncBrowserbase(api_key=api_key) as api:
        response = await api.fetch_api.create(
            url=calendar_url,
            format="json",
            schema=schema,
            allow_redirects=True,
        )
    if not 200 <= response.status_code < 300:
        raise RuntimeError(f"Council calendar returned HTTP {response.status_code}")

    result = CouncilEvents.model_validate(response.content)
    print(f"Found {len(result.events)} events for {year}.")
    print(
        json.dumps(
            {"year": year, "source_url": calendar_url, **result.model_dump(mode="json")},
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Council event extraction failed: {error}")
        raise SystemExit(1) from error
