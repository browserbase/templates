# Browserbase Proxy Testing with Playwright - See README.md for full documentation

import asyncio
import json
import os
from dataclasses import dataclass

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv()


@dataclass
class GeoInfo:  # noqa: F841
    """IP and geolocation data from ipinfo.io (for reference)"""

    ip: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    loc: str | None = None
    timezone: str | None = None
    org: str | None = None
    postal: str | None = None
    hostname: str | None = None


BROWSERBASE_API_KEY = os.environ.get("BROWSERBASE_API_KEY")
BROWSERBASE_PROJECT_ID = os.environ.get("BROWSERBASE_PROJECT_ID")

if not BROWSERBASE_API_KEY:
    raise ValueError("BROWSERBASE_API_KEY environment variable is required")
if not BROWSERBASE_PROJECT_ID:
    raise ValueError("BROWSERBASE_PROJECT_ID environment variable is required")

bb = Browserbase(api_key=BROWSERBASE_API_KEY)


def create_session_with_built_in_proxies():
    """Use Browserbase's default proxy rotation for enhanced privacy and IP diversity."""
    session = bb.sessions.create(
        project_id=BROWSERBASE_PROJECT_ID,
        proxies=True,  # Enables automatic proxy rotation across different IP addresses.
    )
    return session


def create_session_with_geo_location():
    """Route traffic through specific geographic location to test location-based restrictions."""
    session = bb.sessions.create(
        project_id=BROWSERBASE_PROJECT_ID,
        proxies=[
            {
                "type": "browserbase",  # Use Browserbase's managed proxy infrastructure.
                "geolocation": {
                    "city": "NEW_YORK",  # Simulate traffic from New York for testing geo-specific content.
                    "state": "NY",  # See https://docs.browserbase.com/features/proxies for more geolocation options.
                    "country": "US",
                },
            }
        ],
    )
    return session


def create_session_with_custom_proxies():
    """Use external proxy servers for custom routing or specific proxy requirements."""
    # Credentials from CUSTOM_PROXY_SERVER, CUSTOM_PROXY_USERNAME, CUSTOM_PROXY_PASSWORD.
    proxy_server = os.environ.get("CUSTOM_PROXY_SERVER")
    proxy_username = os.environ.get("CUSTOM_PROXY_USERNAME")
    proxy_password = os.environ.get("CUSTOM_PROXY_PASSWORD")

    if not proxy_server or not proxy_username or not proxy_password:
        raise ValueError(
            "Custom proxy requires CUSTOM_PROXY_SERVER, CUSTOM_PROXY_USERNAME, "
            "and CUSTOM_PROXY_PASSWORD environment variables"
        )

    session = bb.sessions.create(
        project_id=BROWSERBASE_PROJECT_ID,
        proxies=[
            {
                "type": "external",  # Connect to your own proxy server infrastructure.
                "server": proxy_server,
                "username": proxy_username,
                "password": proxy_password,
            }
        ],
    )
    return session


async def test_session_browserbase(session_function, session_name: str):
    """Test a Browserbase session with a specific proxy configuration."""
    print(f"\n=== Testing {session_name} ===")

    # Create session with specific proxy configuration to test different routing scenarios.
    session = session_function()
    print(f"Session URL: https://browserbase.com/sessions/{session.id}")

    # Connect to browser via CDP to control the session programmatically.
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(session.connect_url)
        default_context = browser.contexts[0] if browser.contexts else None

        if not default_context:
            raise RuntimeError("No default context found")

        page = default_context.pages[0] if default_context.pages else None

        if not page:
            raise RuntimeError("No page found in default context")

        try:
            # Navigate to IP info service to verify proxy location and IP address.
            await page.goto("https://ipinfo.io/json", wait_until="domcontentloaded")

            # Parse JSON from page body (pure Playwright; no Stagehand).
            body_text = await page.text_content("body")

            if not body_text:
                raise RuntimeError("Failed to get page content")

            try:
                geo_data = json.loads(body_text)
            except json.JSONDecodeError as parse_error:
                raise RuntimeError(f"Failed to parse JSON response: {parse_error}")

            print("Geo Info:", json.dumps(geo_data, indent=2))

        except Exception as error:
            print(f"Error during extraction: {error}")

        # Close browser to release resources and end the test session.
        await browser.close()
        print(f"{session_name} test completed")


async def main():
    print("Browserbase Proxy Testing with Playwright")
    print("=========================================")
    print("This template demonstrates proxy features with Playwright and Browserbase SDK.")
    print("It uses pure Playwright + Browserbase SDK.\n")

    # Test 1: Built-in proxies - Verify default proxy rotation works and shows different IPs.
    await test_session_browserbase(create_session_with_built_in_proxies, "Built-in Proxies")

    # Test 2: Geolocation proxies - Confirm traffic routes through specified location (New York).
    await test_session_browserbase(
        create_session_with_geo_location, "Geolocation Proxies (New York)"
    )

    # Test 3: Custom external proxies - Enable if you have CUSTOM_PROXY_* env vars set.
    # await test_session_browserbase(create_session_with_custom_proxies, "Custom External Proxies")

    print("\n=== All tests completed ===")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("\nCommon issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify your Browserbase plan supports proxies")
        print("Docs: https://docs.browserbase.com/features/proxies")
        exit(1)
