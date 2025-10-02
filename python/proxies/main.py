# Browserbase Proxy Testing Script - See README.md for full documentation

import os
import asyncio
from playwright.async_api import async_playwright
from browserbase import Browserbase
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from dotenv import load_dotenv

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


async def create_session_with_built_in_proxies():
    # Use Browserbase's default proxy rotation for enhanced privacy and IP diversity.
    session = await asyncio.to_thread(
        bb.sessions.create,
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=True,  # Enables automatic proxy rotation across different IP addresses.
    )
    return session


async def create_session_with_geo_location():
    # Route traffic through specific geographic location to test location-based restrictions.
    session = await asyncio.to_thread(
        bb.sessions.create,
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[
            {
                "type": "browserbase",  # Use Browserbase's managed proxy infrastructure.
                "geolocation": {
                    "city": "NEW_YORK",  # Simulate traffic from New York for testing geo-specific content.
                    "state": "NY",  # See https://docs.browserbase.com/features/proxies for more geolocation options.
                    "country": "US"
                }
            }
        ]
    )
    return session


async def create_session_with_custom_proxies():
    # Use external proxy servers for custom routing or specific proxy requirements.
    session = await asyncio.to_thread(
        bb.sessions.create,
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        proxies=[
            {
                "type": "external",  # Connect to your own proxy server infrastructure.
                "server": "http://...",  # Your proxy server endpoint.
                "username": "user",  # Authentication credentials for proxy access.
                "password": "pass",
            }
        ]
    )
    return session


async def test_session(session_function, session_name: str):
    print(f"\n=== Testing {session_name} ===")
    
    # Create session with specific proxy configuration to test different routing scenarios.
    session = await session_function()
    print(f"Session URL: https://browserbase.com/sessions/{session.id}")

    # Connect to browser via CDP to control the session programmatically.
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(session.connect_url)
        default_context = browser.contexts[0] if browser.contexts else None
        if not default_context:
            raise Exception("No default context found")
        
        page = default_context.pages[0] if default_context.pages else None
        if not page:
            raise Exception("No page found in default context")

        # Initialize Stagehand for structured data extraction
        stagehand_config = StagehandConfig(
            env="BROWSERBASE",
            api_key=os.environ.get("BROWSERBASE_API_KEY"),
            project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
            verbose=0,
            # 0 = errors only, 1 = info, 2 = debug 
            # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
            # https://docs.stagehand.dev/configuration/logging
            model_name="gpt-4.1",
            model_api_key=os.environ.get("OPENAI_API_KEY"),
            browserbase_session_id=session.id,  # Use the existing Browserbase session
        )
        
        stagehand = Stagehand(stagehand_config)

        try:
            # Initialize Stagehand 
            await stagehand.init()

            # Navigate to IP info service to verify proxy location and IP address.
            await stagehand.page.goto("https://ipinfo.io/json", wait_until="domcontentloaded")
            
            # Extract structured IP and location data using Stagehand and Pydantic schema
            geo_info = await stagehand.page.extract(
                instruction="Extract all IP information and geolocation data from the JSON response",
                schema=GeoInfo
            )

            print("Geo Info:", geo_info.model_dump_json(indent=2))

            # Close Stagehand session
            await stagehand.close()
        except Exception as error:
            print(f"Error during Stagehand extraction: {error}")

        # Close browser to release resources and end the test session.
        await browser.close()
        print(f"{session_name} test completed")


async def main():
    # Test 1: Built-in proxies - Verify default proxy rotation works and shows different IPs.
    await test_session(create_session_with_built_in_proxies, "Built-in Proxies")
    
    # Test 2: Geolocation proxies - Confirm traffic routes through specified location (New York).
    await test_session(create_session_with_geo_location, "Geolocation Proxies (New York)")
    
    # Test 3: Custom external proxies - Enable if you have a custom proxy server set up.
    # await test_session(create_session_with_custom_proxies, "Custom External Proxies")
    print("\n=== All tests completed ===")


if __name__ == "__main__":
    asyncio.run(main())
