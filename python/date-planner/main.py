# Stagehand + Browserbase: AI-Powered Date Planner - See README.md for full documentation

import os
import asyncio
from typing import List, Optional
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from InquirerPy import inquirer
from openai import OpenAI
from pydantic import BaseModel, Field, HttpUrl

# Load environment variables
load_dotenv()

class DatePlannerAnswers(BaseModel):
    date_preference: str
    cuisine_type: str
    location: str
    budget: str
    special_requirements: str

class Restaurant(BaseModel):
    name: str
    url: str
    rating: str
    price_range: str
    cuisine: str
    location: str
    ai_score: Optional[int] = None
    ai_reason: Optional[str] = None

class SearchResult(BaseModel):
    query: str
    session_index: int
    restaurants: List[Restaurant]

client = OpenAI()

async def generate_search_queries(location: str, cuisine: str, budget: str, requirements: str) -> List[str]:
    """
    Generate intelligent search queries for restaurant discovery.
    
    Uses AI to create diverse search terms that will find different types of restaurants
    for the perfect date night experience.
    """
    print(f"Generating search queries for {cuisine} restaurants in {location}...")

    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4.1",
        messages=[
            {
                "role": "user",
                "content": f"""Generate exactly 3 diverse search queries for finding {cuisine} restaurants in {location} with {budget} budget.
Requirements: {requirements}

Create queries that will find different types of restaurants:
1. One focused on the specific cuisine
2. One for romantic/date night spots  
3. One for highly-rated restaurants in the area

Return ONLY the search queries, one per line, no dashes, bullets, or numbers. Just the plain search terms:""",
            }
        ],
        max_completion_tokens=150,
    )

    # Parse AI response and clean up formatting
    content = response.choices[0].message.content
    queries = content.strip().split("\n") if content else []
    queries = [q.strip() for q in queries if q.strip()]
    return queries[:3]

async def score_restaurants(
    restaurants: List[Restaurant],
    requirements: str,
    cuisine: str,
    budget: str
) -> List[Restaurant]:
    """
    Score and rank restaurants based on user requirements using AI.
    
    Analyzes each restaurant against the user's preferences, budget, cuisine match,
    and special requirements to find the best date night options.
    """
    print("AI is analyzing restaurant options based on your preferences...")

    if len(restaurants) == 0:
        print("No restaurants to score")
        return []

    # Format restaurants for AI analysis with index numbers for reference
    restaurant_list = "\n".join([
        f"{index + 1}. {restaurant.name} - {restaurant.rating} - {restaurant.price_range} - {restaurant.cuisine} - {restaurant.location}"
        for index, restaurant in enumerate(restaurants)
    ])

    print(f"Scoring {len(restaurants)} restaurants...")

    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4.1",
        messages=[
            {
                "role": "user",
                "content": f"""You are a date planning expert. Score each restaurant based on how well it matches the user's requirements.

CUISINE: {cuisine}
BUDGET: {budget}
REQUIREMENTS: {requirements}

RESTAURANTS TO SCORE:
{restaurant_list}

For each restaurant, provide a score from 1-10 (10 being perfect match) and a brief reason. Consider:
- How well it matches the cuisine preference
- Budget appropriateness
- Special requirements fit
- Rating and reviews
- Location convenience
- Date night atmosphere

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact format:
[
  {{
    "restaurantIndex": 1,
    "score": 8,
    "reason": "Perfect cuisine match, great rating, fits budget"
  }},
  {{
    "restaurantIndex": 2,
    "score": 6,
    "reason": "Good but pricey for budget"
  }}
]

IMPORTANT: 
- Return raw JSON only, no code blocks
- Include all {len(restaurants)} restaurants
- Keep reasons under 100 characters
- Use restaurantIndex 1-{len(restaurants)}""",
            }
        ],
        max_completion_tokens=1000,
    )

    try:
        # Clean up AI response by removing markdown code blocks
        response_content = response.choices[0].message.content.strip() if response.choices[0].message.content else "[]"
        response_content = response_content.replace("```json\n", "").replace("```json", "").replace("```\n", "").replace("```", "")

        # Parse JSON response from AI scoring
        import json
        scores_data = json.loads(response_content)

        # Map AI scores back to restaurants using index matching
        scored_restaurants = []
        for index, restaurant in enumerate(restaurants):
            score_info = next((s for s in scores_data if s.get("restaurantIndex") == index + 1), None)
            restaurant.ai_score = score_info.get("score", 0) if score_info else 0
            restaurant.ai_reason = score_info.get("reason", "No scoring available") if score_info else "No scoring available"
            scored_restaurants.append(restaurant)

        # Sort by AI score descending to show best matches first
        scored_restaurants.sort(key=lambda x: x.ai_score or 0, reverse=True)
        return scored_restaurants
    except Exception as error:
        print(f"Error parsing AI scores: {error}")
        print("Using fallback scoring (all restaurants scored as 5)")

        # Fallback scoring ensures app continues working even if AI fails
        for restaurant in restaurants:
            restaurant.ai_score = 5
            restaurant.ai_reason = "Scoring failed - using neutral score"
        return restaurants

