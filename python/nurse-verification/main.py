# Stagehand + Browserbase: Automated Nurse License Verification - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field
from typing import List

# Load environment variables
load_dotenv()


class LicenseRecord(BaseModel):
    """Single license verification record"""
    name: str = Field(..., description="the name of the license holder")
    license_number: str = Field(..., description="the license number")
    status: str = Field(..., description="the status of the license")
    more_info_url: str = Field(..., description="URL for more information")


class LicenseResults(BaseModel):
    """Collection of license verification results"""
    list_of_licenses: List[LicenseRecord] = Field(..., description="array of license verification results")


# License records to verify - add more records as needed
LICENSE_RECORDS = [
    {
        "Site": "https://pod-search.kalmservices.net/",
        "FirstName": "Ronald",
        "LastName": "Agee",
        "LicenseNumber": "346",
    },
]


async def main():
    """
    Automated nurse license verification using AI-powered browser automation.
    Processes multiple license records and extracts verification results.
    """
    print("Starting Nurse License Verification Automation...")

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

            # Process each license record sequentially
            for license_record in LICENSE_RECORDS:
                print(f"Verifying license for: {license_record['FirstName']} {license_record['LastName']}")

                # Navigate to license verification site
                print(f"Navigating to: {license_record['Site']}")
                await page.goto(license_record['Site'])
                await page.wait_for_load_state("domcontentloaded")
                # Brief timeout to ensure form fields are interactive
                await page.wait_for_timeout(1000)

                # Fill in form fields with license information
                print("Filling in license information...")
                await page.act(f"Type \"{license_record['FirstName']}\" into the first name field")
                await page.act(f"Type \"{license_record['LastName']}\" into the last name field")
                await page.act(f"Type \"{license_record['LicenseNumber']}\" into the license number field")

                # Submit search
                print("Clicking search button...")
                await page.act("Click the search button")

                # Wait for search results to load
                await page.wait_for_load_state("domcontentloaded")
                await page.wait_for_timeout(1000)

                # Extract license verification results
                print("Extracting license verification results...")
                results = await page.extract(
                    "Extract ALL the license verification results from the page, including name, license number and status",
                    schema=LicenseResults
                )

                print("License verification results extracted:")
                
                # Display results in formatted JSON
                import json
                print(json.dumps(results.model_dump(), indent=2))

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during license verification: {error}")

        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and license verification site is accessible")
        print("4. Verify Browserbase account has sufficient credits")

        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)

