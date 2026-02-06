# Browserbase Proxy Testing Script - See README.md for full documentation

import json
import os

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

load_dotenv()

bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))


class GeoInfo(BaseModel):
    """Schema for IP information and geolocation data"""

    ip: str = Field(..., description="The IP address")
    city: str = Field(..., description="The city name")
    region: str = Field(..., description="The state or region")
    country: str = Field(..., description="The country code")
    loc: str = Field(..., description="The latitude and longitude coordinates")
    timezone: str = Field(..., description="The timezone")
    org: str = Field(..., description="The organization or ISP")
    postal: str = Field(..., description="The postal code")
    hostname: str = Field(..., description="The hostname if available")


def create_session_with_built_in_proxies():
    # Use Browserbase's default proxy rotation for enhanced privacy and IP diversity.
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=True,
    )
    return session


def create_session_with_geo_location():
    # Route traffic through specific geographic location to test location-based restrictions.
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[
            {
                "type": "browserbase",
                "geolocation": {
                    "city": "NEW_YORK",
                    "state": "NY",
                    "country": "US",
                },
            }
        ],
    )
    return session


def create_session_with_custom_proxies():
    # Use external proxy servers for custom routing or specific proxy requirements.
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[
            {
                "type": "external",
                "server": "http://...",
                "username": "user",
                "password": "pass",
            }
        ],
    )
    return session


def test_session(session_function, session_name: str):
    print(f"\n=== Testing {session_name} ===")

    # Create session with specific proxy configuration
    session = session_function()
    session_id = session.id
    print(f"Session URL: https://browserbase.com/sessions/{session_id}")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    try:
        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0] if browser.contexts else None
            if not context:
                raise Exception("No default context found")

            page = context.pages[0] if context.pages else None
            if not page:
                raise Exception("No page found in default context")

            # Navigate to IP info service to verify proxy location and IP address.
            page.goto("https://ipinfo.io/json", wait_until="domcontentloaded")

            # Extract structured IP and location data using Stagehand
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract all IP information and geolocation data from the JSON response",
                schema=GeoInfo.model_json_schema(),
            )

            print("Geo Info:", json.dumps(extract_response.data.result, indent=2))

            browser.close()

        client.sessions.end(id=session_id)
        print(f"{session_name} test completed")

    except Exception as error:
        print(f"Error during Stagehand extraction: {error}")
        client.sessions.end(id=session_id)


def main():
    # Test 1: Built-in proxies - Verify default proxy rotation works and shows different IPs.
    test_session(create_session_with_built_in_proxies, "Built-in Proxies")

    # Test 2: Geolocation proxies - Confirm traffic routes through specified location (New York).
    test_session(create_session_with_geo_location, "Geolocation Proxies (New York)")

    # Test 3: Custom external proxies - Enable if you have a custom proxy server set up.
    # test_session(create_session_with_custom_proxies, "Custom External Proxies")
    print("\n=== All tests completed ===")


if __name__ == "__main__":
    main()
