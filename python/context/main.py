# Stagehand + Browserbase: Context Authentication Example - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from browserbase import Browserbase
from pydantic import BaseModel, Field
import requests

# Load environment variables
load_dotenv()


async def create_session_context_id():
    print("Creating new Browserbase context...")
    # First create a context using Browserbase SDK to get a context ID.
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))
    context = bb.contexts.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID")
    )
    
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
        }
    )
    print(f"Live view: https://browserbase.com/sessions/{session.id}")
    
    # Connect Stagehand to the existing session (no new session created).
    print("Connecting Stagehand to session...")
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="openai/gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        browserbase_session_id=session.id,
        verbose=1  # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )
    
    async with Stagehand(config) as stagehand:
        page = stagehand.page
        email = os.environ.get("SF_REC_PARK_EMAIL")
        password = os.environ.get("SF_REC_PARK_PASSWORD")
        
        # Navigate to login page with extended timeout for slow-loading sites.
        print("Navigating to SF Rec & Park login page...")
        await page.goto(
            "https://www.rec.us/organizations/san-francisco-rec-park",
            wait_until='domcontentloaded',
            timeout=60000
        )

        # Perform login sequence: each step is atomic to handle dynamic page changes.
        print("Starting login sequence...")
        await page.act("Click the Login button")
        await page.act(f"Fill in the email or username field with \"{email}\"")
        await page.act("Click the next, continue, or submit button to proceed")
        await page.act(f"Fill in the password field with \"{password}\"")
        await page.act("Click the login, sign in, or submit button")
        print("Login sequence completed!")
    
    print("Authentication state saved to context")
    
    # Return the context ID for reuse in future sessions.
    return {"id": context.id}


async def delete_context(context_id: str):
    try:
        print(f"Cleaning up context: {context_id}")
        # Delete context via Browserbase API to clean up stored authentication data.
        # This prevents accumulation of unused contexts and ensures security cleanup.
        response = requests.delete(
            f"https://api.browserbase.com/v1/contexts/{context_id}",
            headers={
                "X-BB-API-Key": os.environ.get("BROWSERBASE_API_KEY"),
            }
        )
        print(f"Context deleted successfully (status: {response.status_code})")
    except Exception as error:
        error_msg = getattr(error, 'response', {}).get('data') or str(error)
        print(f"Error deleting context: {error_msg}")


async def main():
    print("Starting Context Authentication Example...")
    # Create context with login state for reuse in authenticated sessions.
    context_id = await create_session_context_id()
    
    # Initialize new session using existing context to inherit authentication state.
    # persist: true ensures any new changes (cookies, cache) are saved back to context.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "browser_settings": {
                "context": {
                    "id": context_id["id"],
                    "persist": True,
                }
            }
        },
        verbose=0  # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )
    
    async with Stagehand(config) as stagehand:
        print("Authenticated session ready!")
        if hasattr(stagehand, 'session_id'):
            print(f"Live view: https://browserbase.com/sessions/{stagehand.session_id}")
        elif hasattr(stagehand, 'browserbase_session_id'):
            print(f"Live view: https://browserbase.com/sessions/{stagehand.browserbase_session_id}")

        page = stagehand.page

        # Navigate to authenticated area - should skip login due to persisted cookies.
        print("Navigating to authenticated area (should skip login)...")
        await page.goto(
            "https://www.rec.us/organizations/san-francisco-rec-park",
            wait_until='domcontentloaded',
            timeout=60000
        )

        # Navigate to user-specific area to access personal data.
        await page.act("Click on the reservations button")
        
        # Extract structured user data using Pydantic schema for type safety.
        # Schema ensures consistent data format and validates extracted content.
        print("Extracting user profile data...")
        
        # Define schema using Pydantic
        class UserData(BaseModel):
            full_name: str = Field(..., description="the user's full name")
            address: str = Field(..., description="the user's address")
        
        user_data = await page.extract(
            "Extract the user's full name and address",
            schema=UserData
        )
        
        print(f"Extracted user data: {user_data}")
    
    print("Session closed successfully")
    
    # Clean up context to prevent accumulation and ensure security.
    await delete_context(context_id["id"])


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in context authentication example: {err}")
        print("Common issues:")
        print("  - Check .env file has SF_REC_PARK_EMAIL and SF_REC_PARK_PASSWORD")
        print("  - Verify BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY are set")
        print("  - Ensure credentials are valid for SF Rec & Park")
        print("Docs: https://docs.browserbase.com/stagehand")
        exit(1)
