# VibeCheck - Stagehand-Powered Vibe Search on Google Maps

import sys
import os
import json
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

# ============= CLI PARSING =============

vibe = sys.argv[1] if len(sys.argv) > 1 else None
location = sys.argv[2] if len(sys.argv) > 2 else "San Francisco"
venue_type = sys.argv[3] if len(sys.argv) > 3 else None

if not vibe:
    print('Usage: python main.py "<vibe>" "[location]" "[venue type]"')
    print('Example: python main.py "sunset vibes" "San Francisco" "rooftop bar"')
    print("\nLocation defaults to San Francisco if not provided.")
    print("Venue type is fully optional (e.g., bar, restaurant, cafe, club, etc.)")
    sys.exit(1)

# ============= PYDANTIC MODELS =============


class Venue(BaseModel):
    name: str = Field(description="venue name")
    address: str = Field(description="full address")
    description: str = Field(description="venue description")
    star_rating: str = Field(description="Google Maps star rating (e.g., '4.5')")
    reviews: str = Field(description="Available individual reviews for the venue")


class VenuesData(BaseModel):
    venues: list[Venue] = Field(description="list of venues from search results")


class VibeScore(BaseModel):
    vibe_score: int
    name: str
    address: str
    star_rating: str
    review_summary: str


# ============= MAIN =============


