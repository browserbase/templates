# Stagehand + Browserbase: SEC Filing Research - See README.md for full documentation

import asyncio
import json
import os
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from stagehand import AsyncStagehand


class CompanyInfo(BaseModel):
    """Schema for company information extraction."""

    companyName: str = Field(description="Official company name")
    cik: str = Field(description="Central Index Key (CIK) number")


class Filing(BaseModel):
    """Schema for a single SEC filing."""

    type: str = Field(description="Filing type (e.g., 10-K, 10-Q, 8-K)")
    date: str = Field(description="Filing date in YYYY-MM-DD format")
    description: str = Field(description="Full description of the filing")
    accessionNumber: str = Field(description="SEC accession number")
    fileNumber: Optional[str] = Field(default=None, description="File/Film number")


class FilingsList(BaseModel):
    """Schema for extracting a list of SEC filings."""

    filings: List[Filing] = Field(description="List of SEC filings")


def dereference_schema(schema: dict) -> dict:
    """Inline all $ref references in a JSON schema for Gemini compatibility."""
    defs = schema.pop("$defs", {})

    def resolve_refs(obj):
        if isinstance(obj, dict):
            if "$ref" in obj:
                ref_path = obj["$ref"].split("/")[-1]
                return resolve_refs(defs.get(ref_path, {}))
            return {k: resolve_refs(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [resolve_refs(item) for item in obj]
        return obj

    return resolve_refs(schema)


# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY
load_dotenv()

# Search query - can be company name, ticker symbol, or CIK number
# Examples: "Apple Inc", "AAPL", "0000320193"
SEARCH_QUERY = "Apple Inc"

# Number of filings to retrieve
NUM_FILINGS = 5


async def main():
    """
    Searches SEC EDGAR for a company (by name, ticker, or CIK) and extracts
    recent filing metadata: type, date, description, accession number, file number.
    Uses Stagehand + Browserbase for AI-powered browser automation.
    """
    print("Starting SEC Filing Research...")
    print(f"Search query: {SEARCH_QUERY}")
    print(f"Retrieving {NUM_FILINGS} most recent filings\n")

    # Initialize AsyncStagehand client (v3 architecture)
    # Uses environment variables: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("MODEL_API_KEY")
        or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
    )

    # Start a new browser session
    start_response = await client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id
    print(f"Stagehand session started: {session_id}")

    try:
        # Provide live session URL for debugging and monitoring
        print(f"Live View: https://browserbase.com/sessions/{session_id}")

        # Navigate to modern SEC EDGAR company search page
        print("\nNavigating to SEC EDGAR...")
        await client.sessions.navigate(
            id=session_id,
            url="https://www.sec.gov/edgar/searchedgar/companysearch.html",
        )

        # Enter search query in the Company and Person Lookup search box
        print(f"Searching for: {SEARCH_QUERY}")
        await client.sessions.act(
            id=session_id,
            input="Click on the Company and Person Lookup search textbox",
        )
        await client.sessions.act(
            id=session_id,
            input=f'Type "{SEARCH_QUERY}" in the search field',
        )

        # Submit search to load company results
        await client.sessions.act(id=session_id, input="Click the search submit button")

        # Select the matching company from results to view their filings page
        print("Selecting the correct company from results...")
        await client.sessions.act(
            id=session_id,
            input=f'Click on "{SEARCH_QUERY}" in the search results to view their filings',
        )

        # Extract company information from the filings page
        print("Extracting company information...")
        company_info = {"companyName": SEARCH_QUERY, "cik": "Unknown"}
        try:
            extract_response = await client.sessions.extract(
                id=session_id,
                instruction="Extract the company name and CIK number from the page header or company information section. The CIK should be a numeric identifier.",
                schema=dereference_schema(CompanyInfo.model_json_schema()),
            )
            extracted = extract_response.data.result
            if extracted and isinstance(extracted, dict) and extracted.get("companyName"):
                company_info = extracted
        except Exception as error:
            print(
                f"Could not extract company info, using search query as company name: {error}"
            )

        # Extract filing metadata from the filings table using structured schema
        print(f"Extracting the {NUM_FILINGS} most recent filings...")
        filings_response = await client.sessions.extract(
            id=session_id,
            instruction=f"Extract the {NUM_FILINGS} most recent SEC filings from the filings table. For each filing, get: the filing type (column: Filings, like 10-K, 10-Q, 8-K), the filing date (column: Filing Date), description, accession number (from the link or description), and file/film number if shown.",
            schema=dereference_schema(FilingsList.model_json_schema()),
        )
        filings_data = filings_response.data.result

        # Build result object with company info and normalized filing list
        filings_list = (
            (filings_data.get("filings") or [])[:NUM_FILINGS] if filings_data else []
        )
        result = {
            "company": company_info.get("companyName", SEARCH_QUERY),
            "cik": company_info.get("cik", "Unknown"),
            "searchQuery": SEARCH_QUERY,
            "filings": [
                {
                    "type": f.get("type", ""),
                    "date": f.get("date", ""),
                    "description": f.get("description", ""),
                    "accessionNumber": f.get("accessionNumber", ""),
                    "fileNumber": f.get("fileNumber", ""),
                }
                for f in filings_list
            ],
        }

        # Log summary and per-filing details to console
        print("\n" + "=" * 60)
        print("SEC FILING METADATA")
        print("=" * 60)
        print(f"Company: {result['company']}")
        print(f"CIK: {result['cik']}")
        print(f"Search Query: {result['searchQuery']}")
        print(f"Filings Retrieved: {len(result['filings'])}")
        print("=" * 60)

        # Display each filing's type, date, description, accession number, file number
        for index, filing in enumerate(result["filings"], start=1):
            print(f"\nFiling {index}:")
            print(f"  Type: {filing['type']}")
            print(f"  Date: {filing['date']}")
            desc = filing["description"]
            print(f"  Description: {desc[:80]}{'...' if len(desc) > 80 else ''}")
            print(f"  Accession Number: {filing['accessionNumber']}")
            print(f"  File Number: {filing['fileNumber']}")

        # Output full result as JSON for piping or integration
        print("\n" + "=" * 60)
        print("JSON OUTPUT:")
        print("=" * 60)
        print(json.dumps(result, indent=2))

    finally:
        # Always close session to release resources and clean up
        await client.sessions.end(id=session_id)
        print("\nSession closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify MODEL_API_KEY is set (e.g. Google API key for Gemini)")
        print("  - Verify internet connection and SEC website accessibility")
        print("  - Ensure the search query is valid (company name, ticker, or CIK)")
        print("Docs: https://docs.stagehand.dev/reference/python/overview")
        exit(1)