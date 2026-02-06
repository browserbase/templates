# Stagehand + Browserbase: Basic Caching - See README.md for full documentation

import json
import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# Cache file location - stores observed actions for reuse
CACHE_FILE = Path(__file__).parent / "cache.json"


def get_cache(key: str) -> dict[str, Any] | None:
    """Get the cached value (None if it doesn't exist)"""
    try:
        with open(CACHE_FILE) as f:
            cache_content = f.read()
            parsed = json.loads(cache_content)
            return parsed.get(key)
    except (FileNotFoundError, json.JSONDecodeError):
        # Cache file doesn't exist or is invalid - return None
        return None


def set_cache(key: str, value: Any) -> None:
    """Set the cache value - converts ObserveResult (Pydantic model) to dict if needed"""
    try:
        # Read existing cache file to preserve other cached entries
        with open(CACHE_FILE) as f:
            cache_content = f.read()
            parsed = json.loads(cache_content)
    except (FileNotFoundError, json.JSONDecodeError):
        # Cache file doesn't exist - start with empty dict
        parsed = {}

    # Convert ObserveResult (Pydantic BaseModel) to dict for JSON serialization
    # Supports both Pydantic v1 and v2 for compatibility
    if hasattr(value, "model_dump"):
        # Pydantic v2
        parsed[key] = value.model_dump()
    elif hasattr(value, "dict"):
        # Pydantic v1
        parsed[key] = value.dict()
    elif isinstance(value, dict):
        parsed[key] = value
    else:
        # Fallback: try to convert to dict
        parsed[key] = dict(value) if hasattr(value, "__dict__") else value

    # Write updated cache back to file
    with open(CACHE_FILE, "w") as f:
        f.write(json.dumps(parsed, indent=2, default=str))


def act_with_cache(client, session_id: str, key: str, prompt: str, self_heal: bool = False):
    """
    Check the cache, get the action, and run it.
    If self_heal is true, we'll attempt to self-heal if the action fails.

    This function demonstrates manual caching by:
    1. Checking if action is cached (no LLM call)
    2. If not cached, observing the page to generate action (LLM call)
    3. Caching the observed action for future use
    4. Executing the action
    """
    try:
        # Check if action is already cached
        cache_exists = get_cache(key)

        if cache_exists:
            # Use the already-retrieved cached action - no LLM inference needed
            action = cache_exists
            print(f"  ✓ Cache hit for: {prompt}")
        else:
            # Get the observe result (the action) - this requires LLM inference
            print(f"  → Observing: {prompt}")
            observe_response = client.sessions.observe(
                id=session_id,
                instruction=prompt,
            )
            action = observe_response.data.results[0] if observe_response.data.results else {}
            # Cache the action for future use
            set_cache(key, action)
            print(f"  ✓ Cached action for: {prompt}")

        # Run the action (no LLM inference when using cached action)
        if isinstance(action, dict):
            client.sessions.act(id=session_id, input=action)
        else:
            client.sessions.act(id=session_id, input=prompt)
    except Exception as e:
        print(f"  ✗ Error: {e}")
        # In self_heal mode, retry the action with a fresh LLM call
        if self_heal:
            print("  → Attempting to self-heal...")
            client.sessions.act(id=session_id, input=prompt)
        else:
            raise e


