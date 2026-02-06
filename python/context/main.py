# Stagehand + Browserbase: Context Authentication Example - See README.md for full documentation

import os

import requests
from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()


def create_session_context_id():
    print("Creating new Browserbase context...")
    # First create a context using Browserbase SDK to get a context ID.
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))
    context = bb.contexts.create(project_id=os.environ.get("BROWSERBASE_PROJECT_ID"))

    print(f"Created context ID: {context.id}")

    # Create a single session using the context ID to perform initial login.
    print("Creating session for initial login...")
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        browser_settings={
            "context": {
                "id": context.id,
                "persist": True,  # Save authentication state to context
            }
        },
    )
    session_id = session.id
    print(f"Live view: https://browserbase.com/sessions/{session_id}")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Connect Stagehand to the existing session (no new session created).
    print("Connecting Stagehand to session...")

    # Connect to the browser via CDP
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(
            f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
        )
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        email = os.environ.get("SF_REC_PARK_EMAIL")
        password = os.environ.get("SF_REC_PARK_PASSWORD")

        # Navigate to login page with extended timeout for slow-loading sites.
        print("Navigating to SF Rec & Park login page...")
        page.goto(
            "https://www.rec.us/organizations/san-francisco-rec-park",
            wait_until="domcontentloaded",
            timeout=60000,
        )

        # Perform login sequence: each step is atomic to handle dynamic page changes.
        print("Starting login sequence...")
        client.sessions.act(
            id=session_id,
            input="Click the Login button",
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the email or username field with "{email}"',
        )
        client.sessions.act(
            id=session_id,
            input="Click the next, continue, or submit button to proceed",
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the password field with "{password}"',
        )
        client.sessions.act(
            id=session_id,
            input="Click the login, sign in, or submit button",
        )
        print("Login sequence completed!")

        browser.close()

    client.sessions.end(id=session_id)
    print("Authentication state saved to context")

    # Return the context ID for reuse in future sessions.
    return {"id": context.id}


def delete_context(context_id: str):
    """Delete context via Browserbase API to clean up stored authentication data.
    This prevents accumulation of unused contexts and ensures security cleanup."""
    try:
        print(f"Cleaning up context: {context_id}")
        response = requests.delete(
            f"https://api.browserbase.com/v1/contexts/{context_id}",
            headers={
                "X-BB-API-Key": os.environ.get("BROWSERBASE_API_KEY"),
            },
        )
        print(f"Context deleted successfully (status: {response.status_code})")
    except Exception as error:
        error_msg = getattr(error, "response", {}).get("data") or str(error)
        print(f"Error deleting context: {error_msg}")


def main():
    print("Starting Context Authentication Example...")
    # Create context with login state for reuse in authenticated sessions.
    context_id = create_session_context_id()

    # Initialize new session using existing context to inherit authentication state.
    # persist: true ensures any new changes (cookies, cache) are saved back to context.
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        browser_settings={
            "context": {
                "id": context_id["id"],
                "persist": True,
            }
        },
    )
    session_id = session.id

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    try:
        print("Authenticated session ready!")
        print(f"Live view: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to authenticated area - should skip login due to persisted cookies.
            print("Navigating to authenticated area (should skip login)...")
            page.goto(
                "https://www.rec.us/organizations/san-francisco-rec-park",
                wait_until="domcontentloaded",
                timeout=60000,
            )

            # Navigate to user-specific area to access personal data.
            client.sessions.act(
                id=session_id,
                input="Click on the reservations button",
            )

            # Extract structured user data using Pydantic schema for type safety.
            # Schema ensures consistent data format and validates extracted content.
            print("Extracting user profile data...")

            class UserData(BaseModel):
                full_name: str = Field(..., description="the user's full name")
                address: str = Field(..., description="the user's address")

            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract the user's full name and address",
                schema=UserData.model_json_schema(),
            )

            print(f"Extracted user data: {extract_response.data.result}")

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")

    except Exception as error:
        print(f"Error: {error}")
        client.sessions.end(id=session_id)
        raise

    # Clean up context to prevent accumulation and ensure security.
    delete_context(context_id["id"])


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in context authentication example: {err}")
        print("Common issues:")
        print("  - Check .env file has SF_REC_PARK_EMAIL and SF_REC_PARK_PASSWORD")
        print("  - Verify BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY are set")
        print("  - Ensure credentials are valid for SF Rec & Park")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
