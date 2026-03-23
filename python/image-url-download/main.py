# Stagehand + Browserbase: Image URL Download - See README.md for full documentation
#
# Uses Stagehand extract() to find all image URLs on a page, then downloads each
# image using Playwright's context.request — which makes requests through the browser
# context, inheriting the Browserbase proxy and session cookies so images behind
# authentication or same-origin restrictions (e.g. Next.js image URLs) download correctly.

import asyncio
import os
import re
import sys
import time
from urllib.parse import urlparse

from dotenv import load_dotenv
from playwright.async_api import async_playwright
from stagehand import AsyncStagehand

# Load environment variables from .env file
load_dotenv()

# ============= CONFIGURATION =============

# Maximum number of images to download per run.
# Increase this if you need more images, or set MAX_IMAGES in your .env.
MAX_IMAGES = int(os.environ.get("MAX_IMAGES", "10"))

# Directory where images are saved, organized by site hostname.
OUTPUT_DIR = "./images"

# Maps MIME types to file extensions for the most common image formats.
MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
}

# =========================================

# JSON schema passed to extract(). Using "format": "uri" on items mirrors the TypeScript
# z.string().url() constraint, which signals to the model to look for actual URL strings
# rather than generic text. Without this hint, Gemini tends to return an empty list.
IMAGE_URL_SCHEMA = {
    "type": "object",
    "properties": {
        "urls": {
            "type": "array",
            "description": "List of absolute image URLs found on the page",
            "items": {"type": "string", "format": "uri"},
        }
    },
    "required": ["urls"],
}


def is_valid_url(u: str) -> bool:
    """Return True only for absolute http/https URLs — filters out empty strings and data URIs."""
    try:
        parsed = urlparse(u)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def image_filename(url: str, mime_type: str, index: int) -> str:
    """
    Derive a safe filename from an image URL and its detected MIME type.
    Takes the last path segment for the base name, uses the MIME type for the
    extension (more reliable than trusting the URL), and appends a timestamp
    so repeated runs never overwrite earlier downloads.
    """
    ext = MIME_TO_EXT.get(mime_type, "bin")
    try:
        path = urlparse(url).path
        segments = [p for p in path.split("/") if p]
        segment = segments[-1] if segments else ""
        # Strip any existing extension — we'll use the one from the actual MIME type.
        base = re.sub(r"\.[^.]+$", "", segment) or f"image-{index}"
        # Sanitize to filesystem-safe characters.
        safe = re.sub(r"[^a-zA-Z0-9_-]", "_", base)[:80]
        return f"{safe}-{int(time.time() * 1000)}.{ext}"
    except Exception:
        return f"image-{index}-{int(time.time() * 1000)}.{ext}"