def run_without_cache():
    """Run workflow without caching (baseline) - demonstrates normal LLM usage"""
    print("RUN 1: WITHOUT CACHING")

    start_time = time.time()

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.getenv("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    start_response = client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id

    try:
        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to Stripe checkout demo page
            print("Navigating to Stripe checkout...")
            page.goto("https://checkout.stripe.dev/preview", wait_until="domcontentloaded")

            # Each act() call requires LLM inference - no caching enabled
            client.sessions.act(id=session_id, input="Click on the View Demo button")
            client.sessions.act(id=session_id, input="Type 'test@example.com' into the email field")
            client.sessions.act(
                id=session_id, input="Type '4242424242424242' into the card number field"
            )
            client.sessions.act(id=session_id, input="Type '12/34' into the expiration date field")

            elapsed = f"{(time.time() - start_time):.2f}"

            print(f"Total time: {elapsed}s")
            print("Cost: ~$0.01-0.05 (4 LLM calls)")
            print("API calls: 4 (one per action)\n")

            browser.close()

        client.sessions.end(id=session_id)
        return {"elapsed": elapsed, "llm_calls": 4}

    except Exception as error:
        print(f"Error: {error}")
        client.sessions.end(id=session_id)
        raise


def run_with_cache():
    """Run workflow with caching enabled - demonstrates cost and latency savings"""
    print("RUN 2: WITH CACHING\n")

    start_time = time.time()

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.getenv("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    start_response = client.sessions.start(model_name="google/gemini-2.5-flash")
    session_id = start_response.data.session_id

    try:
        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to Stripe checkout demo page
            print("Navigating to Stripe checkout...")
            page.goto("https://checkout.stripe.dev/preview", wait_until="domcontentloaded")

            # Use cached actions - first run will observe and cache, subsequent runs use cache
            act_with_cache(
                client, session_id, "Click on the View Demo button", "Click on the View Demo button"
            )
            act_with_cache(
                client,
                session_id,
                "Type 'test@example.com' into the email field",
                "Type 'test@example.com' into the email field",
            )
            act_with_cache(
                client,
                session_id,
                "Type '4242424242424242' into the card number field",
                "Type '4242424242424242' into the card number field",
            )
            act_with_cache(
                client,
                session_id,
                "Type '12/34' into the expiration date field",
                "Type '12/34' into the expiration date field",
            )

            elapsed = f"{(time.time() - start_time):.2f}"
            cache_exists = CACHE_FILE.exists()

            # Count cache entries to determine if this was a cache hit or miss
            if cache_exists:
                with open(CACHE_FILE) as f:
                    cache_content = f.read()
                    cache_data = json.loads(cache_content)
                    cache_count = len(cache_data)
            else:
                cache_count = 0

            print(f"\nTotal time: {elapsed}s")

            # Display results based on cache status
            if cache_count >= 4:
                # Cache was used - no LLM calls made
                print("Cost: $0.00 (cache hits, no LLM calls)")
                print("API calls: 0 (all from cache)")
                print(f"Cache entries: {cache_count}")
            else:
                # First run - cache was populated
                print("💰Cost: ~$0.01-0.05 (first run, populated cache)")
                print("📡API calls: 4 (saved to cache for next run)")
                print("📂Cache created")
            print()

            browser.close()

        client.sessions.end(id=session_id)
        return {"elapsed": elapsed, "llm_calls": 0 if cache_count >= 4 else 4}

    except Exception as error:
        print(f"Error: {error}")
        client.sessions.end(id=session_id)
        raise


def main():
    """Main function demonstrating caching benefits with side-by-side comparison"""
    print("\n╔═══════════════════════════════════════════════════════════╗")
    print("║  Caching Demo - Run This Script TWICE!                     ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")

    print("This demo shows caching impact by running the same workflow twice:\n")
    print("First run:")
    print("  1. WITHOUT cache (baseline)")
    print("  2. WITH cache enabled (populates cache)\n")

    print("Second run:")
    print("  - WITH cache (instant, $0 cost)\n")

    print("Run 'python main.py' twice to see the difference!\n")

    # Check if cache exists to determine if this is first or subsequent run
    cache_exists = CACHE_FILE.exists()

    if cache_exists:
        # Read cache file to count entries
        with open(CACHE_FILE) as f:
            cache_content = f.read()
            cache_data = json.loads(cache_content)
            cache_count = len(cache_data)
        print(f"📂 Cache found: {cache_count} entries")
        print("   This is a SUBSEQUENT run - cache will be used!\n")
    else:
        print("No cache found - first run will populate cache")

    print("\nRunning comparison: without cache vs with cache...\n")

    # Run both workflows for comparison
    without_cache = run_without_cache()
    with_cache = run_with_cache()

    # Display comparison results
    print("\n=== Comparison ===")
    print(f"Without caching: {without_cache['elapsed']}s, {without_cache['llm_calls']} LLM calls")
    print(f"With caching:    {with_cache['elapsed']}s, {with_cache['llm_calls']} LLM calls")

    # Calculate and display speedup if cache was used
    if with_cache["llm_calls"] == 0:
        speedup = float(without_cache["elapsed"]) / float(with_cache["elapsed"])
        print(f"\nSpeedup: {speedup:.1f}x faster with cache")
        print("Cost savings: 100% (no LLM calls)")

    print("\nRun again to see cache benefits on subsequent runs!")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in caching demo: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set for the model")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
