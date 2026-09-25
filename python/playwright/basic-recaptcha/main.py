# Basic reCAPTCHA Solving with Playwright + Browserbase - See README.md for full documentation
#
# This template uses Playwright directly with the Browserbase SDK for lower-level browser control.
# For a higher-level API with natural language commands, see the Stagehand template instead.

import asyncio
import os

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv()

DEMO_URL = "https://google.com/recaptcha/api2/demo"
SOLVE_CAPTCHAS = True  # Set to False to disable automatic captcha solving


def validate_env() -> str:
    """Validate required environment variables before starting.

    Browserbase credentials are required to create browser sessions.

    Returns:
        The api_key string

    Raises:
        ValueError: If required environment variables are missing
    """
    api_key = os.environ.get("BROWSERBASE_API_KEY")

    if not api_key:
        raise ValueError("BROWSERBASE_API_KEY environment variable is required")

    return api_key


async def main():
    print("Starting Playwright + Browserbase reCAPTCHA Example...")

    api_key = validate_env()

    # Initialize the Browserbase SDK client.
    bb = Browserbase(api_key=api_key)

    # Create a new browser session with captcha solving enabled.
    # solveCaptchas: Browserbase setting that enables automatic solving for
    # reCAPTCHA, hCaptcha, and other captcha types.
    # Docs: https://docs.browserbase.com/features/stealth-mode#captcha-solving
    print("Creating Browserbase session with captcha solving enabled...")
    session = bb.sessions.create(
        browser_settings={"solveCaptchas": SOLVE_CAPTCHAS},
    )

    print(f"Session created! ID: {session.id}")
    print(f"Live View: https://browserbase.com/sessions/{session.id}")

    async with async_playwright() as playwright:
        # Connect to the browser via Chrome DevTools Protocol (CDP).
        # This gives direct Playwright control over the Browserbase-managed browser.
        print("Connecting to browser via CDP...")
        browser = await playwright.chromium.connect_over_cdp(session.connect_url)

        # Get the default browser context and page from the connected browser.
        context = browser.contexts[0]
        if not context:
            raise RuntimeError("No browser context found")

        page = context.pages[0]
        if not page:
            raise RuntimeError("No page found in context")

        try:
            # Set up captcha solving state tracking.
            captcha_solved = asyncio.Event()

            # Listen for browser console messages indicating captcha solving progress.
            # Browserbase emits these events when automatic captcha solving is active:
            #   - "browserbase-solving-started": CAPTCHA detection began
            #   - "browserbase-solving-finished": CAPTCHA solving completed
            if SOLVE_CAPTCHAS:

                def handle_console(msg):
                    text = msg.text
                    if text == "browserbase-solving-started":
                        print("Captcha solving in progress...")
                    elif text == "browserbase-solving-finished":
                        print("Captcha solving completed!")
                        captcha_solved.set()

                page.on("console", handle_console)

            # Navigate to Google reCAPTCHA demo page to test captcha solving.
            print("Navigating to reCAPTCHA demo page...")
            await page.goto(DEMO_URL, wait_until="domcontentloaded")

            # Wait for Browserbase to solve the captcha automatically.
            # CAPTCHA solving typically takes 5-30 seconds depending on type and complexity.
            # We use a 60-second timeout to prevent hanging indefinitely on failures.
            if SOLVE_CAPTCHAS and not captcha_solved.is_set():
                print("Waiting for captcha to be solved...")
                try:
                    await asyncio.wait_for(captcha_solved.wait(), timeout=60.0)
                except asyncio.TimeoutError:
                    raise TimeoutError("Captcha solving timed out after 60 seconds")
            elif not SOLVE_CAPTCHAS:
                print("Captcha solving is disabled. Skipping wait...")

            # Submit the form after captcha is solved.
            print("Clicking submit button...")
            await page.click('input[type="submit"]')

            await page.wait_for_load_state("domcontentloaded")

            # Display the resulting page content.
            page_content = await page.text_content("body")
            print(f"Page content: {page_content[:500] if page_content else 'None'}")

        except Exception as error:
            print(f"Error during reCAPTCHA solving: {error}")
            raise

        finally:
            # Always close the browser to release resources and end the Browserbase session.
            await browser.close()
            print("\nSession closed successfully")
            print(f"View replay at: https://browserbase.com/sessions/{session.id}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("\nCommon issues:")
        print("  - Check .env file has BROWSERBASE_API_KEY")
        print("  - Verify solveCaptchas is enabled (True by default)")
        print("  - Allow up to 60 seconds for CAPTCHA solving to complete")
        print("  - Enable proxies for higher success rates")
        print("\nDocs: https://docs.browserbase.com/features/stealth-mode#captcha-solving")
        exit(1)
