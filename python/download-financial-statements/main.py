# Stagehand + Browserbase: Download Apple's Quarterly Financial Statements - See README.md for full documentation

import os
import time

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from stagehand import Stagehand

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, GOOGLE_API_KEY
load_dotenv()


def save_downloads_with_retry(bb: Browserbase, session_id: str, retry_for_seconds: int = 30) -> int:
    """
    Polls Browserbase API for downloads with timeout handling.

    Browserbase stores downloaded files during a session and makes them available
    via API. Files may take a few seconds to process, so this function implements
    retry logic to wait for downloads to be ready before retrieving them.

    Args:
        bb: Browserbase client instance for API calls
        session_id: The Browserbase session ID to retrieve downloads from
        retry_for_seconds: Maximum time to wait for downloads (default: 30 seconds)

    Returns:
        int: The size of the downloaded ZIP file in bytes

    Raises:
        TimeoutError: If downloads aren't ready within the specified timeout
    """
    print(f"Waiting up to {retry_for_seconds} seconds for downloads to complete...")

    # Track elapsed time to implement timeout without using threading timers
    start_time = time.time()
    timeout = retry_for_seconds

    while True:
        elapsed = time.time() - start_time

        # Check if we've exceeded the timeout period
        if elapsed >= timeout:
            raise TimeoutError("Download timeout exceeded")

        try:
            print("Checking for downloads...")
            response = bb.sessions.downloads.list(session_id)
            download_buffer = response.read()

            # Check if downloads are ready (non-empty buffer indicates files are available)
            if len(download_buffer) > 0:
                print(f"Downloads ready! File size: {len(download_buffer)} bytes")

                # Save the ZIP file containing all downloaded PDFs to disk
                with open("downloaded_files.zip", "wb") as f:
                    f.write(download_buffer)
                print("Files saved as: downloaded_files.zip")
                return len(download_buffer)
            else:
                print("Downloads not ready yet, retrying...")
        except Exception as e:
            print(f"Error fetching downloads: {e}")
            raise

        # Poll every 2 seconds to check if downloads are ready
        # This interval balances responsiveness with API rate limits
        time.sleep(2)


def main():
    """
    Main application entry point.

    Orchestrates the entire PDF download automation process:
    1. Initializes Browserbase and Stagehand clients
    2. Navigates to Apple's investor relations site
    3. Locates and clicks quarterly financial statement links
    4. Waits for downloads to process and saves them as a ZIP file
    """
    print("Starting Apple Financial Statements Download Automation...")

    # Initialize Browserbase client for session management and downloads API
    print("Initializing Browserbase client...")
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    # Stagehand provides natural language browser control (act, extract, observe)
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="google/gemini-2.5-flash-preview-05-20",
    )
    session_id = start_response.data.session_id

    try:
        print("Stagehand initialized successfully!")

        # Display live view URL for debugging and monitoring
        # Live view allows real-time observation of browser automation
        live_view_links = bb.sessions.debug(session_id)
        live_view_link = live_view_links.debuggerFullscreenUrl
        print(f"🔍 Live View Link: {live_view_link}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to Apple homepage with extended timeout for slow-loading sites
            print("Navigating to Apple.com...")
            page.goto("https://www.apple.com/", timeout=60000)

            # Navigate to investor relations section using natural language actions
            # act() uses AI to interpret instructions and perform browser interactions
            print("Navigating to Investors section...")
            client.sessions.act(
                id=session_id,
                input="Click the 'Investors' button at the bottom of the page",
            )
            client.sessions.act(
                id=session_id,
                input="Scroll down to the Financial Data section of the page",
            )
            client.sessions.act(
                id=session_id,
                input="Under Quarterly Earnings Reports, click on '2025'",
            )

            # Download all quarterly financial statements
            # When a URL of a PDF is opened, Browserbase automatically downloads and stores the PDF
            # Files are captured in the session and can be retrieved via the downloads API
            # See https://docs.browserbase.com/features/screenshots#pdfs for more info
            print("Downloading quarterly financial statements...")
            client.sessions.act(
                id=session_id,
                input="Click the 'Financial Statements' link under Q4",
            )
            client.sessions.act(
                id=session_id,
                input="Click the 'Financial Statements' link under Q3",
            )
            client.sessions.act(
                id=session_id,
                input="Click the 'Financial Statements' link under Q2",
            )
            client.sessions.act(
                id=session_id,
                input="Click the 'Financial Statements' link under Q1",
            )

            # Retrieve all downloads triggered during this session from Browserbase API
            # Files take time to process, so we poll with retry logic (45 second timeout)
            print("Retrieving downloads from Browserbase...")
            save_downloads_with_retry(bb, session_id, 45)
            print("All downloads completed successfully!")

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")

    except Exception as error:
        print(f"Error during automation: {error}")
        client.sessions.end(id=session_id)
        raise


if __name__ == "__main__":
    # Entry point for script execution
    try:
        main()
    except Exception as err:
        # Handle any uncaught exceptions and provide helpful debugging information
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify internet connection and Apple website accessibility")
        print("  - Ensure sufficient timeout for slow-loading pages")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
