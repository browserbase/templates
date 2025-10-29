# Stagehand + Browserbase: Alaska Airlines Flight Search - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import List, Optional

# Load environment variables
load_dotenv()


class Flight(BaseModel):
    """Single flight with number, times, and price"""
    flight_number: Optional[str] = Field(None, description="the flight number")
    departure_time: Optional[str] = Field(None, description="the departure time")
    arrival_time: Optional[str] = Field(None, description="the arrival time")
    price: Optional[str] = Field(None, description="the price of the flight")


class FlightData(BaseModel):
    """Collection of flights from search results"""
    flights: List[Flight] = Field(..., description="array of flights")


async def main():
    """
    Main entry point: search Alaska Airlines for flights and extract structured flight data.
    Uses AI-powered browser automation to fill search form and parse results.
    """
    print("Starting Alaska Airlines flight search automation...")

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
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "timeout": 900,  # Extended timeout to allow for form interactions and result loading
        },
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            print("Initializing browser session...")
            print("Stagehand session started successfully")

            # Log live session URL for real-time monitoring during automation
            session_id = None
            if hasattr(stagehand, 'session_id'):
                session_id = stagehand.session_id
            elif hasattr(stagehand, 'browserbase_session_id'):
                session_id = stagehand.browserbase_session_id
            
            if session_id:
                print(f"Watch live: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to Alaska Airlines booking page
            print("Navigating to Alaska Airlines...")
            await page.goto("https://www.alaskaair.com/")
            print("Page loaded successfully")

            # Flight search parameters - customize these for different routes/dates
            origin = "SFO"
            destination = "LAX"
            departure_date = "02/01/2025"
            return_date = "02/08/2025"

            print(f"Searching for flights from {origin} to {destination}")

            # Fill origin airport code - type then select from autocomplete dropdown
            print("Filling origin...")
            await page.act(f"type '{origin}' into the origin field")
            await page.act(f"click on {origin} from the origin options")
            print(f"Origin selected: {origin}")

            # Fill destination airport code - same pattern as origin
            print("Filling destination...")
            await page.act(f"type '{destination}' into the destination field")
            await page.act(f"click on {destination} from the destination options")
            print(f"Destination selected: {destination}")

            # Select departure date from calendar widget
            print(f"Selecting departure date: {departure_date}")
            await page.act("click on the departure date field")
            await page.act(f"select the date {departure_date} from the calendar")
            print(f"Departure date selected: {departure_date}")

            # Select return date from calendar widget
            print(f"Selecting return date: {return_date}")
            await page.act("click on the return date field")
            await page.act(f"select the date {return_date} from the calendar")
            print(f"Return date selected: {return_date}")

            # Trigger search to retrieve available flights
            print("Clicking search button...")
            await page.act("click the search for flights button")

            # Wait for search results to load and render on the page
            await page.wait_for_timeout(3000)

            # Extract structured flight data using natural language instruction
            print("Extracting flight data...")
            flight_data = await page.extract(
                "extract all of the flight data from the page, only include the flight number, departure and arrival times, and the price",
                schema=FlightData
            )

            # Display extracted flight information
            print(f"\nFound {len(flight_data.flights)} flights:")
            
            # Display results in formatted JSON
            import json
            print(json.dumps(flight_data.model_dump(), indent=2))

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during flight search: {error}")
        
        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and https://www.alaskaair.com is accessible")
        print("4. Verify Browserbase account has sufficient credits")
        
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)

