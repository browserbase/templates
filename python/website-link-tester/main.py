# Stagehand + Browserbase: Website Link Tester - See README.md for full documentation

import json
import os

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field, HttpUrl

from stagehand import Stagehand

# Load environment variables
load_dotenv()


# Base URL whose links we want to crawl and verify
URL = "https://www.browserbase.com"

# Maximum number of links to verify concurrently.
# Default: 1 (sequential processing - works on all plans)
# Set to > 1 for more concurrent link verification (requires Startup or Developer plan or higher).
# For more advanced concurrency control (rate limiting, prioritization, per-domain caps),
# you can also wrap link verification in a Semaphore or similar concurrency primitive.
MAX_CONCURRENT_LINKS = 1


class ExtractedLink(BaseModel):
    """Single hyperlink extracted from the page"""

    url: HttpUrl = Field(..., description="Destination URL of the link")
    link_text: str = Field(..., description="Visible text of the link")


class ExtractedLinks(BaseModel):
    """Collection of extracted links"""

    links: list[ExtractedLink]


class LinkVerificationResult(BaseModel):
    """Result of verifying a single link"""

    link_text: str
    url: HttpUrl
    success: bool
    page_title: str | None = None
    content_matches: bool | None = None
    assessment: str | None = None
    error: str | None = None


class PageVerificationSummary(BaseModel):
    """Structured summary returned from content verification extract()"""

    page_title: str
    content_matches: bool
    assessment: str


# Domains that are treated as social links; we only check that they load,
# and skip content verification because they often require auth/consent flows.
SOCIAL_DOMAINS = [
    "twitter.com",
    "x.com",
    "facebook.com",
    "linkedin.com",
    "instagram.com",
    "youtube.com",
    "tiktok.com",
    "reddit.com",
    "discord.com",
]


def deduplicate_links(extracted_links: dict) -> list[dict]:
    """
    Removes duplicate links by URL while preserving the first occurrence.
    """
    seen_urls: set[str] = set()
    unique_links: list[dict] = []

    for link in extracted_links.get("links", []):
        url = str(link.get("url", ""))
        if url in seen_urls:
            continue
        seen_urls.add(url)
        unique_links.append(link)

    return unique_links


def collect_links_from_homepage() -> list[dict]:
    """
    Opens the homepage and uses Stagehand `extract()` to collect all links.
    Returns a de-duplicated list of link objects that we will later verify.
    """
    print("Collecting links from homepage...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="google/gemini-2.5-pro",
    )
    session_id = start_response.data.session_id

    try:
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to the base URL where we will harvest links
            print(f"Navigating to {URL}...")
            page.goto(URL, wait_until="domcontentloaded")

            print(f"Successfully loaded {URL}. Extracting links...")

            # Inline schema to avoid $ref issues
            links_schema = {
                "type": "object",
                "properties": {
                    "links": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "url": {
                                    "type": "string",
                                    "description": "Destination URL of the link",
                                },
                                "link_text": {
                                    "type": "string",
                                    "description": "Visible text of the link",
                                },
                            },
                            "required": ["url", "link_text"],
                        },
                    }
                },
                "required": ["links"],
            }
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="Extract all links on the page with their link text.",
                schema=links_schema,
            )
            extracted_links = extract_response.data.result

            # Remove duplicate URLs and log both raw and unique counts for visibility
            unique_links = deduplicate_links(extracted_links)

            print(
                f"All links on the page ({len(extracted_links.get('links', []))} total, {len(unique_links)} unique):"
            )
            print(json.dumps({"links": unique_links}, indent=2))

            browser.close()

        client.sessions.end(id=session_id)
        return unique_links

    except Exception as error:
        print(f"Error while collecting links: {error}")
        client.sessions.end(id=session_id)
        raise