async def main():
    if len(sys.argv) < 2:
        print("Usage: uv run main.py <url>")
        print("Example: uv run main.py https://www.browserbase.com")
        sys.exit(1)

    target_url = sys.argv[1]
    print(f"Image URL Download — target: {target_url}")
    print(f"Max images: {MAX_IMAGES} | Output: {OUTPUT_DIR}/<hostname>/\n")

    # Validate required environment variables before starting the session so missing
    # credentials produce a clear error rather than a cryptic WebSocket failure.
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    project_id = os.environ.get("BROWSERBASE_PROJECT_ID")
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    missing = [
        name
        for name, val in [
            ("BROWSERBASE_API_KEY", api_key),
            ("BROWSERBASE_PROJECT_ID", project_id),
            ("GOOGLE_API_KEY", google_api_key),
        ]
        if not val
    ]
    if missing:
        print(f"Error: missing required environment variable(s): {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your credentials.")
        sys.exit(1)

    # Initialize AsyncStagehand with Browserbase for cloud-based browser automation.
    client = AsyncStagehand(
        browserbase_api_key=api_key,
        browserbase_project_id=project_id,
        model_api_key=google_api_key,
    )

    # Start a new browser session.
    start_response = await client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id
    print("Stagehand initialized successfully!")
    print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

    try:
        # Connect to the browser session via Playwright CDP.
        # Playwright is used for two reasons in this template — see README for more detail:
        # 1. Navigation — page.goto() with wait_until="networkidle" ensures the page is
        #    fully rendered before extract() runs. The Python Stagehand SDK's
        #    sessions.navigate() is non-blocking and returns before JS finishes, so
        #    extract() would see an incomplete DOM without this wait.
        # 2. Downloads — context.request.get() sends requests through the browser context,
        #    inheriting its proxy and cookies. This handles auth-gated images and
        #    same-origin-only URLs (e.g. Next.js /_next/image) that a plain httpx call
        #    would fail on with a 403.
        async with async_playwright() as playwright:
            browser = await playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com"
                f"?apiKey={os.environ.get('BROWSERBASE_API_KEY')}"
                f"&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else await context.new_page()

            # Navigate and wait until network activity settles so all images are in the DOM.
            print(f"\nNavigating to {target_url}...")
            await page.goto(target_url, wait_until="networkidle", timeout=60000)

            # Use Stagehand extract() to find all image URLs on the page.
            # Because Playwright and Stagehand share the same browser session,
            # extract() reads from the fully-rendered page we just navigated to.
            print("Extracting image URLs from page...")
            extract_response = await client.sessions.extract(
                id=session_id,
                instruction=(
                    "Extract all image URLs on this page, including src attributes "
                    "from <img> tags and any background image URLs."
                ),
                schema=IMAGE_URL_SCHEMA,
            )

            all_urls = extract_response.data.result.get("urls", [])

            # Deduplicate and filter out empty strings, relative paths, and data URIs.
            seen: set[str] = set()
            unique_urls = []
            for u in all_urls:
                if u and u not in seen and is_valid_url(u):
                    seen.add(u)
                    unique_urls.append(u)

            print(f"Found {len(unique_urls)} unique image URL(s)")

            urls = unique_urls[:MAX_IMAGES]
            if len(unique_urls) > MAX_IMAGES:
                print(f"Capping at {MAX_IMAGES} (adjust MAX_IMAGES to change this)")

            if not urls:
                print("No image URLs found on the page.")
                await browser.close()
                return

            # Create a subdirectory per hostname (e.g. images/browserbase.com/) so runs
            # against different sites never mix.
            hostname = urlparse(target_url).hostname or "unknown"
            output_dir = os.path.join(OUTPUT_DIR, hostname)
            os.makedirs(output_dir, exist_ok=True)

            saved = 0
            failed = 0

            print(f"\nDownloading {len(urls)} image(s) via browser context...\n")

            for i, url in enumerate(urls):
                print(f"[{i + 1}/{len(urls)}] {url} → ", end="", flush=True)

                # Download using Playwright's context.request, which makes HTTP requests
                # through the browser context — inheriting its cookies and proxy settings.
                # This is simpler and more reliable than page.evaluate(fetch(...)), and
                # handles auth-gated or same-origin-only images (e.g. Next.js image URLs)
                # the same way the TypeScript version's in-browser fetch does.
                try:
                    response = await context.request.get(url)
                    if not response.ok:
                        print(f"FAILED (HTTP {response.status}, skipping)")
                        failed += 1
                        continue
                    image_bytes = await response.body()
                    mime_type = response.headers.get("content-type", "").split(";")[0].strip()
                except Exception as e:
                    print(f"FAILED ({e}, skipping)")
                    failed += 1
                    continue

                try:
                    filename = image_filename(url, mime_type, i)
                    filepath = os.path.join(output_dir, filename)
                    with open(filepath, "wb") as f:
                        f.write(image_bytes)
                except Exception as e:
                    print(f"FAILED (write error: {e}, skipping)")
                    failed += 1
                    continue
                print(f"saved as {filename} ({len(image_bytes)} bytes)")
                saved += 1

            await browser.close()

        print(f"\nDone! {saved} saved, {failed} failed → {output_dir}/")

    except Exception as error:
        print(f"Error during image download: {error}")
        raise

    finally:
        # Always close the session to release resources and clean up.
        await client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Ensure GOOGLE_API_KEY is set for the gemini-2.5-flash model")
        print("  - Verify the target URL is accessible")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        sys.exit(1)
