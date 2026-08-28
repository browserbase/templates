# Playwright + Browserbase: Download Apple's Quarterly Financial Statements
# See README.md for full documentation

import asyncio
import os

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.async_api import BrowserContext, Page, async_playwright

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
load_dotenv()


async def save_downloads_with_retry(
    bb: Browserbase, session_id: str, retry_for_seconds: int = 30
) -> int:
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
    start_time = asyncio.get_event_loop().time()
    timeout = retry_for_seconds

    while True:
        elapsed = asyncio.get_event_loop().time() - start_time

        # Check if we've exceeded the timeout period
        if elapsed >= timeout:
            raise TimeoutError("Download timeout exceeded")

        try:
            print("Checking for downloads...")
            # Use asyncio.to_thread for synchronous Browserbase SDK calls
            # This prevents blocking the event loop while waiting for API responses
            response = await asyncio.to_thread(bb.sessions.downloads.list, session_id)
            download_buffer = await asyncio.to_thread(response.read)

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
        await asyncio.sleep(2)


async def scroll_to_text(page: Page, text: str) -> None:
    """
    Scrolls to an element on the page by text content.

    Uses JavaScript evaluation to find elements containing the specified text
    and smoothly scrolls them into view.

    Args:
        page: Playwright page instance
        text: The text content to search for and scroll to
    """
    await page.evaluate(
        """(searchText) => {
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                if (el.textContent?.includes(searchText)) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        }""",
        text,
    )
    await asyncio.sleep(0.5)


async def click_financial_statements_link(page: Page, quarter: str) -> None:
    """
    Clicks a Financial Statements link for a specific quarter.

    Uses context-aware selection to find the right link in the quarterly table.
    Falls back to positional selection if the context-based approach fails.

    Args:
        page: Playwright page instance
        quarter: The quarter identifier (e.g., "Q1", "Q2", "Q3", "Q4")

    Raises:
        Exception: If the Financial Statements link cannot be found
    """
    print(f"Clicking Financial Statements link for {quarter}...")

    # Try to find the link by traversing from the quarter label to sibling links
    link = (
        page.locator(f"text={quarter}")
        .locator("..")
        .locator("..")
        .get_by_role("link", name="Financial Statements")
        .first
    )

    link_exists = await link.count() > 0

    if link_exists:
        await link.click()
    else:
        # Fallback: find all Financial Statements links and click by position
        # Q4 is first (index 0), Q3 is second (index 1), etc.
        all_links = page.get_by_role("link", name="Financial Statements")
        count = await all_links.count()

        quarter_positions = {
            "Q4": 0,
            "Q3": 1,
            "Q2": 2,
            "Q1": 3,
        }

        position = quarter_positions.get(quarter)
        if position is not None and position < count:
            await all_links.nth(position).click()
        else:
            raise Exception(f"Could not find Financial Statements link for {quarter}")

    # Wait for download to initiate before clicking next link
    await asyncio.sleep(2)


async def main():
    """
    Main application entry point.

    Orchestrates the entire PDF download automation process:
    1. Initializes Browserbase client and creates a session
    2. Connects Playwright to Browserbase via CDP
    3. Navigates to Apple's investor relations site
    4. Locates and clicks quarterly financial statement links
    5. Waits for downloads to process and saves them as a ZIP file
    """
    print("Starting Apple Financial Statements Download Automation (Playwright)...")

    # Initialize Browserbase SDK client for cloud browser management
    print("Initializing Browserbase client...")
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

    # Create a new browser session in Browserbase cloud
    print("Creating Browserbase session...")
    session = bb.sessions.create(project_id=os.environ.get("BROWSERBASE_PROJECT_ID"))
    print(f"Session created: https://browserbase.com/sessions/{session.id}")

    # Display live view URL for debugging and monitoring
    live_view_links = bb.sessions.debug(session.id)
    print(f"Live View: {live_view_links.debugger_fullscreen_url}")

    async with async_playwright() as playwright:
        # Connect Playwright to Browserbase via Chrome DevTools Protocol (CDP)
        # This gives direct control over the cloud-hosted browser
        browser = await playwright.chromium.connect_over_cdp(session.connect_url)

        context: BrowserContext = browser.contexts[0]
        if not context:
            raise Exception("No browser context found")

        page: Page = context.pages[0]
        if not page:
            raise Exception("No page found in browser context")

        # Configure CDP to allow file downloads during the session
        # eventsEnabled: true allows tracking download progress
        client = await context.new_cdp_session(page)
        await client.send(
            "Browser.setDownloadBehavior",
            {
                "behavior": "allow",
                "downloadPath": "downloads",
                "eventsEnabled": True,
            },
        )
        print("Download behavior configured")

        try:
            # Navigate to Apple homepage with extended timeout for slow-loading sites
            print("Navigating to Apple.com...")
            await page.goto(
                "https://www.apple.com/",
                wait_until="domcontentloaded",
                timeout=60000,
            )

            # Scroll to footer where investor links are located
            print("Scrolling to footer...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            # Navigate to investor relations section
            print("Clicking Investors link...")
            await page.get_by_role("link", name="Investors").click()
            await page.wait_for_load_state("domcontentloaded")
            print(f"Navigated to: {page.url}")

            # Scroll to the Financial Data section of the investor relations page
            print("Scrolling to Financial Data section...")
            await scroll_to_text(page, "Financial Data")
            await asyncio.sleep(1)

            # Locate the Quarterly Earnings Reports table
            print("Locating Quarterly Earnings Reports...")
            await scroll_to_text(page, "Quarterly Earnings Reports")
            await asyncio.sleep(1)

            # Click on the 2025 year tab to show current year's reports
            year_tab = page.locator("text=2025").first
            if await year_tab.is_visible():
                print("Clicking 2025 year tab...")
                await year_tab.click()
                await asyncio.sleep(1)

            # Download all quarterly financial statements
            # When a PDF link is clicked, Browserbase automatically captures and stores the file
            # See https://docs.browserbase.com/features/screenshots#pdfs for more info
            print("\nDownloading quarterly financial statements...")

            await click_financial_statements_link(page, "Q4")
            await click_financial_statements_link(page, "Q3")
            await click_financial_statements_link(page, "Q2")
            await click_financial_statements_link(page, "Q1")

            print("\nAll PDF links clicked. Waiting for downloads to sync...")

            # Retrieve all downloads triggered during this session from Browserbase API
            print("Retrieving downloads from Browserbase...")
            await save_downloads_with_retry(bb, session.id, 45)
            print("\nAll downloads completed successfully!")

        except Exception as error:
            print(f"Error during automation: {error}")
            raise
        finally:
            # Always close browser to release resources and end session
            await browser.close()
            print("Browser closed, session ended")
            print(f"\nView session replay: https://browserbase.com/sessions/{session.id}")


if __name__ == "__main__":
    # Entry point for script execution
    # asyncio.run() creates event loop and runs main() coroutine until completion
    try:
        asyncio.run(main())
    except Exception as err:
        # Handle any uncaught exceptions and provide helpful debugging information
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify internet connection and Apple website accessibility")
        print("  - Ensure sufficient timeout for slow-loading pages")
        print("Docs: https://docs.browserbase.com/introduction/playwright")
        exit(1)
