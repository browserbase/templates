# Playwright + Browserbase: Quickstart
# See README.md for full documentation

import os

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import Playwright, sync_playwright

load_dotenv()

# ============= CONFIGURATION =============
BROWSERBASE_API_KEY = os.environ["BROWSERBASE_API_KEY"]
# =========================================

bb = Browserbase(api_key=BROWSERBASE_API_KEY)


def run(playwright: Playwright) -> None:
    session = bb.sessions.create()
    print(f"Session created, id: {session.id}")

    print("Starting remote browser...")
    chromium = playwright.chromium
    browser = chromium.connect_over_cdp(session.connect_url)
    context = browser.contexts[0]
    page = context.pages[0]

    try:
        debug_urls = bb.sessions.debug(session.id)
        print(f"Session started, live debug accessible here: {debug_urls.debugger_url}.")

        # Navigate to the SFMOMA homepage
        page.goto("https://www.sfmoma.org", wait_until="domcontentloaded")
        print(f"At URL: {page.url} | Title: {page.title()}")

        wait_timeout = 10_000

        # Click the search button to open the search overlay
        search_button = page.locator('button[aria-label="Open search"]')
        search_button.wait_for(state="visible", timeout=wait_timeout)
        search_button.click()
        print("Clicked search button — search overlay opened")

        # Close the search overlay
        close_button = page.locator('button[aria-label="Close search"]')
        close_button.wait_for(state="visible", timeout=wait_timeout)
        close_button.click()
        print("Closed search overlay")

        # Click the Membership link
        membership_link = page.get_by_role("link", name="Membership", exact=True)
        membership_link.wait_for(state="visible", timeout=wait_timeout)
        membership_link.click()
        page.wait_for_url("**/membership**", timeout=wait_timeout)
        print(f"At URL: {page.url} | Title: {page.title()}")

        # Extract copy from the membership page
        heading = page.locator("h1")
        heading.wait_for(state="visible", timeout=wait_timeout)
        print(f"Heading: {heading.text_content()}")

        intro = page.locator("main p").first
        print(f"Intro: {intro.text_content()}")
    finally:
        page.close()
        browser.close()

    print(f"Session complete! View replay at https://browserbase.com/sessions/{session.id}")


if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
