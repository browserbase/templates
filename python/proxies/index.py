# Browserbase Proxy Testing Script - See README.md for full documentation

import os
import asyncio
from playwright.async_api import async_playwright
from browserbase import Browserbase
from dotenv import load_dotenv

load_dotenv()

bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))


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

        # Navigate to IP info service to verify proxy location and IP address.
        await page.goto("https://ipinfo.io/json", wait_until="domcontentloaded")
        geo_info = await page.text_content('pre')  # Extract JSON response containing IP and location data.
        print(f"Geo Info: {geo_info}")

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
