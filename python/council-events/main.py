# Stagehand + Browserbase: Philadelphia Council Events Scraper - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import List

# Load environment variables
load_dotenv()


class Event(BaseModel):
    """Single event with name, date, and time"""
    name: str = Field(..., description="the name of the event")
    date: str = Field(..., description="the date of the event")
    time: str = Field(..., description="the time of the event")


class EventResults(BaseModel):
    """Collection of events extracted from the calendar"""
    results: List[Event] = Field(..., description="array of events")


async def main():
    """
    Searches Philadelphia Council Events for 2025 and extracts event information.
    Uses AI-powered browser automation to navigate and interact with the site.
    """
    print("Starting Philadelphia Council Events automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="openai/gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        verbose=1,
        # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            print("Initializing browser session...")
            print("Stagehand session started successfully")

            # Provide live session URL for debugging and monitoring
            session_id = None
            if hasattr(stagehand, 'session_id'):
                session_id = stagehand.session_id
            elif hasattr(stagehand, 'browserbase_session_id'):
                session_id = stagehand.browserbase_session_id
            
            if session_id:
                print(f"Watch live: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to Philadelphia Council
            print("Navigating to: https://phila.legistar.com/")
            await page.goto("https://phila.legistar.com/")
            print("Page loaded successfully")

            # Click calendar from the navigation menu
            print("Clicking calendar from the navigation menu")
            await page.act("click calendar from the navigation menu")

            # Select 2025 from the month dropdown
            print("Selecting 2025 from the month dropdown")
            await page.act("select 2025 from the month dropdown")

            # Extract event data using AI to parse the structured information
            print("Extracting event information...")
            results = await page.extract(
                "Extract the table with the name, date and time of the events",
                schema=EventResults
            )

            print(f"Found {len(results.results)} events")
            print("Event data extracted successfully:")
            
            # Display results in formatted JSON
            import json
            print(json.dumps(results.model_dump(), indent=2))

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during event extraction: {error}")
        
        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and https://phila.legistar.com is accessible")
        print("4. Verify Browserbase account has sufficient credits")
        print("5. Check if the calendar page structure has changed")
        
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)

