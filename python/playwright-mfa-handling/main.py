# Playwright + Browserbase: MFA Handling - TOTP Automation - See README.md for full documentation

import asyncio
import hashlib
import hmac
import os
import time

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

# Load environment variables
load_dotenv()

# Demo site URL for TOTP challenge testing
DEMO_URL = "https://authenticationtest.com/totpChallenge/"

# Test credentials (displayed on the demo page)
TEST_CREDENTIALS = {
    "email": "totp@authenticationtest.com",
    "password": "pa$$w0rd",
    "totp_secret": "I65VU7K5ZQL7WB4E",
}


def generate_totp(secret: str, window: int = 0) -> str:
    """
    Generate TOTP code (Time-based One-Time Password) using RFC 6238 compliant algorithm.

    Same algorithm used by Google Authenticator, Authy, and other authenticator apps.
    """
    # Convert base32 secret to bytes
    base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    bits = ""
    hex_str = ""

    secret = secret.upper().rstrip("=")

    for char in secret:
        val = base32chars.find(char)
        if val == -1:
            raise ValueError("Invalid base32 character in secret")
        bits += format(val, "05b")

    for i in range(0, len(bits) - 3, 4):
        chunk = bits[i : i + 4]
        hex_str += format(int(chunk, 2), "x")

    secret_bytes = bytes.fromhex(hex_str)

    # Get current time window (30 second intervals)
    time_window = int(time.time() // 30) + window
    time_bytes = time_window.to_bytes(8, byteorder="big")

    # Generate HMAC-SHA1 hash
    hmac_result = hmac.new(secret_bytes, time_bytes, hashlib.sha1).digest()

    # Dynamic truncation to extract 6-digit code
    offset = hmac_result[-1] & 0xF
    code = (
        ((hmac_result[offset] & 0x7F) << 24)
        | ((hmac_result[offset + 1] & 0xFF) << 16)
        | ((hmac_result[offset + 2] & 0xFF) << 8)
        | (hmac_result[offset + 3] & 0xFF)
    )

    # Return 6-digit code with leading zeros
    return str(code % 1000000).zfill(6)


async def create_browserbase_session() -> tuple[Browser, BrowserContext, Page, str]:
    """Create a Browserbase session and connect via CDP."""
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    project_id = os.environ.get("BROWSERBASE_PROJECT_ID")

    if not api_key:
        raise ValueError("BROWSERBASE_API_KEY environment variable is required")
    if not project_id:
        raise ValueError("BROWSERBASE_PROJECT_ID environment variable is required")

    bb = Browserbase(api_key=api_key)
    session = bb.sessions.create(project_id=project_id)

    print(f"Session created: https://browserbase.com/sessions/{session.id}")

    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(session.connect_url)

    context = browser.contexts[0]
    if not context:
        raise ValueError("No default context found")

    page = context.pages[0]
    if not page:
        raise ValueError("No page found in default context")

    return browser, context, page, session.id


async def fill_login_form(page: Page, email: str, password: str, totp_code: str) -> None:
    """Fill in the login form with credentials and TOTP code."""
    # Fill email field
    email_input = page.locator('input[type="email"], input[placeholder*="email" i]').first
    await email_input.wait_for(state="visible", timeout=10000)
    await email_input.fill(email)
    print("Filled email field")

    # Fill password field
    password_input = page.locator('input[type="password"]')
    await password_input.fill(password)
    print("Filled password field")

    # Fill TOTP code field (third input in the form)
    totp_input = page.locator("form input").nth(2)
    await totp_input.fill(totp_code)
    print("Filled TOTP code field")


async def submit_form(page: Page) -> None:
    """Submit the login form."""
    submit_button = page.locator('input[type="submit"], button[type="submit"], form button').first
    await submit_button.click()
    print("Clicked submit button")

    await page.wait_for_load_state("domcontentloaded", timeout=20000)


async def check_login_result(page: Page) -> dict:
    """Check if the login was successful."""
    # Check for failure indicator
    failure_heading = page.locator('text="Login Failure"')
    has_failure = await failure_heading.is_visible()

    if has_failure:
        error_message = await page.locator("body").text_content() or ""
        message = (
            "Sorry -- You have not successfully logged in"
            if "not successfully logged in" in error_message
            else "Login failed"
        )
        return {"success": False, "message": message}

    # Check for success indicator
    success_heading = page.locator('text="Login Success"')
    has_success = await success_heading.is_visible()

    if has_success:
        return {"success": True, "message": "Successfully logged in with TOTP"}

    # Fallback: check page content
    page_content = await page.locator("body").text_content() or ""
    if "success" in page_content.lower():
        return {"success": True, "message": "Login appears successful"}

    return {"success": False, "message": "Unable to determine login result"}


async def main():
    print("Starting MFA Handling - TOTP Automation (Playwright + Browserbase)...\n")

    browser = None

    try:
        # Create browser session
        browser, context, page, session_id = await create_browserbase_session()

        print(f"Live View: https://browserbase.com/sessions/{session_id}\n")

        # Navigate to TOTP challenge demo page
        print("Navigating to TOTP Challenge page...")
        await page.goto(DEMO_URL, wait_until="domcontentloaded")

        # Generate TOTP code using RFC 6238 algorithm
        totp_code = generate_totp(TEST_CREDENTIALS["totp_secret"])
        seconds_left = 30 - (int(time.time()) % 30)
        print(f"Generated TOTP code: {totp_code} (valid for {seconds_left}s)")

        # Fill in login form
        print("\nFilling login form...")
        await fill_login_form(
            page,
            TEST_CREDENTIALS["email"],
            TEST_CREDENTIALS["password"],
            totp_code,
        )

        # Submit the form
        print("\nSubmitting form...")
        await submit_form(page)

        # Check if login succeeded
        print("\nChecking authentication result...")
        result = await check_login_result(page)

        if result["success"]:
            print("\nSUCCESS! TOTP authentication completed automatically!")
            print(f"Result: {result['message']}")
        else:
            print(f"\nInitial attempt may have failed: {result['message']}")
            print("Retrying with a fresh TOTP code...\n")

            # Navigate back and retry with new code
            await page.goto(DEMO_URL, wait_until="domcontentloaded")

            new_code = generate_totp(TEST_CREDENTIALS["totp_secret"])
            print(f"New TOTP code: {new_code}")

            await fill_login_form(
                page,
                TEST_CREDENTIALS["email"],
                TEST_CREDENTIALS["password"],
                new_code,
            )
            await submit_form(page)

            retry_result = await check_login_result(page)

            if retry_result["success"]:
                print("\nSuccess on retry!")
                print(f"Result: {retry_result['message']}")
            else:
                print("\nAuthentication failed after retry")
                print(f"Result: {retry_result['message']}")

        print("\nMFA handling completed")

    except Exception as error:
        print(f"Error during MFA handling: {error}")
        import traceback

        traceback.print_exc()
        raise

    finally:
        if browser:
            await browser.close()
            print("Browser closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"\nError in MFA handling: {err}")
        print("\nCommon issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - TOTP code may have expired (try running again)")
        print("  - Page structure may have changed")
        exit(1)
