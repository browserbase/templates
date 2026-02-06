# Stagehand + Browserbase: MFA Handling - TOTP Automation - See README.md for full documentation

import hashlib
import hmac
import os
import time
import traceback

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# Demo site URL for TOTP challenge testing
DEMO_URL = "https://authenticationtest.com/totpChallenge/"


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


# Define Pydantic schema for credentials extraction
class Credentials(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")
    totp_secret: str = Field(..., description="The TOTP secret key for generating codes")


class AuthResult(BaseModel):
    success: bool = Field(..., description="Whether authentication was successful")
    message: str = Field(..., description="Success or error message")


class RetryResult(BaseModel):
    success: bool = Field(..., description="Whether the retry login was successful")


def main():
    print("Starting MFA Handling - TOTP Automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(model_name="openai/gpt-4.1")
    session_id = start_response.data.session_id

    try:
        print("Stagehand initialized successfully!")
        print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to TOTP challenge demo page
            print("Navigating to TOTP Challenge page...")
            page.goto(DEMO_URL, wait_until="domcontentloaded")

            # Extract test credentials and TOTP secret from the page
            print("Extracting test credentials and TOTP secret...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract the test email, password, and TOTP secret key shown on the page",
                schema=Credentials.model_json_schema(),
            )
            credentials_data = extract_response.data.result

            print(f"Credentials extracted - Email: {credentials_data.get('email')}")

            # Generate TOTP code using RFC 6238 algorithm
            totp_code = generate_totp(credentials_data.get("totp_secret", ""))
            seconds_left = 30 - (int(time.time()) % 30)
            print(f"Generated TOTP code: {totp_code} (valid for {seconds_left} seconds)")

            # Fill in login form with email and password
            print("Filling in email...")
            client.sessions.act(
                id=session_id,
                input=f"Type '{credentials_data.get('email')}' into the email field",
            )

            print("Filling in password...")
            client.sessions.act(
                id=session_id,
                input=f"Type '{credentials_data.get('password')}' into the password field",
            )

            # Fill in TOTP code
            print("Filling in TOTP code...")
            client.sessions.act(
                id=session_id,
                input=f"Type '{totp_code}' into the TOTP code field",
            )

            # Submit the form
            print("Submitting form...")
            client.sessions.act(
                id=session_id,
                input="Click the submit or login button",
            )

            # Wait for response - be tolerant of sites that never reach full "networkidle"
            try:
                print("Waiting for page to finish loading after submit...")
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                print(
                    "Timed out waiting for 'networkidle' after submit; continuing because the login likely succeeded."
                )

            # Check if login succeeded
            print("Checking authentication result...")
            result_response = client.sessions.extract(
                id=session_id,
                instruction="Check if the login was successful or if there's an error message",
                schema=AuthResult.model_json_schema(),
            )
            result = result_response.data.result

            if result.get("success"):
                print("SUCCESS! TOTP authentication completed automatically!")
                print(f"Authentication Result: {result.get('message')}")
            else:
                print(f"Authentication may have failed. Message: {result.get('message')}")
                print("Retrying with a fresh TOTP code...")

                # Regenerate and retry with new code (handles time window edge cases)
                new_code = generate_totp(credentials_data.get("totp_secret", ""))
                print(f"New TOTP code: {new_code}")

                client.sessions.act(
                    id=session_id,
                    input="Clear the TOTP code field",
                )
                client.sessions.act(
                    id=session_id,
                    input=f"Type '{new_code}' into the TOTP code field",
                )
                client.sessions.act(
                    id=session_id,
                    input="Click the submit or login button",
                )

                try:
                    print("Waiting for page to finish loading after retry submit...")
                    page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    print(
                        "Timed out waiting for 'networkidle' after retry submit; continuing because the login likely succeeded."
                    )

                retry_response = client.sessions.extract(
                    id=session_id,
                    instruction="Check if the login was successful",
                    schema=RetryResult.model_json_schema(),
                )
                retry_result = retry_response.data.result

                if retry_result.get("success"):
                    print("Success on retry!")
                else:
                    print("Authentication failed after retry")

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")

    except Exception as error:
        print(f"Error during MFA handling: {error}")
        traceback.print_exc()
        client.sessions.end(id=session_id)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in MFA handling: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Check .env file has OPENAI_API_KEY (or set model_api_key for your chosen model)")
        print("  - TOTP code may have expired (try running again)")
        print("  - Page structure may have changed")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
