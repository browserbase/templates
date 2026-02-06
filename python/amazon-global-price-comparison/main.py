# Amazon Global Price Comparison - See README.md for full documentation

import asyncio
import json
import os
from dataclasses import dataclass

from browserbase import Browserbase
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import AsyncStagehand

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY
load_dotenv()


# Schema for a single product with structured extraction fields
class Product(BaseModel):
    """Schema for extracted product data from Amazon search results"""

    name: str = Field(..., description="The full product title/name")
    price: str = Field(
        default="N/A",
        description=(
            "The product price including currency symbol (e.g., '$29.99', '29,99 EUR', "
            "'29.99 GBP'). If no price is visible, return 'N/A'"
        ),
    )
    rating: str = Field(default="N/A", description="The star rating (e.g., '4.5 out of 5 stars')")
    reviews_count: str = Field(
        default="N/A", description="The number of customer reviews (e.g., '1,234')"
    )
    product_url: str = Field(
        default="N/A",
        description="The full href URL link to the product detail page (starting with https:// or /dp/)",
    )


# Schema for extracting multiple products from search results
class ProductsResult(BaseModel):
    """Schema for extracting multiple products from Amazon search results"""

    products: list[Product] = Field(
        default_factory=list, description="Array of products from search results"
    )


# Country configuration with geolocation proxy settings
# Each country routes traffic through its geographic location to see local pricing
@dataclass
class CountryConfig:
    name: str
    code: str
    city: str | None
    currency: str


# Supported countries for price comparison
# Add or remove countries as needed - see https://docs.browserbase.com/features/proxies for available geolocations
COUNTRIES: list[CountryConfig] = [
    CountryConfig(name="United States", code="US", city=None, currency="USD"),
    CountryConfig(name="United Kingdom", code="GB", city="LONDON", currency="GBP"),
    CountryConfig(name="Germany", code="DE", city="BERLIN", currency="EUR"),
    CountryConfig(name="France", code="FR", city="PARIS", currency="EUR"),
    CountryConfig(name="Italy", code="IT", city="ROME", currency="EUR"),
    CountryConfig(name="Spain", code="ES", city="MADRID", currency="EUR"),
]


# Results structure for each country
@dataclass
class CountryResult:
    country: str
    country_code: str
    currency: str
    products: list[dict]
    error: str | None = None


# Initialize Browserbase SDK for session management with proxies
bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))


async def get_products_for_country(
    search_query: str,
    country: CountryConfig,
    results_count: int = 3,
) -> CountryResult:
    """
    Fetches products from Amazon for a specific country using geolocation proxy.

    Uses Browserbase's managed proxy infrastructure to route traffic through the target country.
    This ensures Amazon shows location-specific pricing and availability.

    Args:
        search_query: The product search term to look up on Amazon
        country: Configuration for the target country including geolocation settings
        results_count: Number of products to extract (default: 3)

    Returns:
        CountryResult with extracted products or error information
    """
    print(f'\n=== Searching Amazon for "{search_query}" in {country.name} ===')

    # Build geolocation config for proxy routing
    geolocation: dict = {"country": country.code}
    if country.city:
        geolocation["city"] = country.city

    # Create Browserbase session with geolocation proxy configuration
    # This ensures all browser traffic routes through the specified geographic location
    print(f"Creating Browserbase session with {country.name} proxy...")
    session = await asyncio.to_thread(
        bb.sessions.create,
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[
            {
                "type": "browserbase",  # Use Browserbase's managed proxy infrastructure
                "geolocation": geolocation,
            }
        ],
    )
    session_id = session.id
    print(f"Session created: https://browserbase.com/sessions/{session_id}")

    # Initialize AsyncStagehand client (v3 API)
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("MODEL_API_KEY"),
    )

    try:
        # Start Stagehand session connected to our proxy-enabled Browserbase session
        print(f"[{country.name}] Initializing Stagehand session...")
        stagehand_session = await client.sessions.create(
            model_name="google/gemini-2.5-flash",
            browserbase_session_id=session_id,  # Connect to existing proxy session
        )

        # Navigate to Amazon homepage to begin search
        print(f"[{country.name}] Navigating to Amazon...")
        await stagehand_session.navigate(url="https://www.amazon.com")

        # Perform search using natural language actions
        print(f"[{country.name}] Searching for: {search_query}")
        await stagehand_session.act(input=f'Type "{search_query}" into the search bar')
        await stagehand_session.act(input="Click the search button")

        # Wait for search results to load
        await asyncio.sleep(2)

        # Extract products from search results using Stagehand's structured extraction
        print(f"[{country.name}] Extracting top {results_count} products...")

        # Use a flattened schema that Gemini can understand (avoids $ref issues)
        products_schema = {
            "type": "object",
            "properties": {
                "products": {
                    "type": "array",
                    "description": "Array of products from search results",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The full product title/name",
                            },
                            "price": {
                                "type": "string",
                                "description": "The product price including currency symbol (e.g., '$29.99'). If no price is visible, return 'N/A'",
                            },
                            "rating": {
                                "type": "string",
                                "description": "The star rating (e.g., '4.5 out of 5 stars')",
                            },
                            "reviews_count": {
                                "type": "string",
                                "description": "The number of customer reviews (e.g., '1,234')",
                            },
                            "product_url": {
                                "type": "string",
                                "description": "The full href URL link to the product detail page",
                            },
                        },
                        "required": ["name"],
                    },
                }
            },
            "required": ["products"],
        }

        extract_response = await stagehand_session.extract(
            instruction=f"""Extract the first {results_count} product search results from this Amazon page. For each product, extract:
            1. name: the full product title
            2. price: the displayed price WITH currency symbol (like $599.99 or 599,99 EUR). If no price shown, use "N/A"
            3. rating: the star rating text (like "4.5 out of 5 stars")
            4. reviews_count: the number of reviews (like "2,508")
            5. product_url: the href link to the product page (starts with /dp/ or https://)

            Only extract actual product listings, skip sponsored ads or recommendations.""",
            schema=products_schema,
        )

        # Parse the extracted data
        extracted_data = extract_response.data.result
        if isinstance(extracted_data, str):
            extracted_data = json.loads(extracted_data)

        products = extracted_data.get("products", [])

        # Clean up products - ensure price is never null and URLs are absolute
        cleaned_products = []
        for p in products:
            product_url = p.get("product_url", "N/A")
            if product_url and product_url.startswith("/"):
                product_url = f"https://www.amazon.com{product_url}"
            elif not product_url:
                product_url = "N/A"

            cleaned_products.append(
                {
                    "name": p.get("name", "Unknown"),
                    "price": p.get("price") or "N/A",
                    "rating": p.get("rating") or "N/A",
                    "reviews_count": p.get("reviews_count") or "N/A",
                    "product_url": product_url,
                }
            )

        print(f"Found {len(cleaned_products)} products in {country.name}")

        # End the Stagehand session
        await stagehand_session.end()

        return CountryResult(
            country=country.name,
            country_code=country.code,
            currency=country.currency,
            products=cleaned_products[:results_count],
        )

    except Exception as error:
        print(f"Error fetching products from {country.name}: {error}")

        return CountryResult(
            country=country.name,
            country_code=country.code,
            currency=country.currency,
            products=[],
            error=str(error),
        )


