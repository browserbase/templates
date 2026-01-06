# Stagehand + Browserbase: Weather Proxy Demo - See README.md for full documentation

import asyncio
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand, StagehandConfig

load_dotenv()


class GeolocationConfig(BaseModel):
    """Configuration for geolocation proxy settings"""

    city: str
    country: str
    state: str | None = None


class WeatherResult(BaseModel):
    """Result structure for weather data extraction"""

    city: str
    country: str
    temperature: float
    unit: str
    error: str | None = None


class TemperatureData(BaseModel):
    """Schema for temperature extraction"""

    temperature: float = Field(..., description="The current temperature value")
    unit: str = Field(..., description="The temperature unit")


async def get_weather_for_location(geolocation: GeolocationConfig) -> WeatherResult:
    """Fetch weather data for a specific location using geolocation proxies."""
    city_name = geolocation.city.replace("_", " ")
    print(f"\n=== Getting weather for {city_name}, {geolocation.country} ===")

    model_api_key = os.environ.get("MODEL_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not model_api_key:
        raise ValueError(
            "MODEL_API_KEY or GOOGLE_API_KEY environment variable is required. "
            "Please set one in your .env file."
        )

    # Build proxy configuration for geolocation routing
    proxy_config = {
        "type": "browserbase",  # Use Browserbase's managed proxy infrastructure for reliable geolocation routing
        "geolocation": {
            "city": geolocation.city,  # City name (case-insensitive, e.g., "NEW_YORK", "new_york", "New York" all work)
            "country": geolocation.country,  # ISO country code (case-insensitive, e.g., "US", "us", "gb", "GB" all work)
        },
    }
    # Add state if provided (required for US locations to ensure accurate geolocation, case-insensitive)
    if geolocation.state:
        proxy_config["geolocation"]["state"] = geolocation.state

    # Initialize Stagehand with geolocation proxy configuration
    # This ensures all browser traffic routes through the specified geographic location
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name=os.environ.get("MODEL_NAME", "google/gemini-2.5-flash"),
        model_api_key=model_api_key,
        verbose=0,
        # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "proxies": [proxy_config],
        },
    )

    stagehand = Stagehand(config)

    try:
        # Initialize browser session to start automation
        print(f"Initializing Stagehand for {city_name}...")
        await stagehand.init()
        print(f"Stagehand initialized successfully for {city_name}")

        # Navigate to weather service - geolocation proxy ensures location-specific weather data
        print(f"Navigating to weather service for {city_name}...")
        await stagehand.page.goto("https://www.windy.com/", wait_until="networkidle")  # Wait for network to be idle to ensure weather data is loaded
        print(f"Page loaded for {city_name}")

        # Wait a bit for weather data to render
        await asyncio.sleep(2)

        # Extract structured temperature data using Stagehand and Pydantic schema for type safety
        print(f"Extracting temperature data for {city_name}...")
        extract_result = await stagehand.page.extract(
            instruction="Extract the current temperature and its unit",
            schema=TemperatureData,
        )

        print(
            f"Successfully extracted weather data for {city_name}: {extract_result.temperature} {extract_result.unit}"
        )

        # Close Stagehand session to release resources
        await stagehand.close()

        return WeatherResult(
            city=city_name,
            country=geolocation.country,
            temperature=extract_result.temperature,
            unit=extract_result.unit,
        )
    except Exception as error:
        await stagehand.close()
        print(f"Error getting weather for {city_name}: {error}")
        return WeatherResult(
            city=city_name,
            country=geolocation.country,
            temperature=0.0,
            unit="",
            error=str(error),
        )


def display_results(results: list[WeatherResult]):
    """Display formatted weather results for all processed locations."""
    print("\n=== Weather Results ===")
    for result in results:
        if result.error:
            print(f"{result.city}, {result.country}: Error - {result.error}")
        else:
            print(f"{result.city}, {result.country}: {result.temperature} {result.unit}")


async def main():
    """Main orchestration function: processes multiple locations sequentially using geolocation proxies."""
    # Define locations to test - demonstrating the power of geolocation proxies
    # Each location will route traffic through its respective geographic proxy to get location-specific weather
    # Note: All geolocation fields (city, country, state) are case-insensitive
    locations = [
        GeolocationConfig(city="NEW_YORK", state="NY", country="US"),  # State required for US locations (case-insensitive)
        GeolocationConfig(city="LONDON", country="GB"),
        GeolocationConfig(city="TOKYO", country="JP"),
        GeolocationConfig(city="SAO_PAULO", country="BR"),
    ]

    print("=== Weather Proxy Demo - Running Sequentially ===\n")
    print(f"Processing {len(locations)} locations with geolocation proxies...")
    print("Each location will use a different proxy to fetch location-specific weather data\n")

    # Collect all results for final summary
    results: list[WeatherResult] = []

    # Run each location sequentially to show different weather based on proxy location
    # Sequential processing ensures clear demonstration of proxy-based location differences
    for i, location in enumerate(locations, 1):
        print(f"\n[{i}/{len(locations)}] Processing {location.city}, {location.country}...")
        result = await get_weather_for_location(location)
        results.append(result)

    # Display all results in formatted summary
    display_results(results)
    print("\n=== All locations completed ===")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY")
        print("  - Set MODEL_API_KEY or GOOGLE_API_KEY (required for AI model)")
        print(
            "  - Verify geolocation proxy locations are valid (see https://docs.browserbase.com/features/proxies)"
        )
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)