# Stagehand + Browserbase: Restaurant Menu Extractor
# See README.md for full documentation

"""
Main entrypoint for restaurant menu extraction.

This script uses Stagehand + Browserbase to automatically:
1. Navigate to restaurant websites
2. Find and click menu links
3. Extract structured menu data (sections, categories, items)
4. Save results to JSON files

Usage:
    python main.py              # Interactive mode - prompts for URL
    python main.py --batch      # Batch mode - processes URLs from websites.txt
"""

from stagehand import Stagehand
from config import (
    BROWSERBASE_API_KEY,
    BROWSERBASE_PROJECT_ID,
    MODEL_API_KEY,
    NO_MENU_LINK_FOUND,
    logger
)
from models import MENU_SCHEMA
from utils import normalize_url, get_website_from_user, load_websites_from_file, save_menu_to_json
from scraper import close_popups, find_menu_link, extract_menu_from_sections, process_restaurant


def main():
    """Main function for interactive single-restaurant extraction."""
    # Initialize Stagehand client
    client = Stagehand(
        browserbase_api_key=BROWSERBASE_API_KEY,
        browserbase_project_id=BROWSERBASE_PROJECT_ID,
        model_api_key=MODEL_API_KEY,
    )

    stagehand_session = client.sessions.start(
        model_name="google/gemini-2.5-flash",
    )
    session_id = stagehand_session.data.session_id
    logger.info(f"Session started: {session_id}")
    logger.info(f"Watch live: https://browserbase.com/sessions/{session_id}")

    try:
        # Get website URL from user
        website_url = normalize_url(get_website_from_user())
        logger.info(f"Navigating to {website_url} ...")

        # Navigate to website using Stagehand
        client.sessions.navigate(
            id=session_id,
            url=website_url,
        )
        
        # Close any popups
        close_popups(client, session_id)

        # Locate menu link with retries
        all_menu_sections = []
        menu_link = find_menu_link(client, session_id)
        if menu_link == NO_MENU_LINK_FOUND:
            logger.error("Could not find menu link after multiple attempts.")
        else:
            logger.info(f"Menu link found: {menu_link}")

            # Navigate to menu
            client.sessions.act(
                id=session_id,
                input=f"Click on: {menu_link[0] if isinstance(menu_link, list) else menu_link}",
            )

            # Find menu subsections
            sections_response = client.sessions.observe(
                id=session_id,
                instruction="Find all subsections on the current menu page, i.e. 'Lunch', 'Dinner', 'Happy Hour', etc. "
                           "Return them as a list of links. If none found, return the current page link only in a list. "
                           "Do not return duplicates if a link appears multiple times.",
            )
            sections = sections_response.data.result

            # Extract menu from all sections
            all_menu_sections = extract_menu_from_sections(client, session_id, sections)

        # Save combined menu data to JSON file
        if all_menu_sections:
            save_menu_to_json(website_url, all_menu_sections)

    finally:
        # End session
        client.sessions.end(id=session_id)
        logger.info("Session closed successfully")


def batch_process():
    """
    Process multiple restaurant websites in parallel.
    URLs are loaded from WEBSITES_FILE (default: websites.txt).

    Example usage:
        Create websites.txt with one URL per line:
        https://www.restaurant1.com
        https://www.restaurant2.com
        # This is a comment
        https://www.restaurant3.com
    """
    websites = load_websites_from_file()
    if not websites:
        logger.error("No websites to process")
        return

    logger.info(f"Starting batch processing of {len(websites)} websites")

    # Process all restaurants sequentially (sync version)
    results = []
    for idx, url in enumerate(websites, start=1):
        result = process_restaurant(url, agent_id=idx)
        results.append(result)

    # Summary
    successful = sum(1 for r in results if r["status"] == "success")
    failed = len(results) - successful
    logger.info(f"\n{'='*60}")
    logger.info(f"Batch processing complete!")
    logger.info(f"Total: {len(results)} | Success: {successful} | Failed: {failed}")
    logger.info(f"{'='*60}\n")


if __name__ == "__main__":
    import sys

    # Simple CLI argument handling
    if len(sys.argv) > 1 and sys.argv[1] == "--batch":
        batch_process()
    else:
        main()