def display_comparison_table(results: list[CountryResult]) -> None:
    """
    Displays results in a formatted comparison table.

    Shows product name, price, rating, and review count for each country.

    Args:
        results: List of CountryResult objects containing extracted product data
    """
    print("\n" + "=" * 100)
    print("PRICE COMPARISON ACROSS COUNTRIES")
    print("=" * 100)

    # Find the first successful result to get product count
    successful_result = next((r for r in results if r.products), None)
    if not successful_result:
        print("No products found in any country.")
        return

    # Display results for each product position
    max_products = max(len(r.products) for r in results)

    for i in range(max_products):
        print(f"\n--- Product {i + 1} ---")

        # Find the first available product name for this position
        product_name = None
        for r in results:
            if i < len(r.products):
                product_name = r.products[i].get("name")
                break

        if product_name:
            truncated_name = product_name[:77] + "..." if len(product_name) > 80 else product_name
            print(f"Product: {truncated_name}")

        print("\nPrices by Country:")
        print("-" * 70)

        for result in results:
            country_pad = result.country.ljust(20)
            if result.error:
                print(f"  {country_pad} | Error: {result.error}")
            elif i < len(result.products):
                product = result.products[i]
                price = product.get("price", "N/A")
                price_pad = price.ljust(18)
                rating = product.get("rating", "N/A")
                rating_short = rating.split(" out")[0] if " out" in rating else rating
                rating_pad = rating_short.ljust(6)
                reviews = product.get("reviews_count", "N/A")
                print(f"  {country_pad} | {price_pad} | {rating_pad} stars | {reviews} reviews")
            else:
                print(f"  {country_pad} | Not available in this country")

    print("\n" + "=" * 100)


async def main():
    """
    Main application entry point.

    Orchestrates the entire price comparison automation process:
    1. Initializes configuration from environment variables
    2. Fetches products from Amazon for each country concurrently
    3. Displays formatted comparison table
    4. Outputs JSON results for programmatic use
    """
    # Configure search parameters
    search_query = "iPhone 15 Pro Max 256GB"
    results_count = 3

    print("=" * 60)
    print("AMAZON PRICE COMPARISON - GEOLOCATION PROXY DEMO")
    print("=" * 60)
    print(f"Search Query: {search_query}")
    print(f"Results per country: {results_count}")
    print(f"Countries: {', '.join(c.code for c in COUNTRIES)}")
    print("=" * 60)

    # Process all countries concurrently for faster execution
    # Each country uses its own browser session, so they can run in parallel
    print(f"\nFetching prices from {len(COUNTRIES)} countries concurrently...")

    results = await asyncio.gather(
        *[get_products_for_country(search_query, country, results_count) for country in COUNTRIES]
    )

    # Display formatted comparison table
    display_comparison_table(list(results))

    # Output JSON results for programmatic use
    print("\n--- JSON OUTPUT ---")
    json_results = [
        {
            "country": r.country,
            "countryCode": r.country_code,
            "currency": r.currency,
            "products": r.products,
            "error": r.error,
        }
        for r in results
    ]
    print(json.dumps(json_results, indent=2))

    print("\n=== Price comparison completed ===")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("\nCommon issues:")
        print(
            "  - Check .env file has BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and MODEL_API_KEY"
        )
        print(
            "  - Verify geolocation proxy locations are valid "
            "(see https://docs.browserbase.com/features/proxies)"
        )
        print("  - Ensure you have sufficient Browserbase credits")
        print("  - Browserbase Developer plan or higher is required to use proxies")
        print("Docs: https://docs.stagehand.dev/v3/sdk/python")
        exit(1)
