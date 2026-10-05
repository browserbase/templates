# Stagehand + Browserbase: Restaurant Menu Extractor - Configuration
# See README.md for full documentation

"""Configuration and environment variables for the restaurant scraper."""

import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
MODEL_API_KEY = os.getenv("MODEL_API_KEY")  # API key for LLM provider (e.g., Google Gemini)
BROWSERBASE_API_KEY = os.getenv("BROWSERBASE_API_KEY")
BROWSERBASE_PROJECT_ID = os.getenv("BROWSERBASE_PROJECT_ID")

# Validate required environment variables
if not MODEL_API_KEY:
    raise ValueError("MODEL_API_KEY environment variable is required. For Google Gemini, get one at https://aistudio.google.com/apikey")
if not BROWSERBASE_API_KEY:
    raise ValueError("BROWSERBASE_API_KEY environment variable is required. Get one at https://www.browserbase.com/settings")
if not BROWSERBASE_PROJECT_ID:
    raise ValueError("BROWSERBASE_PROJECT_ID environment variable is required. Get one at https://www.browserbase.com/settings")

# File paths
WEBSITES_FILE = os.getenv("WEBSITES_FILE", "websites.txt")
OUTPUT_DIR = "results"

# Scraper settings
NO_MENU_LINK_FOUND = "NO_MENU_LINK_FOUND"
MAX_RETRIES = 3

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
