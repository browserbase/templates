# Stagehand + Browserbase: Weather Proxy Demo - See README.md for full documentation

import os
import time

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

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


def get_weather_for_location(geolocation: GeolocationConfig) -> WeatherResult:
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
        "type": "browserbase",
        "geolocation": {
            "city": geolocation.city,
            "country": geolocation.country,
        },
    }
    if geolocation.state:
        proxy_config["geolocation"]["state"] = geolocation.state

    # Initialize Browserbase SDK for session creation with proxy
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

    # Create session with geolocation proxy
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[proxy_config],
    )
    session_id = session.id

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=model_api_key,
    )

    try:
        print(f"Initializing Stagehand for {city_name}...")
        print(f"Session URL: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            print(f"Stagehand initialized successfully for {city_name}")

            # Navigate to weather service
            print(f"Navigating to weather service for {city_name}...")
            page.goto("https://www.windy.com/", wait_until="networkidle")
            print(f"Page loaded for {city_name}")

            # Wait a bit for weather data to render
            time.sleep(2)

            # Extract structured temperature data
            print(f"Extracting temperature data for {city_name}...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract the current temperature and its unit",
                schema=TemperatureData.model_json_schema(),
            )

            result_data = extract_response.data.result
            print(
                f"Successfully extracted weather data for {city_name}: {result_data.get('temperature')} {result_data.get('unit')}"
            )

            browser.close()

        client.sessions.end(id=session_id)

        return WeatherResult(
            city=city_name,
            country=geolocation.country,
            temperature=result_data.get("temperature", 0.0),
            unit=result_data.get("unit", ""),
        )
    except Exception as error:
        client.sessions.end(id=session_id)
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


def main():
    """Main orchestration function: processes multiple locations sequentially using geolocation proxies."""
    locations = [
        GeolocationConfig(city="NEW_YORK", state="NY", country="US"),
        GeolocationConfig(city="LONDON", country="GB"),
        GeolocationConfig(city="TOKYO", country="JP"),
        GeolocationConfig(city="SAO_PAULO", country="BR"),
    ]

    print("=== Weather Proxy Demo - Running Sequentially ===\n")
    print(f"Processing {len(locations)} locations with geolocation proxies...")
    print("Each location will use a different proxy to fetch location-specific weather data\n")

    results: list[WeatherResult] = []

    for i, location in enumerate(locations, 1):
        print(f"\n[{i}/{len(locations)}] Processing {location.city}, {location.country}...")
        result = get_weather_for_location(location)
        results.append(result)

    display_results(results)
    print("\n=== All locations completed ===")


if __name__ == "__main__":
    try:
        main()
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
