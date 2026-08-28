# Stagehand + Browserbase: Restaurant Menu Extractor - Utilities
# See README.md for full documentation

"""Utility functions for the restaurant scraper."""

import json
import time
import re
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
from config import WEBSITES_FILE, OUTPUT_DIR, logger


def normalize_url(url: str) -> str:
    """
    Normalize URL to ensure it has a protocol.

    Args:
        url: The URL to normalize

    Returns:
        Normalized URL with https:// prefix
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def load_websites_from_file(file_path: str = WEBSITES_FILE) -> List[str]:
    """
    Load website URLs from a text file.
    Lines starting with # are treated as comments and ignored.

    Args:
        file_path: Path to the file containing URLs

    Returns:
        List of normalized URLs
    """
    websites = []
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    websites.append(normalize_url(line))
        logger.info(f"Loaded {len(websites)} websites from {file_path}")
        return websites
    except FileNotFoundError:
        logger.error(f"File not found: {file_path}")
        return []


def get_website_from_user() -> str:
    """
    Prompt the user to enter a restaurant website URL.

    Returns:
        The URL entered by the user
    """
    return input("Enter restaurant website URL: ").strip()


def save_menu_to_json(
    website_url: str,
    all_menu_sections: List[Dict[str, Any]],
    agent_id: int = None,
    duration_seconds: float = None
) -> str:
    """
    Save combined menu data to a beautifully formatted JSON file.

    Args:
        website_url: The restaurant website URL
        all_menu_sections: Combined list of all menu sections
        agent_id: Optional agent ID for batch processing
        duration_seconds: Optional duration of extraction

    Returns:
        Path to the saved JSON file
    """
    # Create results directory if it doesn't exist
    Path(OUTPUT_DIR).mkdir(exist_ok=True)

    # Generate safe filename from URL and timestamp
    parsed_url = urlparse(website_url)
    safe_name = re.sub(r'[^\w\-]', '_', parsed_url.netloc or parsed_url.path)
    timestamp = int(time.time())
    filename = f"{OUTPUT_DIR}/{safe_name}_{timestamp}.json"

    # Create combined output
    output_data = {
        "restaurant_url": website_url,
        "extracted_at": timestamp,
        "extracted_at_readable": datetime.fromtimestamp(timestamp).isoformat(),
        "menu": {
            "sections": all_menu_sections
        }
    }

    # Add optional fields
    if agent_id is not None:
        output_data["agent_id"] = agent_id
    if duration_seconds is not None:
        output_data["duration_seconds"] = duration_seconds

    # Write beautifully formatted JSON
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    logger.info(f"✓ Menu saved to: {filename}")
    logger.info(f"✓ Total sections extracted: {len(all_menu_sections)}")

    return filename