async def get_user_input() -> DatePlannerAnswers:
    """
    Collect user input for date planning.
    
    Uses interactive CLI prompts with validation to gather information
    needed for intelligent restaurant recommendations.
    """
    print("🍽️ Welcome to the AI-Powered Date Planner!")
    print("Let's find the perfect restaurant for your special date.\n")
    
    # Use InquirerPy for interactive CLI prompts with validation
    def get_date_preference():
        return inquirer.text(
        message="What date are you planning for? (e.g., 'this Friday evening', 'next Saturday at 7pm')",
        default="this Friday evening"
        ).execute()
    
    date_preference = await asyncio.to_thread(get_date_preference)

    def get_cuisine():
        return inquirer.select(
        message="What type of cuisine are you in the mood for?",
        choices=[
            "Italian", "French", "Japanese", "Mexican", "Indian", 
            "Thai", "Chinese", "Mediterranean", "American", "Steakhouse",
            "Seafood", "Vegetarian", "Fine Dining", "Casual", "Other"
        ]
        ).execute()
    
    cuisine = await asyncio.to_thread(get_cuisine)

    def get_location():
        return inquirer.text(
        message="What city or area are you looking in?",
        default="San Francisco"
        ).execute()
    
    location = await asyncio.to_thread(get_location)

    def get_budget():
        return inquirer.select(
        message="What's your budget range?",
        choices=["$", "$$", "$$$", "$$$$", "No specific budget"]
        ).execute()
    
    budget = await asyncio.to_thread(get_budget)

    def get_requirements():
        return inquirer.text(
        message="Any special requirements? (dietary restrictions, ambiance, etc.)",
        default="None"
        ).execute()
    
    requirements = await asyncio.to_thread(get_requirements)
    
    return DatePlannerAnswers(
        date_preference=date_preference,
        cuisine_type=cuisine,
        location=location,
        budget=budget,
        special_requirements=requirements
    )

async def find_nearby_activities(restaurant: Restaurant) -> List[str]:
    """Find nearby activities to extend the date."""
    try:
        prompt = f"""
        Suggest 3-5 nearby activities for a date night near {restaurant.name} in {restaurant.location}.
        Include a mix of indoor and outdoor activities, and consider the restaurant's ambiance.
        Return only the activity names, one per line.
        """
        
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )
        
        activities = response.choices[0].message.content.strip().split('\n')
        return [activity.strip() for activity in activities if activity.strip()]
        
    except Exception as e:
        print(f"Could not find activities: {e}")
        return ["Walk in the neighborhood", "Visit a nearby park", "Check out local shops"]

