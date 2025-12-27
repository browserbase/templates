# Stagehand + Browserbase: Basic Screenshots Automation - See README.md for full documentation

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

SCREENSHOTS_DIR = "screenshots"


# Helper function to take and save a screenshot
# Captures full-page screenshots in JPEG format for documentation and debugging
async def take_screenshot(page, filename: str):
    print(f"Taking screenshot: {filename}...")
    filepath = os.path.join(SCREENSHOTS_DIR, filename)
    await page.screenshot(path=filepath, type="jpeg", quality=80, full_page=True)
    print(f"Saved: {filepath}")


async def main():
    print("Starting Basic Screenshots Example...")

    # Create screenshots directory if it doesn't exist
    Path(SCREENSHOTS_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Created directory: {SCREENSHOTS_DIR}")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
        verbose=0,
        # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            # Initialize browser session to start automation
            print("Initializing browser session...")
            print("Stagehand initialized successfully!")

            # Provide live session URL for debugging and monitoring
            session_id = None
            if hasattr(stagehand, "session_id"):
                session_id = stagehand.session_id
            elif hasattr(stagehand, "browserbase_session_id"):
                session_id = stagehand.browserbase_session_id

            if session_id:
                print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to Polymarket homepage
            print("Navigating to: https://polymarket.com/")
            await page.goto("https://polymarket.com/")
            print("Page loaded successfully")
            await take_screenshot(page, "screenshot-01-initial-page.jpeg")

            # Click the search box to trigger search dropdown
            print("Clicking the search box at the top of the page")
            await page.act("click the search box at the top of the page")
            await take_screenshot(page, "screenshot-02-after-click-search.jpeg")

            # Type search query into the search box
            search_query = "Elon Musk unfollow Trump"
            print(f"Typing '{search_query}' into the search box")
            await page.act(f"type '{search_query}' into the search box")
            await take_screenshot(page, "screenshot-03-after-type-search.jpeg")

            # Click the first market result from the search dropdown
            print("Selecting first market result from search dropdown")
            await page.act("click the first market result from the search dropdown")
            print("Market page loaded")
            await take_screenshot(page, "screenshot-04-after-select-market.jpeg")

            print("All screenshots captured!")

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during screenshot capture: {error}")

        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_GENERATIVE_AI_API_KEY is set in environment")
        print("  - Ensure internet access and https://polymarket.com is accessible")
        print("  - Verify Browserbase account has sufficient credits")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)