def verify_single_link(link: dict) -> LinkVerificationResult:
    """
    Verifies a single link by opening it in a dedicated browser session.
    - Confirms the page loads successfully.
    - For non-social links, uses `extract()` to check that the page content
      matches what the link text suggests.
    """
    link_text = link.get("link_text", "Unknown")
    link_url = link.get("url", "")

    print(f"\nChecking: {link_text} ({link_url})")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="google/gemini-2.5-pro",
    )
    session_id = start_response.data.session_id

    try:
        print(f"[{link_text}] Live View: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Detect if this is a social link (we treat those differently)
            is_social_link = any(domain in str(link_url) for domain in SOCIAL_DOMAINS)

            page.goto(str(link_url), wait_until="domcontentloaded", timeout=30000)

            current_url = page.url

            # Guard against pages that never load or redirect to an invalid URL
            if not current_url or current_url == "about:blank":
                raise Exception("Page failed to load - invalid URL detected")

            print(f"Link opened successfully: {link_text}")

            # For social links, we consider a successful load good enough
            if is_social_link:
                print(f"[{link_text}] Social media link - skipping content verification")
                browser.close()
                client.sessions.end(id=session_id)
                return LinkVerificationResult(
                    link_text=link_text,
                    url=link_url,
                    success=True,
                    page_title="Social Media Link",
                    content_matches=True,
                    assessment="Social media link loaded successfully (content verification skipped)",
                )

            # Ask the model to read the page and decide whether it matches the link text
            print(f"[{link_text}] Verifying page content against link text...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction=f'Does the page content match what the link text "{link_text}" suggests? Extract the page title and provide a brief assessment (maximum 8 words).',
                schema=PageVerificationSummary.model_json_schema(),
            )
            verification = extract_response.data.result

            print(f"[{link_text}] Page Title: {verification.get('page_title')}")
            print(
                f"[{link_text}] Content Matches: {'YES' if verification.get('content_matches') else 'NO'}"
            )
            print(f"[{link_text}] Assessment: {verification.get('assessment')}")

            browser.close()

        client.sessions.end(id=session_id)

        return LinkVerificationResult(
            link_text=link_text,
            url=link_url,
            success=True,
            page_title=verification.get("page_title"),
            content_matches=verification.get("content_matches"),
            assessment=verification.get("assessment"),
        )

    except Exception as error:
        error_message = str(error)

        print(f'Failed to verify link "{link_text}": {error_message}')

        client.sessions.end(id=session_id)

        # On failure, return a structured result capturing the error message
        return LinkVerificationResult(
            link_text=link_text,
            url=link_url,
            success=False,
            error=error_message,
        )


def verify_links_in_batches(
    links: list[dict],
) -> list[LinkVerificationResult]:
    """
    Verifies all links sequentially.
    Returns a list of LinkVerificationResult objects for all processed links.
    """
    max_concurrent = max(1, MAX_CONCURRENT_LINKS)
    print(f"\nVerifying links (batch size: {max_concurrent})...")

    results: list[LinkVerificationResult] = []

    for i in range(0, len(links), max_concurrent):
        batch = links[i : i + max_concurrent]
        batch_number = i // max_concurrent + 1
        total_batches = (len(links) + max_concurrent - 1) // max_concurrent

        print(f"\n=== Processing batch {batch_number}/{total_batches} ({len(batch)} links) ===")

        # Process links sequentially
        for link in batch:
            result = verify_single_link(link)
            results.append(result)

        print(f"\nBatch {batch_number}/{total_batches} complete ({len(results)} total verified)")

    return results


def output_results(results: list[LinkVerificationResult], label: str = "FINAL RESULTS") -> None:
    """
    Logs a JSON summary of all link verification results.
    Falls back to a brief textual summary if JSON serialization fails.
    """
    print("\n" + "=" * 80)
    print(label)
    print("=" * 80)

    final_report = {
        "total_links": len(results),
        "successful": len([r for r in results if r.success]),
        "failed": len([r for r in results if not r.success]),
        "results": [r.model_dump(mode="json") for r in results],
    }

    try:
        print(json.dumps(final_report, indent=2))
    except Exception as stringify_error:
        print(f"Error serializing results: {stringify_error}")
        print("Summary only:")
        print(f"Total: {final_report['total_links']}")
        print(f"Successful: {final_report['successful']}")
        print(f"Failed: {final_report['failed']}")

    print("\n" + "=" * 80)


def main():
    """
    Orchestrates the full flow:
    1. Collect all links from the homepage.
    2. Verify them in batches.
    3. Print a final JSON report (or partial results if an error occurs).
    """
    print("Starting Website Link Tester (Python)...")

    results: list[LinkVerificationResult] = []

    try:
        links = collect_links_from_homepage()
        print(f"Collected {len(links)} links, starting verification...")

        results = verify_links_in_batches(links)

        print("\nAll links verified!")
        print(f"Results array length: {len(results)}")

        output_results(results)

        print("Script completed successfully")
    except Exception as error:
        print("\nError occurred during execution:", error)

        if results:
            print(f"\nOutputting partial results ({len(results)} links processed before error):")
            output_results(results, "PARTIAL RESULTS (Error Occurred)")
        else:
            print("No results to output - error occurred before any links were verified")

        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print("Application error:", err)
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set")
        print("  - Ensure URL is reachable from Browserbase regions")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        raise SystemExit(1)
