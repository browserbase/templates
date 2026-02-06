# Stagehand + Browserbase: Data Extraction with Structured Schemas - See README.md for full documentation

import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# License verification variables
variables = {
    "input1": "02237476"  # DRE License ID to search for
}


# Define schema using Pydantic
class LicenseData(BaseModel):
    license_type: str | None = Field(None, description="Type of real estate license")
    name: str | None = Field(None, description="License holder's full name")
    mailing_address: str | None = Field(None, description="Current mailing address")
    license_id: str | None = Field(None, description="Unique license identifier")
    expiration_date: str | None = Field(None, description="License expiration date")
    license_status: str | None = Field(None, description="Current status (active, expired, etc.)")
    salesperson_license_issued: str | None = Field(
        None, description="Date salesperson license was issued"
    )
    former_names: str | None = Field(None, description="Any previous names used")
    responsible_broker: str | None = Field(None, description="Associated broker name")
    broker_license_id: str | None = Field(None, description="Broker's license ID")
    broker_address: str | None = Field(None, description="Broker's business address")
    disciplinary_action: str | None = Field(None, description="Any disciplinary actions taken")
    other_comments: str | None = Field(None, description="Additional relevant information")


def main():
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
        print("Stagehand Session Started")
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Navigate to California DRE license verification website for data extraction.
        print("Navigating to: https://www2.dre.ca.gov/publicasp/pplinfo.asp")
        client.sessions.navigate(id=session_id, url="https://www2.dre.ca.gov/publicasp/pplinfo.asp")

        # Fill in license ID to search for specific real estate professional.
        print(f"Performing action: type {variables['input1']} into the License ID input field")
        client.sessions.act(
            id=session_id,
            input=f"type {variables['input1']} into the License ID input field",
        )

        # Submit search form to retrieve license verification data.
        print("Performing action: click the Find button")
        client.sessions.act(
            id=session_id,
            input="click the Find button",
        )

        # Extract structured license data using Pydantic schema for type safety and validation.
        print("Extracting: extract all the license verification details for DRE#02237476")
        extract_response = client.sessions.extract(
            id=session_id,
            instruction="extract all the license verification details for DRE#02237476",
            schema=LicenseData.model_json_schema(),
        )
        extracted_data = extract_response.data.result
        print(f"Extracted: {extracted_data}")

    except Exception as error:
        print(f"Error: {error}")
        raise

    finally:
        client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error: {err}")
        exit(1)
