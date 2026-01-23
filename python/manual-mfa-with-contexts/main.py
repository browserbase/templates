# Manual MFA with Browserbase Contexts - See README.md for full documentation

import asyncio
import os
import time

import requests
from browserbase import Browserbase
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))


async def create_session_with_context():
    """First session: Create context and login (with MFA)"""
    print("Creating new Browserbase context...")

    context = bb.contexts.create(project_id=os.environ.get("BROWSERBASE_PROJECT_ID"))

    print(f"Context created: {context.id}")
    print("First session: Performing login with MFA...")

    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "browser_settings": {
                "context": {
                    "id": context.id,
                    "persist": True,  # Save authentication state including MFA
                }
            },
        },
        verbose=0,  # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
    )

    async with Stagehand(config) as stagehand:
        session_id = None
        if hasattr(stagehand, "session_id"):
            session_id = stagehand.session_id
        elif hasattr(stagehand, "browserbase_session_id"):
            session_id = stagehand.browserbase_session_id

        if session_id:
            print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        page = stagehand.page

        # Navigate to GitHub login
        print("Navigating to GitHub login...")
        await page.goto("https://github.com/login", wait_until="domcontentloaded")

        # Fill in credentials
        print("Entering username...")
        await page.act(f"Type '{os.environ.get('GITHUB_USERNAME')}' into the username field")

        print("Entering password...")
        await page.act(f"Type '{os.environ.get('GITHUB_PASSWORD')}' into the password field")

        print("Clicking Sign in...")
        await page.act("Click the Sign in button")

        await page.wait_for_load_state("networkidle")

        # Check if MFA is required
        class MFARequired(BaseModel):
            mfa_required: bool = Field(..., description="Whether MFA is required")

        mfa_check = await page.extract(
            instruction="Is there a two-factor authentication or verification code prompt on the page?",
            schema=MFARequired,
        )

        if mfa_check.mfa_required:
            print("MFA DETECTED!")
            print("═══════════════════════════════════════════════════════════")
            print("PAUSED: Please complete MFA in the browser")
            print("═══════════════════════════════════════════════════════════")
            if session_id:
                print(
                    f"1. Open the Browserbase session in your browser: https://browserbase.com/sessions/{session_id}"
                )
            else:
                print("1. Open the Browserbase session in your browser")
            print("2. Enter your 2FA code from authenticator app")
            print("3. Click 'Verify' or submit")
            print("4. Wait for login to complete")
            print("\nThe script will wait for you to complete MFA...\n")

            # Wait for MFA completion (poll until we're no longer on login page)
            login_complete = False
            start_time = time.time()
            timeout = 120  # 2 minutes

            while not login_complete and (time.time() - start_time) < timeout:
                await asyncio.sleep(3)  # Check every 3 seconds

                current_url = page.url
                if "/login" not in current_url and "/sessions/two-factor" not in current_url:
                    login_complete = True

            if not login_complete:
                raise Exception("MFA timeout - login was not completed within 2 minutes")

            print("MFA completed! Login successful.\n")
        else:
            print("Login successful (no MFA required)\n")

        print(f"Context {context.id} now contains:")
        print("   - Session cookies")
        print("   - MFA trust/remember device state")
        print("   - All authentication data\n")

    return context.id


async def reuse_context(context_id: str):
    """Second session: Reuse context - NO MFA needed!"""
    print(f"Second session: Reusing context {context_id}")
    print("   (No login, no MFA required - auth state persisted)\n")

    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "browser_settings": {
                "context": {
                    "id": context_id,
                    "persist": True,
                }
            },
        },
        verbose=0,  # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
    )

    async with Stagehand(config) as stagehand:
        session_id = None
        if hasattr(stagehand, "session_id"):
            session_id = stagehand.session_id
        elif hasattr(stagehand, "browserbase_session_id"):
            session_id = stagehand.browserbase_session_id

        if session_id:
            print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        page = stagehand.page

        # Navigate directly to GitHub (should already be logged in)
        print("Navigating to GitHub...")
        await page.goto("https://github.com", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle")

        # Check if we're logged in
        class Username(BaseModel):
            username: str = Field(..., description="The logged-in username")

        username_result = await page.extract(
            instruction="Extract the logged-in username or check if we're authenticated",
            schema=Username,
        )

        print("\nSUCCESS! Already logged in without MFA!")
        print(f"   Username: {username_result.username}")
        print("\nThis is the power of Browserbase Contexts:")
        print("   - First session: User completes MFA once")
        print("   - Context saves trusted device state")
        print("   - All future sessions: No MFA required\n")


async def delete_context(context_id: str):
    """Clean up context"""
    print(f"Deleting context: {context_id}")
    try:
        # Delete via API (SDK doesn't have delete method)
        response = requests.delete(
            f"https://api.browserbase.com/v1/contexts/{context_id}",
            headers={
                "X-BB-API-Key": os.environ.get("BROWSERBASE_API_KEY"),
            },
        )

        if response.ok:
            print("Context deleted\n")
        else:
            print(f"Could not delete context: {response.status_code} {response.reason}")
            print("   Context will auto-expire after 30 days\n")
    except Exception as error:
        print(f"Could not delete context: {str(error)}")
        print("   Context will auto-expire after 30 days\n")


async def main():
    print("Starting Browserbase Context MFA Persistence Demo...")

    # Check environment variables
    if not os.environ.get("BROWSERBASE_API_KEY") or not os.environ.get("BROWSERBASE_PROJECT_ID"):
        print("\nError: Missing Browserbase credentials")
        print("   Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env")
        exit(1)

    if not os.environ.get("GITHUB_USERNAME") or not os.environ.get("GITHUB_PASSWORD"):
        print("\nError: Missing GitHub credentials")
        print("   Set GITHUB_USERNAME and GITHUB_PASSWORD in .env")
        print("Setup Instructions:")
        print("   1. Create a test GitHub account")
        print("   2. Enable 2FA: Settings → Password and authentication")
        print("   3. Set credentials in .env file")
        exit(1)

    try:
        print("\nDemo Flow:")
        print("   1. First session: Login + complete MFA manually")
        print("   2. Second session: No login, no MFA needed")
        print("   3. Clean up context\n")

        # First session: Create context and login with MFA
        context_id = await create_session_with_context()

        print("Waiting 5 seconds before reusing context...\n")
        await asyncio.sleep(5)

        # Second session: Reuse context (NO MFA!)
        await reuse_context(context_id)

        # Clean up
        await delete_context(context_id)

        print("═══════════════════════════════════════════════════════════")
        print("Key Takeaway:")
        print("═══════════════════════════════════════════════════════════")
        print("First session: User completes MFA once")
        print("Context saves trusted device state")
        print("All future sessions: No MFA prompt")
        print("Store context_id per customer in database\n")
    except Exception as error:
        print(f"\nError: {str(error)}")
        print("\nTroubleshooting:")
        print("  - Ensure GitHub credentials are correct")
        print("  - Ensure 2FA is enabled on the test account")
        print("  - Check Browserbase dashboard for session details")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_GENERATIVE_AI_API_KEY is set in environment")
        print("Docs: https://docs.stagehand.dev/v2/first-steps/introduction")
        exit(1)
