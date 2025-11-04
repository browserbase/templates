# Stagehand + Browserbase: Polymarket prediction market research - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import Optional

# Load environment variables
load_dotenv()


class MarketData(BaseModel):
    """Market data extracted from Polymarket prediction market"""
    marketTitle: Optional[str] = Field(None, description="the title of the market")
    currentOdds: Optional[str] = Field(None, description="the current odds or probability")
    yesPrice: Optional[str] = Field(None, description="the yes price")
    noPrice: Optional[str] = Field(None, description="the no price")
    totalVolume: Optional[str] = Field(None, description="the total trading volume")
    priceChange: Optional[str] = Field(None, description="the recent price change")


async def main():
    """
    Searches Polymarket for a prediction market and extracts current odds, pricing, and volume data.
    Uses AI-powered browser automation to navigate and interact with the site.
    """
    print("Starting Polymarket research automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    # Using BROWSERBASE environment to run in cloud rather than locally
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

            # Navigate to Polymarket
            print("Navigating to: https://polymarket.com/")
            await page.goto("https://polymarket.com/")
            print("Page loaded successfully")

            # Click the search box to trigger search dropdown
            print("Clicking the search box at the top of the page")
            await page.act("click the search box at the top of the page")

            # Type search query
            searchQuery = "Elon Musk unfollow Trump"
            print(f"Typing '{searchQuery}' into the search box")
            await page.act(f"type '{searchQuery}' into the search box")

            # Click the first market result from the search dropdown
            print("Selecting first market result from search dropdown")
            await page.act("click the first market result from the search dropdown")
            print("Market page loaded")

            # Extract market data using AI to parse the structured information
            print("Extracting market information...")
            marketData = await page.extract(
                "Extract the current odds and market information for the prediction market",
                schema=MarketData
            )

            print("Market data extracted successfully:")
            
            # Display results in formatted JSON
            import json
            print(json.dumps(marketData.model_dump(), indent=2))

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during market research: {error}")
        
        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and https://polymarket.com is accessible")
        print("4. Verify Browserbase account has sufficient credits")
        
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in polymarket research: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify OPENAI_API_KEY is set in environment")
        print("  - Ensure internet access and https://polymarket.com is accessible")
        print("  - Verify Browserbase account has sufficient credits")
        print("Docs: https://docs.browserbase.com/stagehand")
        exit(1)