async def main() -> None:
    # ============= ASCII ART =============

    print("\n")
    print("\x1b[33m██╗░░░██╗██╗██████╗░███████╗")
    print("██║░░░██║██║██╔══██╗██╔════╝")
    print("╚██╗░██╔╝██║██████╦╝█████╗░░")
    print("░╚████╔╝░██║██╔══██╗██╔══╝░░")
    print("░░╚██╔╝░░██║██████╦╝███████╗")
    print("░░░╚═╝░░░╚═╝╚═════╝░╚══════╝\x1b[0m")
    print("\n   > Vibe........: " + vibe)
    print("   > Location....: " + location)
    if venue_type:
        print("   > Venue Type..: " + venue_type)
    print()

    # ============= INITIALIZE STAGEHAND =============

    print("\n🅱️  Initializing Stagehand...\n")
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ["BROWSERBASE_API_KEY"],
        project_id=os.environ["BROWSERBASE_PROJECT_ID"],
        model_name="openai/gpt-4.1",
        model_api_key=os.environ["OPENAI_API_KEY"],
        disable_api=True,
        browserbase_session_create_params={
            "project_id": os.environ["BROWSERBASE_PROJECT_ID"],
            "browser_settings": {
                # Viewport optimized for AI models
                "viewport": {
                    "width": 1288,
                    "height": 711,
                },
            },
        },
    )

    stagehand = Stagehand(config)
    await stagehand.init()

    print("\n🅱️  Browser initialized...\n")

    # Get session URL for debugging
    session_id = stagehand.session_id
    if session_id:
        live_view_url = f"https://www.browserbase.com/sessions/{session_id}"
        print(f"\n🅱️  Live View: {live_view_url}\n")

    # ============= STAGEHAND: OBSERVE - ACT - EXTRACT =============

    # Get a page
    page = stagehand.page

    # Navigate to Google Maps
    print("\n🅱️  Navigating to Google Maps...\n")
    await page.goto("https://www.google.com/maps")

    # Build search query
    search_query = (
        f"{vibe} {venue_type + 's' if venue_type else 'venues'} in {location}"
    )
    print(f"\n🅱️  Searching for: {search_query}\n")

    # Search for venues - be very explicit and break down actions atomically
    await page.act("click on the search box")
    await page.act(f'type "{search_query}" into the search box')
    await page.act("press Enter or click the search button")
    await page.observe("make sure we can see the map search results")

    print("\n🅱️  Extracting venue data...\n")

    # Extract venues with vibe scoring (note: extraction uses a11y tree, text only - no images)
    venues_data = await page.extract(
        "Extract all the venues you can from the search results.", schema=VenuesData
    )

    print("\n🅱️  Venue data extracted:\n")
    print(json.dumps(venues_data.model_dump(), indent=2))

    # ============= STAGEHAND AGENT =============

    print("\n🅱️  Using agent to score venues...\n")
    agent = stagehand.agent(
        provider="google",
        model="gemini-2.5-computer-use-preview-10-2025",
        options={
            "api_key": os.getenv("GEMINI_API_KEY"),
        },
    )

    venue_type_filter = (
        f"- Category/venue type (should be a {venue_type})" if venue_type else ""
    )

    scoring_instruction = f"""
For each venue, determine a vibe score of how well it matches the vibe "{vibe}" of either 1, 2, 3, 4, or 5.
Take into account:
- Venue name (does the name suggest this vibe?)
{venue_type_filter}
- Description text (does it mention relevant atmosphere or theme?)
- Review snippets (any keywords about ambiance/mood that fit the vibe?)
- Star rating (higher rated venues are better)
- Keywords (look for vibe-related words in any visible text)

Be generous with scoring. Do not search again. Use the data provided.

Data:
{json.dumps(venues_data.model_dump(), indent=2)}

Output as a JSON array, where each item has:
- vibe_score (number)
- name (string)
- address (string)
- star_rating (string)
- review_summary (string)

// Example:
[
  {{
    "vibe_score": 5,
    "name": "Awesome Venue",
    "address": "123 Sunset Blvd, San Francisco, CA",
    "star_rating": "4.6",
    "review_summary": "Beautiful views and great music."
  }},
  ...
]
"""

    result = await agent.execute(instruction=scoring_instruction, max_steps=30)

    print("\n🅱️  Closing browser...\n")
    await stagehand.close()

    # ============= PROCESS OUTPUT =============

    # Extract JSON from the agent's response
    output = result.message.strip()

    # Find JSON between ```json and ``` markers
    if "```json" in output:
        start = output.find("```json") + 7
        end = output.find("```", start)
        output = output[start:end].strip()
    # Or just find the JSON array
    elif "[" in output and "]" in output:
        start = output.find("[")
        end = output.rfind("]") + 1
        output = output[start:end]

    vibe_scores_data = json.loads(output)

    # Convert to VibeScore objects
    vibe_scores = [VibeScore(**item) for item in vibe_scores_data]

    print("\n🅱️  Vibe scores:\n")
    print(json.dumps([v.model_dump() for v in vibe_scores], indent=2))

    # Sort by vibe score and take top 3
    top_venues = sorted(vibe_scores, key=lambda x: x.vibe_score, reverse=True)[:3]

    # ============= DISPLAY RESULTS =============

    if top_venues and len(top_venues) > 0:
        print("\n")
        print("    ╦  ╦╦╔╗ ╔═╗")
        print("    ╚╗╔╝║╠╩╗║╣")
        print("     ╚╝ ╩╚═╝╚═╝")
        print("    ══════════════════════")
        print(f"    >> {len(venues_data.venues)} VIBES ANALYZED")
        print(f"    >> TOP 3 VIBES FOUND")
        print(f"    >> FOR VIBE: {vibe} in {location}")
        print()

        rank_labels = ["◆◆◆ PRIME VIBE", "◆◆ GOOD VIBE", "◆ VIBES"]

        for index, venue in enumerate(top_venues):
            rank = index + 1

            print(f"\n    ┌─ [{rank}] {rank_labels[index]}")
            print(f"    │")
            print(f"    │  \x1b[1m\x1b[36m{venue.name}\x1b[0m")
            print(f"    │  {venue.address}")
            print(f"    │")

            # Visual bars
            vibe_blocks = "▓" * round(venue.vibe_score * 2) + "░" * (
                10 - round(venue.vibe_score * 2)
            )
            rating_num = (
                float(venue.star_rating)
                if venue.star_rating and venue.star_rating.strip() not in ["", "null"]
                else 0
            )
            rating_blocks = "▓" * round(rating_num * 2) + "░" * (
                10 - round(rating_num * 2)
            )
            display_rating = "n/a" if rating_num == 0 else rating_num

            print(f"    │  VIBE···· [{vibe_blocks}] {venue.vibe_score}")
            print(f"    │  RATING·· [{rating_blocks}] {display_rating}")
            print(f"    │")
            print(f'    │  "{venue.review_summary}"')
            print(f"    └─")

        print("\n    ※ Quick vibe check only - please vibe responsibly ※\n")
        print("    █ THANKS FOR VIBING! █")
    else:
        print("\n")
        print("    ╦  ╦╦╔╗ ╔═╗")
        print("    ╚╗╔╝║╠╩╗║╣")
        print("     ╚╝ ╩╚═╝╚═╝")
        print("    ══════════════════════")
        print("\n  ╔══════════════════════")
        print("    ║   NO VIBES FOUND      ║")
        print("    ║   TRY DIFFERENT VIBE  ║")
        print("    ╚══════════════════════\n")


# ============= ERROR HANDLING =============

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"\n🅱️  Error: {err}")
        sys.exit(1)
