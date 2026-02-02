# Stagehand + Browserbase: Amazon Product Scraping
# See README.md for full documentation

import asyncio
import json
import os
from typing import List

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from stagehand import AsyncStagehand


class Product(BaseModel):
    """Schema for a single Amazon product."""

    name: str = Field(description="The full product title/name")
    price: str = Field(description="The product price including currency symbol (e.g., '$29.99')")
    rating: str = Field(description="The star rating (e.g., '4.5 out of 5 stars')")
    reviews_count: str = Field(description="The number of customer reviews (e.g., '1,234')")
    product_url: str = Field(description="The URL link to the product detail page on Amazon")


class ProductsList(BaseModel):
    """Schema for extracting a list of Amazon products."""

    products: List[Product] = Field(description="Array of the first 3 products from search results")


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
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY (or GOOGLE_API_KEY)
load_dotenv()

# ============= CONFIGURATION =============
# Update this value to search for different products
SEARCH_QUERY = "Seiko 5"
# =========================================


async def main():
    """
    Main application entry point.

    Orchestrates Amazon product scraping automation:
    1. Initializes Stagehand with Browserbase for cloud browser automation
    2. Navigates to Amazon and performs a product search
    3. Extracts structured product data (name, price, rating, reviews, URL)
    4. Outputs results as JSON
    """
    print("Starting Amazon Product Scraping...")

    # Initialize AsyncStagehand client (v3 BYOB architecture)
    # Uses environment variables: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("MODEL_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a Stagehand session with the specified model
    start_response = await client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id
    print("Stagehand initialized successfully!")
    print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

    try:
        # Alternative: skip the search bar and go straight to results by building the search URL.
        # Uncomment below to use direct navigation instead of stagehand act() typing + clicking.
        # from urllib.parse import quote_plus
        # encoded_query = quote_plus(SEARCH_QUERY)
        # search_url = f"https://www.amazon.com/s?k={encoded_query}"
        # print(f"Navigating to: {search_url}")
        # await client.sessions.navigate(id=session_id, url=search_url)

        # Navigate to Amazon homepage to begin search
        print("Navigating to Amazon...")
        await client.sessions.navigate(id=session_id, url="https://www.amazon.com")

        # Perform search using natural language actions
        print(f"Searching for: {SEARCH_QUERY}")
        await client.sessions.act(id=session_id, input=f"Type {SEARCH_QUERY} into the search bar")
        await client.sessions.act(id=session_id, input="Click the search button")

        # Extract structured product data using JSON schema for type safety
        print("Extracting product data...")
        extract_response = await client.sessions.extract(
            id=session_id,
            instruction=(
                "Extract the details of the FIRST 3 products in the search results. "
                "Get the product name, price, star rating, number of reviews, "
                "and the URL link to the product page."
            ),
            schema=dereference_schema(ProductsList.model_json_schema()),
        )

        # Display extracted products as formatted JSON
        products = extract_response.data.result
        print("Products found:")
        print(json.dumps(products, indent=2))

    except Exception as error:
        print(f"Error during product scraping: {error}")
        raise

    finally:
        # Always close session to release resources and clean up
        await client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in Amazon product scraping: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify MODEL_API_KEY or GOOGLE_API_KEY is set for the model")
        print("  - Verify network connectivity")
        print("Docs: https://docs.stagehand.dev")
        exit(1)
