"""Look up an official business record with the Browserbase Fetch API."""

from __future__ import annotations

import asyncio
import json
import os
from urllib.parse import urlencode

from browserbase import AsyncBrowserbase
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field

load_dotenv()

BUSINESS_NAME = os.environ.get("BUSINESS_NAME", "Jalebi Street")
DATASET_URL = "https://data.sfgov.org/resource/g8m3-pdis.json"


class RawBusinessRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dba_name: str
    ownership_name: str | None = None
    ttxid: str
    uniqueid: str | None = None
    full_business_address: str | None = None
    dba_start_date: str | None = None
    dba_end_date: str | None = None
    neighborhoods_analysis_boundaries: str | None = None
    self_reported_naics_code: str | None = None
    lic: str | None = None
    lic_code_description: str | None = None


class BusinessInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dba_name: str = Field(description="DBA name")
    ownership_name: str | None
    business_account_number: str = Field(description="Business account number (ttxid)")
    location_id: str | None = Field(description="Location ID (uniqueid)")
    street_address: str | None
    business_start_date: str | None
    business_end_date: str | None
    neighborhood: str | None
    naics_code: str | None
    license_code: str | None
    license_code_description: str | None
    source_url: str


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")

    source_url = f"{DATASET_URL}?{urlencode({'$q': BUSINESS_NAME, '$limit': 5})}"
    print(f"Fetching official SF Open Data records for {BUSINESS_NAME!r}...")
    async with AsyncBrowserbase(api_key=api_key) as api:
        response = await api.fetch_api.create(
            url=source_url,
            format="raw",
            allow_redirects=True,
        )
    if not 200 <= response.status_code < 300:
        raise RuntimeError(f"SF Open Data returned HTTP {response.status_code}")
    if not isinstance(response.content, str):
        raise RuntimeError("Expected a raw JSON response from SF Open Data")

    raw_records = json.loads(response.content)
    if not isinstance(raw_records, list):
        raise RuntimeError("Expected SF Open Data to return a JSON array")
    records = [RawBusinessRecord.model_validate(candidate) for candidate in raw_records]
    record = next(
        (
            candidate
            for candidate in records
            if candidate.dba_name.casefold() == BUSINESS_NAME.casefold()
        ),
        None,
    )
    if record is None:
        raise RuntimeError(f"No exact DBA record found in {len(records)} returned records")

    business = BusinessInfo(
        dba_name=record.dba_name,
        ownership_name=record.ownership_name,
        business_account_number=record.ttxid,
        location_id=record.uniqueid,
        street_address=record.full_business_address,
        business_start_date=record.dba_start_date,
        business_end_date=record.dba_end_date,
        neighborhood=record.neighborhoods_analysis_boundaries,
        naics_code=record.self_reported_naics_code,
        license_code=record.lic,
        license_code_description=record.lic_code_description,
        source_url=source_url,
    )

    print(business.model_dump_json(indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Business lookup failed: {error}")
        raise SystemExit(1) from error
