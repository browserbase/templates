# Stagehand + Browserbase: Polymarket prediction market research - See README.md for full documentation

import json
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()


class MarketData(BaseModel):
    """Market data extracted from Polymarket prediction market"""

    marketTitle: str | None = Field(None, description="the title of the market")
    currentOdds: str | None = Field(None, description="the current odds or probability")
    yesPrice: str | None = Field(None, description="the yes price")
    noPrice: str | None = Field(None, description="the no price")
    totalVolume: str | None = Field(None, description="the total trading volume")
    priceChange: str | None = Field(None, description="the recent price change")


def main():
    """
    Searches Polymarket for a prediction market and extracts current odds, pricing, and volume data.
    Uses AI-powered browser automation to navigate and interact with the site.
    """
    print("Starting Polymarket research automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="openai/gpt-4.1",
    )
    session_id = start_response.data.session_id

    try:
        print("Initializing browser session...")
        print("Stagehand session started successfully")
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Navigate to Polymarket
        print("Navigating to: https://polymarket.com/")
        client.sessions.navigate(id=session_id, url="https://polymarket.com/")
        print("Page loaded successfully")

        # Click the search box to trigger search dropdown
        print("Clicking the search box at the top of the page")
        client.sessions.act(
            id=session_id,
            input="click the search box at the top of the page",
        )

        # Type search query
        searchQuery = "Elon Musk unfollow Trump"
        print(f"Typing '{searchQuery}' into the search box")
        client.sessions.act(
            id=session_id,
            input=f"type '{searchQuery}' into the search box",
        )

        # Click the first market result from the search dropdown
        print("Selecting first market result from search dropdown")
        client.sessions.act(
            id=session_id,
            input="click the first market result from the search dropdown",
        )
        print("Market page loaded")

        # Extract market data using AI to parse the structured information
        print("Extracting market information...")
        extract_response = client.sessions.extract(
            id=session_id,
            instruction="Extract the current odds and market information for the prediction market",
            schema=MarketData.model_json_schema(),
        )

        print("Market data extracted successfully:")
        print(json.dumps(extract_response.data.result, indent=2))

    except Exception as error:
        print(f"Error during market research: {error}")

        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and https://polymarket.com is accessible")
        print("4. Verify Browserbase account has sufficient credits")
        raise

    finally:
        client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in polymarket research: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify OPENAI_API_KEY is set in environment")
        print("  - Ensure internet access and https://polymarket.com is accessible")
        print("  - Verify Browserbase account has sufficient credits")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
