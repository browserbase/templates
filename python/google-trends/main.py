# Stagehand + Browserbase: Google Trends Keywords Extractor - See README.md for full documentation

import asyncio
import json
import os
from typing import List

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from stagehand import AsyncStagehand


class TrendingKeyword(BaseModel):
    """Schema for a single trending keyword from Google Trends."""

    rank: int = Field(description="Position in the trending list (1, 2, 3, etc.)")
    keyword: str = Field(description="The main trending search term or keyword")


class TrendingKeywordsList(BaseModel):
    """Schema for extracting a list of trending keywords."""

    trending_keywords: List[TrendingKeyword] = Field(
        description="List of trending keywords extracted from Google Trends"
    )


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


# Load environment variables
load_dotenv()

# Configuration variables
country_code = "US"  # Two-letter ISO code (US, GB, IN, DE, FR, BR)
limit = 20  # Max keywords to return
language = "en-US"  # Language code for results


async def main():
    """
    Extracts trending keywords from Google Trends for a specific country.
    Uses Stagehand's structured extraction with JSON schema for type-safe data.
    """
    print("Starting Google Trends Keywords Extractor...")
    print(f"Country Code: {country_code}")
    print(f"Language: {language}")
    print(f"Limit: {limit} keywords")

    # Initialize AsyncStagehand client (v3 architecture)
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a Stagehand session with Gemini model
    start_response = await client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id
    print(f"Stagehand session started: {session_id}")

    try:
        # Provide live session URL for debugging and monitoring
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Build and navigate to Google Trends URL with country code and language
        trends_url = f"https://trends.google.com/trending?geo={country_code.upper()}&hl={language}"
        print(f"Navigating to: {trends_url}")
        await client.sessions.navigate(id=session_id, url=trends_url)
        print("Page loaded successfully")

        # Dismiss any consent/welcome dialogs that block content
        try:
            print("Checking for consent dialogs...")
            await client.sessions.act(
                id=session_id,
                input='Click the "Got it" button if visible',
                timeout=5.0,
            )
            # Small delay to let the dialog close and content load
            await asyncio.sleep(1.5)
        except Exception:
            # No dialog present, continue
            print("No consent dialog found, continuing...")

        # Generate JSON schema from Pydantic model for structured extraction
        schema = dereference_schema(TrendingKeywordsList.model_json_schema())

        # Extract trending keywords using Stagehand's structured extraction
        print("Extracting trending keywords from table...")
        extract_response = await client.sessions.extract(
            id=session_id,
            instruction=(
                f"Extract the trending search keywords from the Google Trends table. "
                f"Each row has a trending topic/keyword shown as a button "
                f"(like 'catherine ohara', 'don lemon arrested', 'fed chair', etc.). "
                f"For each trend, extract the main keyword text and assign a rank "
                f"starting from 1 for the first trend. Return up to {limit} items."
            ),
            schema=schema,
        )

        # Parse extraction results from wrapper model
        extraction_result = extract_response.data.result
        if isinstance(extraction_result, dict) and "trending_keywords" in extraction_result:
            extracted_keywords = extraction_result["trending_keywords"]
            limited_keywords = extracted_keywords[:limit]
        else:
            limited_keywords = []

        print(f"Successfully extracted {len(limited_keywords)} trending keywords")

        # Build output structure with metadata
        result = {
            "country_code": country_code.upper(),
            "language": language,
            "extracted_at": __import__("datetime").datetime.now().isoformat(),
            "trending_keywords": limited_keywords,
        }

        # Display results in formatted JSON
        print("\n=== Results ===")
        print(json.dumps(result, indent=2))
        print(f"\nExtraction complete! Found {len(limited_keywords)} trending keywords.")

    except Exception as error:
        print(f"Error extracting trending keywords: {error}")

        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify GOOGLE_API_KEY is set in environment")
        print("3. Ensure country code is a valid 2-letter ISO code (US, GB, IN, DE, etc.)")
        print("4. Verify Browserbase account has sufficient credits")
        print("5. Check if Google Trends page structure has changed")

        raise

    finally:
        # End the Stagehand session
        print("Closing browser session...")
        await client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set in environment")
        print("Docs: https://docs.stagehand.dev/reference/python/overview")
        exit(1)
