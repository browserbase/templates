# Stagehand + Browserbase: Philadelphia Council Events Scraper - See README.md for full documentation

import json
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()


class Event(BaseModel):
    """Single event with name, date, and time"""

    name: str = Field(..., description="the name of the event")
    date: str = Field(..., description="the date of the event")
    time: str = Field(..., description="the time of the event")


class EventResults(BaseModel):
    """Collection of events extracted from the calendar"""

    results: list[Event] = Field(..., description="array of events")


def main():
    """
    Searches Philadelphia Council Events for 2025 and extracts event information.
    Uses AI-powered browser automation to navigate and interact with the site.
    """
    print("Starting Philadelphia Council Events automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(model_name="openai/gpt-4.1")
    session_id = start_response.data.session_id

    try:
        print("Initializing browser session...")
        print("Stagehand session started successfully")
        # Provide live session URL for debugging and monitoring
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Navigate to Philadelphia Council
        print("Navigating to: https://phila.legistar.com/")
        client.sessions.navigate(id=session_id, url="https://phila.legistar.com/")
        print("Page loaded successfully")

        # Click calendar from the navigation menu
        print("Clicking calendar from the navigation menu")
        client.sessions.act(
            id=session_id,
            input="click calendar from the navigation menu",
        )

        # Select 2025 from the month dropdown
        print("Selecting 2025 from the month dropdown")
        client.sessions.act(
            id=session_id,
            input="select 2025 from the month dropdown",
        )

        # Extract event data using AI to parse the structured information
        print("Extracting event information...")
        events_schema = {
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "description": "array of events",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "the name of the event"},
                            "date": {"type": "string", "description": "the date of the event"},
                            "time": {"type": "string", "description": "the time of the event"},
                        },
                        "required": ["name", "date", "time"],
                    },
                }
            },
            "required": ["results"],
        }
        extract_response = client.sessions.extract(
            id=session_id,
            instruction="Extract the table with the name, date and time of the events",
            schema=events_schema,
        )

        results = extract_response.data.result
        print(f"Found {len(results.get('results', []))} events")
        print("Event data extracted successfully:")
        print(json.dumps(results, indent=2))

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

    finally:
        client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)
