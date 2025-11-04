# Stagehand + Browserbase: Business Lookup with Agent - See README.md for full documentation

import os
import asyncio
import json
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import Optional

# Load environment variables
load_dotenv()

# Business search variables
business_name = "Jalebi Street"

async def main():
    print("Starting business lookup...")
    
    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    # Note: set verbose: 0 to prevent API keys from appearing in logs when handling sensitive data.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="openai/gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
        },
        verbose=1  # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            # Initialize browser session to start automation.
            print("Stagehand initialized successfully")
            session_id = None
            if hasattr(stagehand, 'session_id'):
                session_id = stagehand.session_id
            elif hasattr(stagehand, 'browserbase_session_id'):
                session_id = stagehand.browserbase_session_id
            
            if session_id:
                print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to SF Business Registry search page.
            print("Navigating to SF Business Registry...")
            await page.goto(
                "https://data.sfgov.org/stories/s/Registered-Business-Lookup/k6sk-2y6w/",
                wait_until="domcontentloaded",
                timeout=60000
            )

            # Create agent with computer use capabilities for autonomous business search.
            # Using CUA mode allows the agent to interact with complex UI elements like filters and tables.
            print("Creating Computer Use Agent...")
            agent = stagehand.agent(
                provider="google",
                model="gemini-2.5-computer-use-preview-10-2025",
                instructions="You are a helpful assistant that can use a web browser to search for business information.",
                options={
                    "api_key": os.getenv("GOOGLE_API_KEY"),
                },
            )

            print(f"Searching for business: {business_name}")
            result = await agent.execute(
                instruction=f'Find and look up the business "{business_name}" in the SF Business Registry. Use the DBA Name filter to search for "{business_name}", apply the filter, and click on the business row to view detailed information. Scroll towards the right to see the NAICS code.',
                max_steps=30,
                auto_screenshot=True
            )

            if not result.success:
                raise Exception("Agent failed to complete the search")
            
            print("Agent completed search successfully")

            # Extract comprehensive business information after agent completes the search.
            # Using structured schema ensures consistent data extraction even if page layout changes.
            print("Extracting business information...")
            
            # Define schema using Pydantic
            class BusinessInfo(BaseModel):
                dba_name: str = Field(..., description="DBA Name")
                ownership_name: Optional[str] = Field(None, description="Ownership Name")
                business_account_number: str = Field(..., description="Business Account Number")
                location_id: Optional[str] = Field(None, description="Location Id")
                street_address: Optional[str] = Field(None, description="Street Address")
                business_start_date: Optional[str] = Field(None, description="Business Start Date")
                business_end_date: Optional[str] = Field(None, description="Business End Date")
                neighborhood: Optional[str] = Field(None, description="Neighborhood")
                naics_code: str = Field(..., description="NAICS Code")
                naics_code_description: Optional[str] = Field(None, description="NAICS Code Description")

            business_info = await page.extract(
                "Extract all visible business information including DBA Name, Ownership Name, Business Account Number, Location Id, Street Address, Business Start Date, Business End Date, Neighborhood, NAICS Code, and NAICS Code Description",
                schema=BusinessInfo
            )

            print("Business information extracted:")
            print(json.dumps(business_info.model_dump(), indent=2))

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during business lookup: {error}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in business lookup: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set for the agent")
        print("Docs: https://docs.browserbase.com/stagehand")
        exit(1)

