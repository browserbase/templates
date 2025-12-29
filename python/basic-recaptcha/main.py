# Basic reCAPTCHA Solving with Browserbase - See README.md for full documentation

import asyncio
import os

from dotenv import load_dotenv

from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

# Set to False to disable automatic captcha solving (True by default)
solve_captchas = True


async def main():
    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    # Enable captcha solving in browser settings for automatic reCAPTCHA handling.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-pro",
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
        verbose=0,
        # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "browser_settings": {
                "solveCaptchas": solve_captchas,
            },
        },
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            # Initialize browser session to start automation.
            print("Stagehand initialized successfully!")
            session_id = None
            if hasattr(stagehand, "session_id"):
                session_id = stagehand.session_id
            elif hasattr(stagehand, "browserbase_session_id"):
                session_id = stagehand.browserbase_session_id

            if session_id:
                print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to Google reCAPTCHA demo page to test captcha solving.
            print("Navigating to reCAPTCHA demo page...")
            await page.goto("https://google.com/recaptcha/api2/demo")

            # Wait for Browserbase to solve the captcha automatically.
            # Listen for console messages indicating captcha solving progress.
            if solve_captchas:
                print("Waiting for captcha to be solved...")
                captcha_solved = asyncio.Event()

                def handle_console(msg):
                    if msg.text == "browserbase-solving-started":
                        print("Captcha solving in progress...")
                    elif msg.text == "browserbase-solving-finished":
                        print("Captcha solving completed!")
                        captcha_solved.set()

                page.on("console", handle_console)
                await captcha_solved.wait()
            else:
                print("Captcha solving is disabled. Skipping wait...")

            # Click submit again after captcha is solved to complete the form submission.
            print("Clicking submit button after captcha is solved...")
            await page.act("Click the Submit button")

            # Extract and display the page content to verify successful submission.
            print("Extracting page content...")
            text = await page.extract("Extract all the text on this page")
            print("Page content:")
            print(text)

            # Check if captcha was successfully solved by looking for success message.
            if isinstance(text, dict) and "extraction" in text:
                extraction_text = text["extraction"]
            elif isinstance(text, str):
                extraction_text = text
            else:
                extraction_text = str(text)

            if "Verification Success... Hooray!" in extraction_text:
                print("reCAPTCHA successfully solved!")
            else:
                print("Could not verify captcha success from page content")

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during reCAPTCHA solving: {error}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in reCAPTCHA solving example: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify solveCaptchas is enabled in browserSettings")
        print("  - Ensure the demo page is accessible")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