async def main() -> None:
    """
    Main application entry point.
    
    Orchestrates the entire date planning process:
    1. Collects user input
    2. Generates intelligent search queries
    3. Runs concurrent browser searches
    4. Scores and ranks restaurants with AI
    5. Suggests nearby activities
    6. Displays comprehensive date plan
    """
    print("Starting AI Date Planner...")

    # Step 1: Collect user input
    user_input = await get_user_input()
    print(f"User input received: {user_input.cuisine_type} in {user_input.location} for {user_input.date_preference}")

    # Step 2: Generate search queries using AI
    print("\nGenerating intelligent search queries...")
    try:
        search_queries = await generate_search_queries(
            user_input.location,
            user_input.cuisine_type,
            user_input.budget,
            user_input.special_requirements
        )
        
        print("\nGenerated Search Queries:")
        for index, query in enumerate(search_queries):
            cleaned_query = query.replace('"', '').replace("'", '')
            print(f"   {index + 1}. {cleaned_query}")
    except Exception as error:
        print(f"Error generating search queries: {error}")
        # Fallback queries ensure app continues working
        search_queries = [
            f"{user_input.cuisine_type} restaurants in {user_input.location}",
            f"{user_input.cuisine_type} {user_input.location} {user_input.budget}",
            f"best {user_input.cuisine_type} restaurants {user_input.location}"
        ]
        print("Using fallback search queries")

    # Step 3: Start concurrent browser searches
    print("\nStarting concurrent browser searches...")

    async def run_single_search(query: str, session_index: int, user_input: DatePlannerAnswers) -> SearchResult:
        print(f"Starting search session {session_index + 1} for: \"{query}\"")

        # Create separate Stagehand instance for each search to run concurrently
        # Each session searches independently to maximize speed and parallel processing
        config = StagehandConfig(
            env="BROWSERBASE",
            api_key=os.environ.get("BROWSERBASE_API_KEY"),
            project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
            verbose=1,  # Silent logging to avoid cluttering output
            # Logging levels: 0 = errors only, 1 = info, 2 = debug 
            # When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs
            # https://docs.stagehand.dev/configuration/logging
            model_name="openai/gpt-4o-mini",
            model_api_key=os.environ.get("OPENAI_API_KEY"),
            browserbase_session_create_params={
                "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
                "region": "us-east-1",
                "timeout": 900,
                "browser_settings": {
                    "viewport": {
                        "width": 1920,
                        "height": 1080,
                    }
                }
            }
        )

        try:
            # Initialize browser session with Stagehand
            async with Stagehand(config) as session_stagehand:
                session_page = session_stagehand.page

                # Display live view URL for debugging and monitoring
                session_id = None
                if hasattr(session_stagehand, 'session_id'):
                    session_id = session_stagehand.session_id
                elif hasattr(session_stagehand, 'browserbase_session_id'):
                    session_id = session_stagehand.browserbase_session_id
                
                if session_id:
                    live_view_url = f"https://www.browserbase.com/sessions/{session_id}"
                    print(f"Session {session_index + 1} Live View: {live_view_url}")

                # Navigate to restaurant search site with location-specific URL
                print(f"Session {session_index + 1}: Navigating to OpenTable with location filter...")
                location_slug = user_input.location.lower().replace(" ", "-")
                location_url = f"https://www.opentable.com/{location_slug}-restaurants"
                await session_page.goto(location_url)
                await session_page.wait_for_timeout(3000)

                # Perform search using natural language actions
                print(f"Session {session_index + 1}: Searching for \"{query}\"...")
                await session_page.act(f"Search for {query}")
                await session_page.wait_for_timeout(3000)

                # Extract structured restaurant data using Pydantic schema for type safety
                print(f"Session {session_index + 1}: Extracting restaurant data...")
                
                # Define Pydantic schemas for structured data extraction
                class RestaurantItem(BaseModel):
                    name: str = Field(..., description="the name of the restaurant")
                    url: HttpUrl = Field(..., description="the full URL link to the restaurant page")
                    rating: str = Field(..., description="the star rating or number of reviews (e.g., '4.5 stars' or '123 reviews')")
                    price_range: str = Field(..., description="the price range of the restaurant ($, $$, $$$, $$$$)")
                    cuisine: str = Field(..., description="the cuisine type of the restaurant")
                    location: str = Field(..., description="the location/neighborhood of the restaurant")
                
                class RestaurantsData(BaseModel):
                    restaurants: List[RestaurantItem] = Field(..., max_length=3, description="array of the first 3 restaurants from search results")
                
                restaurants_data = await session_page.extract(
                    "Extract the first 3 restaurants from the search results",
                    schema=RestaurantsData
                )

                print(
                    f"Session {session_index + 1}: Found {len(restaurants_data.restaurants)} restaurants for \"{query}\""
                )

                # Convert to Restaurant objects
                restaurants = [
                    Restaurant(
                        name=r.name,
                        url=str(r.url),
                        rating=r.rating,
                        price_range=r.price_range,
                        cuisine=r.cuisine,
                        location=r.location
                    )
                    for r in restaurants_data.restaurants
                ]

                return SearchResult(
                    query=query,
                    session_index=session_index + 1,
                    restaurants=restaurants
                )
        except Exception as error:
            print(f"Session {session_index + 1} failed: {error}")

            return SearchResult(
                query=query,
                session_index=session_index + 1,
                restaurants=[]
            )

    # Create concurrent search tasks for all generated queries
    search_promises = [run_single_search(query, index, user_input) for index, query in enumerate(search_queries)]

    print("\nBrowser Sessions Starting...")
    print("Live view links will appear as each session initializes")

    # Execute all searches concurrently using asyncio.gather()
    all_results = await asyncio.gather(*search_promises)

    # Calculate total restaurants found across all search sessions
    total_restaurants = sum(len(result.restaurants) for result in all_results)
    print(f"\nTotal restaurants found: {total_restaurants} across {len(search_queries)} searches")

    # Flatten all restaurants into single array for AI scoring
    all_restaurants_flat = []
    for result in all_results:
        all_restaurants_flat.extend(result.restaurants)

    # Step 4: Score and rank restaurants with AI
    if len(all_restaurants_flat) > 0:
        try:
            # AI scores all restaurants and ranks them by relevance to user preferences
            scored_restaurants = await score_restaurants(
                all_restaurants_flat, 
                user_input.special_requirements,
                user_input.cuisine_type,
                user_input.budget
            )
            top3_restaurants = scored_restaurants[:3]

            print("\n🎉 PERFECT DATE PLANNED!")
            print("=" * 50)

            # Display top 3 restaurants with AI reasoning for transparency
            primary_restaurant = top3_restaurants[0] if top3_restaurants else None
            backup_restaurants = top3_restaurants[1:3] if len(top3_restaurants) > 1 else []

            if primary_restaurant:
                print(f"\n🥇 PRIMARY RECOMMENDATION:")
                print(f"   {primary_restaurant.name}")
                print(f"   Cuisine: {primary_restaurant.cuisine}")
                print(f"   Rating: {primary_restaurant.rating}")
                print(f"   Price: {primary_restaurant.price_range}")
                print(f"   Location: {primary_restaurant.location}")
                if primary_restaurant.ai_score:
                    print(f"   AI Score: {primary_restaurant.ai_score}/10")
                    print(f"   Why: {primary_restaurant.ai_reason}")
                print(f"   URL: {primary_restaurant.url}")
                print()

            if backup_restaurants:
                print(f"🥈 BACKUP OPTIONS:")
                for i, restaurant in enumerate(backup_restaurants, 1):
                    print(f"   {i}. {restaurant.name} ({restaurant.cuisine}) - {restaurant.rating} - {restaurant.price_range}")
                    if restaurant.ai_score:
                        print(f"      AI Score: {restaurant.ai_score}/10 - {restaurant.ai_reason}")
                print()

            # Step 5: Find nearby activities
            if primary_restaurant:
                print("🎯 NEARBY ACTIVITIES:")
                activities = await find_nearby_activities(primary_restaurant)
                for activity in activities:
                    print(f"   • {activity}")
                print()

            print(
                f"\nDate planning complete! Found {total_restaurants} restaurants, analyzed {len(scored_restaurants)} with AI."
            )
        except Exception as error:
            # Handle AI scoring errors
            print(f"Error scoring restaurants: {error}")
            print(f"Cuisine: {user_input.cuisine_type}")
            print(f"Location: {user_input.location}")
    else:
        # Handle case where no restaurants were found
        print("No restaurants found to score")
        print("Try adjusting your search criteria or check if the website is accessible")
        
        print("\n💡 TIP: Visit the restaurant websites directly to make reservations or call for availability.")
        print("🎉 Happy dating! Enjoy your special evening!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Check your environment variables")
        exit(1)