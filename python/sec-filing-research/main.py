"""Retrieve recent SEC filings with Browserbase Fetch API."""

import asyncio
import json
import os
import re
from typing import Any

from browserbase import AsyncBrowserbase
from dotenv import load_dotenv

load_dotenv()

SEARCH_QUERY = os.environ.get("SEARCH_QUERY", "Apple Inc")
NUM_FILINGS = int(os.environ.get("NUM_FILINGS", "5"))
COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def raw_json(response: Any) -> Any:
    if not 200 <= response.status_code < 300:
        raise RuntimeError(f"SEC returned HTTP {response.status_code}")
    if not isinstance(response.content, str):
        raise RuntimeError("Expected SEC to return raw JSON content")
    return json.loads(response.content)


async def resolve_cik(api: AsyncBrowserbase, query: str) -> str:
    stripped = query.strip()
    if stripped.isdigit():
        return stripped.zfill(10)

    response = await api.fetch_api.create(
        url=COMPANY_TICKERS_URL,
        format="raw",
        allow_redirects=True,
    )
    ticker_file = raw_json(response)
    if not isinstance(ticker_file, dict):
        raise RuntimeError("SEC company list was not a JSON object")

    target = normalized(query)
    company = next(
        (
            candidate
            for candidate in ticker_file.values()
            if isinstance(candidate, dict)
            and (
                normalized(str(candidate.get("ticker", ""))) == target
                or normalized(str(candidate.get("title", ""))) == target
            )
        ),
        None,
    )
    if company is None:
        raise RuntimeError(f"No exact SEC company or ticker match for {query!r}")
    return str(company["cik_str"]).zfill(10)


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")
    if NUM_FILINGS < 1:
        raise RuntimeError("NUM_FILINGS must be a positive integer")

    async with AsyncBrowserbase(api_key=api_key) as api:
        print(f"Resolving {SEARCH_QUERY!r} through the official SEC company list...")
        cik = await resolve_cik(api, SEARCH_QUERY)
        submissions_url = f"https://data.sec.gov/submissions/CIK{cik}.json"

        print(f"Fetching recent filings for CIK {cik}...")
        response = await api.fetch_api.create(
            url=submissions_url,
            format="raw",
            allow_redirects=True,
        )
        submissions = raw_json(response)

    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    if not submissions.get("name") or not forms:
        raise RuntimeError("SEC submissions response did not contain recent filings")

    def value_at(field: str, index: int) -> str:
        values = recent.get(field, [])
        return str(values[index]) if index < len(values) else ""

    filings = []
    for index, form in enumerate(forms[:NUM_FILINGS]):
        filings.append(
            {
                "type": form,
                "date": value_at("filingDate", index),
                "description": value_at("primaryDocDescription", index),
                "accession_number": value_at("accessionNumber", index),
                "file_number": value_at("fileNumber", index),
                "primary_document": value_at("primaryDocument", index),
            }
        )

    result = {
        "company": submissions["name"],
        "cik": cik,
        "search_query": SEARCH_QUERY,
        "source_url": submissions_url,
        "filings": filings,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"SEC filing research failed: {error}")
        raise SystemExit(1) from error
