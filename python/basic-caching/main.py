# Stagehand + Browserbase: Basic Caching - See README.md for full documentation

import asyncio
import json
import os
from pathlib import Path
from typing import Any

import aiofiles
from dotenv import load_dotenv

from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

# Cache file location - stores observed actions for reuse
CACHE_FILE = Path(__file__).parent / "cache.json"


async def get_cache(key: str) -> dict[str, Any] | None:
    """Get the cached value (None if it doesn't exist)"""
    try:
        # Read cache file asynchronously for better performance
        async with aiofiles.open(CACHE_FILE) as f:
            cache_content = await f.read()
            parsed = json.loads(cache_content)
            return parsed.get(key)
    except (FileNotFoundError, json.JSONDecodeError):
        # Cache file doesn't exist or is invalid - return None
        return None


async def set_cache(key: str, value: Any) -> None:
    """Set the cache value - converts ObserveResult (Pydantic model) to dict if needed"""
    try:
        # Read existing cache file to preserve other cached entries
        async with aiofiles.open(CACHE_FILE) as f:
            cache_content = await f.read()
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
    async with aiofiles.open(CACHE_FILE, "w") as f:
        await f.write(json.dumps(parsed, indent=2, default=str))


async def act_with_cache(page, key: str, prompt: str, self_heal: bool = False):
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
        cache_exists = await get_cache(key)

        if cache_exists:
            # Use the already-retrieved cached action - no LLM inference needed
            action = cache_exists
            print(f"  ✓ Cache hit for: {prompt}")
        else:
            # Get the observe result (the action) - this requires LLM inference
            print(f"  → Observing: {prompt}")
            actions = await page.observe(prompt)
            action = actions[0]

            # Cache the action for future use
            await set_cache(key, action)
            print(f"  ✓ Cached action for: {prompt}")

        # Run the action (no LLM inference when using cached action)
        await page.act(action)
    except Exception as e:
        print(f"  ✗ Error: {e}")
        # In self_heal mode, retry the action with a fresh LLM call
        if self_heal:
            print("  → Attempting to self-heal...")
            await page.act(prompt)
        else:
            raise e


async def run_without_cache():
    """Run workflow without caching (baseline) - demonstrates normal LLM usage"""
    print("RUN 1: WITHOUT CACHING")

    start_time = asyncio.get_event_loop().time()

    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    # Note: set verbose: 0 to prevent API keys from appearing in logs when handling sensitive data.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.getenv("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.getenv("GOOGLE_API_KEY"),
        verbose=0,  # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
        browserbase_session_create_params={
            "project_id": os.getenv("BROWSERBASE_PROJECT_ID"),
        },
    )

    # Use async context manager for automatic resource management
    async with Stagehand(config) as stagehand:
        page = stagehand.page

        try:
            # Navigate to Stripe checkout demo page
            print("Navigating to Stripe checkout...")
            await page.goto("https://checkout.stripe.dev/preview", wait_until="domcontentloaded")

            # Each act() call requires LLM inference - no caching enabled
            await page.act("Click on the View Demo button")
            await page.act("Type 'test@example.com' into the email field")
            await page.act("Type '4242424242424242' into the card number field")
            await page.act("Type '12/34' into the expiration date field")

            elapsed = f"{(asyncio.get_event_loop().time() - start_time):.2f}"

            print(f"Total time: {elapsed}s")
            print("Cost: ~$0.01-0.05 (4 LLM calls)")
            print("API calls: 4 (one per action)\n")

            return {"elapsed": elapsed, "llm_calls": 4}
        except Exception as error:
            print(f"Error: {error}")
            raise


async def run_with_cache():
    """Run workflow with caching enabled - demonstrates cost and latency savings"""
    print("RUN 2: WITH CACHING\n")

    start_time = asyncio.get_event_loop().time()

    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.getenv("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.getenv("GOOGLE_API_KEY"),
        verbose=0,  # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
        browserbase_session_create_params={
            "project_id": os.getenv("BROWSERBASE_PROJECT_ID"),
        },
    )

    # Use async context manager for automatic resource management
    async with Stagehand(config) as stagehand:
        page = stagehand.page

        try:
            # Navigate to Stripe checkout demo page
            print("Navigating to Stripe checkout...")
            await page.goto("https://checkout.stripe.dev/preview", wait_until="domcontentloaded")

            # Use cached actions - first run will observe and cache, subsequent runs use cache
            await act_with_cache(
                page, "Click on the View Demo button", "Click on the View Demo button"
            )
            await act_with_cache(
                page,
                "Type 'test@example.com' into the email field",
                "Type 'test@example.com' into the email field",
            )
            await act_with_cache(
                page,
                "Type '4242424242424242' into the card number field",
                "Type '4242424242424242' into the card number field",
            )
            await act_with_cache(
                page,
                "Type '12/34' into the expiration date field",
                "Type '12/34' into the expiration date field",
            )

            elapsed = f"{(asyncio.get_event_loop().time() - start_time):.2f}"
            cache_exists = CACHE_FILE.exists()

            # Count cache entries to determine if this was a cache hit or miss
            if cache_exists:
                async with aiofiles.open(CACHE_FILE) as f:
                    cache_content = await f.read()
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

            return {"elapsed": elapsed, "llm_calls": 0 if cache_count >= 4 else 4}
        except Exception as error:
            print(f"Error: {error}")
            raise


async def main():
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
        async with aiofiles.open(CACHE_FILE) as f:
            cache_content = await f.read()
            cache_data = json.loads(cache_content)
            cache_count = len(cache_data)
        print(f"📂 Cache found: {cache_count} entries")
        print("   This is a SUBSEQUENT run - cache will be used!\n")
    else:
        print("No cache found - first run will populate cache")

    print("\nRunning comparison: without cache vs with cache...\n")

    # Run both workflows for comparison
    without_cache = await run_without_cache()
    with_cache = await run_with_cache()

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
        asyncio.run(main())
    except Exception as err:
        print(f"Error in caching demo: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set for the model")
        print("Docs: https://docs.stagehand.dev/v2/first-steps/introduction")
        exit(1)
