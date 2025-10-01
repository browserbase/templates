# Stagehand + Browserbase: Data Extraction with Structured Schemas - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import Optional

# Load environment variables
load_dotenv()

# License verification variables
variables = {
    "input1": "02237476"  # DRE License ID to search for
}


async def main():
    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    config = StagehandConfig(
        env="BROWSERBASE",  # Use Browserbase cloud browsers for reliable automation.
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        verbose=0,
        # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
        model_name="gpt-4o",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Use async context manager for automatic resource management
    async with Stagehand(config) as stagehand:
        print("Stagehand Session Started")
        
        # Provide live session URL for debugging and monitoring extraction process.
        session_id = None
        if hasattr(stagehand, 'session_id'):
            session_id = stagehand.session_id
        elif hasattr(stagehand, 'browserbase_session_id'):
            session_id = stagehand.browserbase_session_id
        
        if session_id:
            print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        page = stagehand.page

        # Navigate to California DRE license verification website for data extraction.
        print('Navigating to: https://www2.dre.ca.gov/publicasp/pplinfo.asp')
        await page.goto('https://www2.dre.ca.gov/publicasp/pplinfo.asp')
        
        # Fill in license ID to search for specific real estate professional.
        print(
            f"Performing action: type {variables['input1']} into the License ID input field"
        )
        await page.act(f"type {variables['input1']} into the License ID input field")
        
        # Submit search form to retrieve license verification data.
        print("Performing action: click the Find button")
        await page.act("click the Find button")
        
        # Define schema using Pydantic
        class LicenseData(BaseModel):
            license_type: Optional[str] = Field(None, description="Type of real estate license")
            name: Optional[str] = Field(None, description="License holder's full name")
            mailing_address: Optional[str] = Field(None, description="Current mailing address")
            license_id: Optional[str] = Field(None, description="Unique license identifier")
            expiration_date: Optional[str] = Field(None, description="License expiration date")
            license_status: Optional[str] = Field(None, description="Current status (active, expired, etc.)")
            salesperson_license_issued: Optional[str] = Field(None, description="Date salesperson license was issued")
            former_names: Optional[str] = Field(None, description="Any previous names used")
            responsible_broker: Optional[str] = Field(None, description="Associated broker name")
            broker_license_id: Optional[str] = Field(None, description="Broker's license ID")
            broker_address: Optional[str] = Field(None, description="Broker's business address")
            disciplinary_action: Optional[str] = Field(None, description="Any disciplinary actions taken")
            other_comments: Optional[str] = Field(None, description="Additional relevant information")
        
        # Extract structured license data using Pydantic schema for type safety and validation.
        print(
            "Extracting: extract all the license verification details for DRE#02237476"
        )
        extracted_data = await page.extract(
            "extract all the license verification details for DRE#02237476",
            schema=LicenseData
        )
        print(f'Extracted: {extracted_data}')
    
    print("Session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error: {err}")
        exit(1)

