# Basic reCAPTCHA Solving with Browserbase - See README.md for full documentation

import os
import threading

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# Set to False to disable automatic captcha solving (True by default)
solve_captchas = True


def main():
    # Initialize Browserbase SDK for session creation with captcha solving
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

    # Create session with captcha solving enabled
    session = bb.sessions.create(
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        browser_settings={
            "solveCaptchas": solve_captchas,
        },
    )
    session_id = session.id

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

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

            # Navigate to Google reCAPTCHA demo page to test captcha solving.
            print("Navigating to reCAPTCHA demo page...")
            page.goto("https://google.com/recaptcha/api2/demo")

            # Wait for Browserbase to solve the captcha automatically.
            # Listen for console messages indicating captcha solving progress.
            if solve_captchas:
                print("Waiting for captcha to be solved...")
                captcha_solved = threading.Event()

                def handle_console(msg):
                    if msg.text == "browserbase-solving-started":
                        print("Captcha solving in progress...")
                    elif msg.text == "browserbase-solving-finished":
                        print("Captcha solving completed!")
                        captcha_solved.set()

                page.on("console", handle_console)
                captcha_solved.wait()
            else:
                print("Captcha solving is disabled. Skipping wait...")

            # Click submit again after captcha is solved to complete the form submission.
            print("Clicking submit button after captcha is solved...")
            client.sessions.act(
                id=session_id,
                input="Click the Submit button",
            )

            # Extract and display the page content to verify successful submission.
            print("Extracting page content...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract all the text on this page",
                schema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "All text on the page"}
                    },
                    "required": ["text"],
                },
            )
            text = extract_response.data.result.get("text", "")
            print("Page content:")
            print(text)

            # Check if captcha was successfully solved by looking for success message.
            if "Verification Success... Hooray!" in text:
                print("reCAPTCHA successfully solved!")
            else:
                print("Could not verify captcha success from page content")

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")

    except Exception as error:
        print(f"Error during reCAPTCHA solving: {error}")
        client.sessions.end(id=session_id)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in reCAPTCHA solving example: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify solveCaptchas is enabled in browserSettings")
        print("  - Ensure the demo page is accessible")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
