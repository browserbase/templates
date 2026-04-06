# Selenium + Browserbase: Quickstart
# See README.md for full documentation

import os

from browserbase import Browserbase
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.client_config import ClientConfig
from selenium.webdriver.support import expected_conditions as EC  # noqa: N812
from selenium.webdriver.support.ui import WebDriverWait

load_dotenv()

# ============= CONFIGURATION =============
BROWSERBASE_API_KEY = os.getenv("BROWSERBASE_API_KEY")
# =========================================

bb = Browserbase(api_key=BROWSERBASE_API_KEY)


def run() -> None:
    # Create a new Browserbase session and connect via Selenium
    session = bb.sessions.create()
    client_config = ClientConfig(
        remote_server_addr=session.selenium_remote_url,
        extra_headers={
            "x-bb-api-key": BROWSERBASE_API_KEY,
            "session-id": session.id,
        },
    )
    driver = webdriver.Remote(
        options=webdriver.ChromeOptions(),
        client_config=client_config,
    )

    try:
        print(
            "Connected to Browserbase",
            f"{driver.name} version {driver.caps['browserVersion']}",  # type: ignore
        )
        print(f"Live debug URL: https://browserbase.com/sessions/{session.id}")

        # Navigate to the SFMOMA homepage
        driver.get("https://www.sfmoma.org")
        print(f"At URL: {driver.current_url} | Title: {driver.title}")
        assert driver.current_url == "https://www.sfmoma.org/"
        assert driver.title == "SFMOMA"

        wait = WebDriverWait(driver, 10)

        # Click the search button to open the search overlay
        search_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[aria-label="Open search"]'))
        )
        search_button.click()
        print("Clicked search button — search overlay opened")

        # Close the search overlay
        close_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[aria-label="Close search"]'))
        )
        close_button.click()
        print("Closed search overlay")

        # Click the Membership link
        membership_link = wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Membership")))
        membership_link.click()
        wait.until(EC.url_contains("/membership"))
        print(f"At URL: {driver.current_url} | Title: {driver.title}")

        # Extract copy from the membership page
        heading = wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        print(f"Heading: {heading.text}")

        intro = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "main p")))
        print(f"Intro: {intro.text}")

    finally:
        # Make sure to quit the driver so your session is ended!
        driver.quit()


if __name__ == "__main__":
    run()
