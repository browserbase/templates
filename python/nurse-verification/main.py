# Stagehand + Browserbase: Automated Nurse License Verification - See README.md for full documentation

import json
import os

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

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

    list_of_licenses: list[LicenseRecord] = Field(
        ..., description="array of license verification results"
    )


# License records to verify - add more records as needed
LICENSE_RECORDS = [
    {
        "Site": "https://pod-search.kalmservices.net/",
        "FirstName": "Ronald",
        "LastName": "Agee",
        "LicenseNumber": "346",
    },
]


def main():
    """
    Automated nurse license verification using AI-powered browser automation.
    Processes multiple license records and extracts verification results.
    """
    print("Starting Nurse License Verification Automation...")

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

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Process each license record sequentially
            for license_record in LICENSE_RECORDS:
                print(
                    f"Verifying license for: {license_record['FirstName']} {license_record['LastName']}"
                )

                # Navigate to license verification site
                print(f"Navigating to: {license_record['Site']}")
                page.goto(license_record["Site"])
                page.wait_for_load_state("domcontentloaded")
                # Brief timeout to ensure form fields are interactive
                page.wait_for_timeout(1000)

                # Fill in form fields with license information
                print("Filling in license information...")
                client.sessions.act(
                    id=session_id,
                    input=f'Type "{license_record["FirstName"]}" into the first name field',
                )
                client.sessions.act(
                    id=session_id,
                    input=f'Type "{license_record["LastName"]}" into the last name field',
                )
                client.sessions.act(
                    id=session_id,
                    input=f'Type "{license_record["LicenseNumber"]}" into the license number field',
                )

                # Submit search
                print("Clicking search button...")
                client.sessions.act(
                    id=session_id,
                    input="Click the search button",
                )

                # Wait for search results to load
                page.wait_for_load_state("domcontentloaded")
                page.wait_for_timeout(1000)

                # Extract license verification results using inline schema (avoids $ref issues)
                print("Extracting license verification results...")
                license_schema = {
                    "type": "object",
                    "properties": {
                        "list_of_licenses": {
                            "type": "array",
                            "description": "array of license verification results",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "the name of the license holder",
                                    },
                                    "license_number": {
                                        "type": "string",
                                        "description": "the license number",
                                    },
                                    "status": {
                                        "type": "string",
                                        "description": "the status of the license",
                                    },
                                    "more_info_url": {
                                        "type": "string",
                                        "description": "URL for more information",
                                    },
                                },
                                "required": ["name", "license_number", "status", "more_info_url"],
                            },
                        }
                    },
                    "required": ["list_of_licenses"],
                }
                extract_response = client.sessions.extract(
                    id=session_id,
                    instruction="Extract ALL the license verification results from the page, including name, license number and status",
                    schema=license_schema,
                )

                print("License verification results extracted:")
                print(json.dumps(extract_response.data.result, indent=2))

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")

    except Exception as error:
        print(f"Error during license verification: {error}")

        # Provide helpful troubleshooting information
        print("\nCommon issues:")
        print("1. Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("2. Verify OPENAI_API_KEY is set in environment")
        print("3. Ensure internet access and license verification site is accessible")
        print("4. Verify Browserbase account has sufficient credits")

        client.sessions.end(id=session_id)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)
