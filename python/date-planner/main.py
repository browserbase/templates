# Stagehand + Browserbase: AI-Powered Date Planner - See README.md for full documentation

import os
import asyncio
from typing import List, Optional
from urllib.parse import quote
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

class VerifiedDetails(BaseModel):
    description: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    reservation_available: Optional[bool] = None

class Restaurant(BaseModel):
    name: str
    url: str
    rating: str
    price_range: str
    cuisine: str
    location: str
    ai_score: Optional[int] = None
    ai_reason: Optional[str] = None
    verified: Optional[bool] = None
    verified_details: Optional[VerifiedDetails] = None

class SearchResult(BaseModel):
    query: str
    session_index: int
    restaurants: List[Restaurant]

client = OpenAI()

async def generate_search_queries(location: str, cuisine: str, budget: str, requirements: str) -> List[str]:
    """
    Generate diverse search queries using AI to discover restaurants from multiple angles.
    
    Creates 3 different queries: cuisine-specific, romantic spots, and highly-rated options.
    This diversity helps find a broader range of restaurants than a single query.
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

    # Parse AI response: remove formatting artifacts and extract plain search terms
    content = response.choices[0].message.content
    queries = content.strip().split("\n") if content else []
    queries = [q.strip() for q in queries if q.strip()]
    print(f"Generated {len(queries[:3])} search queries")
    return queries[:3]

async def score_restaurants(
    restaurants: List[Restaurant],
    requirements: str,
    cuisine: str,
    budget: str
) -> List[Restaurant]:
    """
    Score and rank restaurants using AI, prioritizing cuisine match and user preferences.
    
    Uses strict scoring guidelines: restaurants that don't match cuisine get 1-3 points max.
    This ensures recommendations actually match what the user requested.
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
- How well it matches the cuisine preference (CRITICAL: Restaurants that don't match {cuisine} cuisine should score 3 or below)
- Budget appropriateness
- Special requirements fit
- Rating and reviews
- Location convenience
- Date night atmosphere

IMPORTANT SCORING GUIDELINES:
- Restaurants that don't match the {cuisine} cuisine preference should score 1-3 points maximum
- Restaurants that match cuisine but have other issues should score 4-6 points
- Good matches that meet most criteria should score 7-8 points
- Perfect matches should score 9-10 points

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
        # Clean up AI response: LLMs sometimes wrap JSON in markdown code blocks
        response_content = response.choices[0].message.content.strip() if response.choices[0].message.content else "[]"
        response_content = response_content.replace("```json\n", "").replace("```json", "").replace("```\n", "").replace("```", "")

        # Parse JSON response from AI scoring
        import json
        scores_data = json.loads(response_content)
        print(f"Successfully parsed scores for {len(scores_data)} restaurants")

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

        # Neutral fallback ensures app continues even if AI response is malformed
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
    """Suggest nearby date activities using AI, with fallback defaults if API fails."""
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
    print(f"Extracted: {user_input.cuisine_type} in {user_input.location} for {user_input.date_preference}")

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
                else:
                    print(f"Session {session_index + 1}: Waiting for session ID...")

                # Navigate to Google for web-wide search (more comprehensive than single-site search)
                print(f"Session {session_index + 1}: Navigating to Google search for \"{query}\"...")
                search_url = f"https://www.google.com/search?q={quote(query)}"
                await session_page.goto(search_url)
                # Wait for results to load (Google may show captcha or require time)
                await session_page.wait_for_timeout(3000)

                # Extract restaurant links from Google search results
                print(f"Session {session_index + 1}: Extracting restaurant links from search results...")
                
                # Define Pydantic schemas for extracting restaurant links from Google results
                class SearchResultItem(BaseModel):
                    name: str = Field(..., description="the name of the restaurant")
                    url: str = Field(..., description="the URL link to the restaurant page (from search results or restaurant sites like OpenTable, Yelp, Resy, etc.)")
                    snippet: Optional[str] = Field(None, description="a brief snippet/description if available from search results")
                
                class SearchResultsData(BaseModel):
                    restaurants: List[SearchResultItem] = Field(..., max_length=5, description="array of up to 5 restaurant results from the search, including links to restaurant websites, OpenTable, Yelp, Resy, or other booking platforms")
                
                try:
                    search_results_data = await session_page.extract(
                        "Extract restaurant names and URLs from the search results. Look for links to restaurant websites, OpenTable, Yelp, Resy, or other restaurant listing/booking sites. Get up to 5 results.",
                        schema=SearchResultsData
                    )
                    
                    # Access restaurants from validated data
                    restaurants_list = search_results_data.restaurants
                except Exception as extract_error:
                    # If validation fails, try to access raw data from the failed validation
                    print(f"Session {session_index + 1}: Validation failed, accessing raw data...")
                    restaurants_list = []
                    try:
                        # When Pydantic validation fails, Stagehand stores raw data in .data attribute
                        # Try to re-extract with a more flexible approach
                        raw_extract = await session_page.extract(
                            "Extract restaurant names and URLs from the search results. Look for links to restaurant websites, OpenTable, Yelp, Resy, or other restaurant listing/booking sites. Get up to 5 results. Return a JSON object with a 'restaurants' array, where each restaurant has 'name' and 'url' fields.",
                            schema=None
                        )
                        
                        # Parse raw extraction: Stagehand stores failed validation data in .data attribute
                        if hasattr(raw_extract, 'data'):
                            data_dict = raw_extract.data
                        elif isinstance(raw_extract, dict):
                            data_dict = raw_extract
                        else:
                            data_dict = {}
                        
                        # Extract restaurants from raw data and normalize URLs
                        if isinstance(data_dict, dict) and 'restaurants' in data_dict:
                            for r in data_dict['restaurants']:
                                if isinstance(r, dict):
                                    # Normalize URLs: ensure they're valid strings with protocol
                                    url = str(r.get('url', ''))
                                    if url and not url.startswith(('http://', 'https://')):
                                        # Add https:// if URL looks valid but missing protocol
                                        if url.startswith('www.') or '.' in url:
                                            url = 'https://' + url
                                    
                                    restaurants_list.append(SearchResultItem(
                                        name=r.get('name', 'Unknown'),
                                        url=url,
                                        snippet=r.get('snippet')
                                    ))
                    except Exception as e:
                        print(f"Session {session_index + 1}: Could not extract restaurant data from raw: {e}")
                        restaurants_list = []

                print(
                    f"Session {session_index + 1}: Found {len(restaurants_list)} restaurant links for \"{query}\""
                )

                # Click through and verify top restaurants
                verified_restaurants = []
                
                for i in range(min(3, len(restaurants_list))):
                    result = restaurants_list[i]
                    print(f"Session {session_index + 1}: Verifying restaurant {i + 1}/{min(3, len(restaurants_list))}: {result.name}...")
                    
                    try:
                        # Navigate to restaurant page to verify details directly from source
                        print(f"Session {session_index + 1}: Navigating to {result.url}...")
                        await session_page.goto(str(result.url))
                        # Wait for page to load before extraction
                        await session_page.wait_for_timeout(3000)
                        
                        print(f"Session {session_index + 1}: Extracting restaurant details...")
                        # Extract detailed restaurant information from the page
                        class RestaurantDetailItem(BaseModel):
                            name: str = Field(..., description="the name of the restaurant")
                            rating: str = Field(..., description="the star rating or review information (e.g., '4.5 stars', 'Great reviews', '4.7/5')")
                            price_range: str = Field(..., description="the price range ($, $$, $$$, $$$$) or price level")
                            cuisine: str = Field(..., description="the cuisine type")
                            location: str = Field(..., description="the location, neighborhood, or address")
                            description: Optional[str] = Field(None, description="a brief description or key features")
                            hours: Optional[str] = Field(None, description="operating hours if available")
                            phone: Optional[str] = Field(None, description="phone number if available")
                            address: Optional[str] = Field(None, description="full address if available")
                            reservation_available: Optional[bool] = Field(None, description="whether reservations appear to be available")
                        
                        class RestaurantDetailData(BaseModel):
                            restaurant: RestaurantDetailItem = Field(..., description="detailed restaurant information from the page")
                        
                        restaurant_detail_data = await session_page.extract(
                            "Extract detailed information about this restaurant from the page. Look for rating, price range, cuisine type, location, description, hours, contact info, and whether reservations are available.",
                            schema=RestaurantDetailData
                        )
                        
                        detail = restaurant_detail_data.restaurant
                        
                        verified_restaurants.append(Restaurant(
                            name=detail.name or result.name,
                            url=str(result.url),
                            rating=detail.rating or "Rating not available",
                            price_range=detail.price_range or "Price not specified",
                            cuisine=detail.cuisine or user_input.cuisine_type,
                            location=detail.location or user_input.location,
                            verified=True,
                            verified_details=VerifiedDetails(
                                description=detail.description,
                                hours=detail.hours,
                                phone=detail.phone,
                                address=detail.address,
                                reservation_available=detail.reservation_available,
                            )
                        ))
                        
                        print(f"Session {session_index + 1}: ✓ Verified {detail.name or result.name}")
                        
                    except Exception as error:
                        print(f"Session {session_index + 1}: ⚠ Could not verify {result.name}, using basic info")
                        # Fallback: use search result info if page verification fails
                        verified_restaurants.append(Restaurant(
                            name=result.name,
                            url=str(result.url),
                            rating="Rating not verified",
                            price_range="Price not verified",
                            cuisine=user_input.cuisine_type,
                            location=user_input.location,
                            verified=False,
                        ))

                restaurants = verified_restaurants

                print(f"Session {session_index + 1}: Session closed successfully")
                return SearchResult(
                    query=query,
                    session_index=session_index + 1,
                    restaurants=restaurants
                )
        except Exception as error:
            print(f"Session {session_index + 1} failed: {error}")

            try:
                # Attempt cleanup even on error
                if 'session_stagehand' in locals():
                    await session_stagehand.close()
                    print(f"Session {session_index + 1}: Session closed after error")
            except Exception:
                pass

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
        print(f"\nScoring {len(all_restaurants_flat)} restaurants with AI...")
        try:
            # AI scores all restaurants and ranks them by relevance to user preferences
            scored_restaurants = await score_restaurants(
                all_restaurants_flat, 
                user_input.special_requirements,
                user_input.cuisine_type,
                user_input.budget
            )
            
            print(f"Filtering restaurants (minimum score 5/10, must match {user_input.cuisine_type} cuisine)...")
            # Filter: minimum score 5/10 and cuisine must match (prevents showing wrong cuisine types)
            MIN_SCORE_THRESHOLD = 5
            filtered_restaurants = []
            for restaurant in scored_restaurants:
                score = restaurant.ai_score or 0
                reason = (restaurant.ai_reason or "").lower()
                
                # Exclude restaurants with low scores
                if score < MIN_SCORE_THRESHOLD:
                    continue
                
                # Exclude restaurants explicitly marked as not matching cuisine
                cuisine_mismatch_indicators = [
                    f"not {user_input.cuisine_type.lower()}",
                    "doesn't match cuisine",
                    "wrong cuisine",
                    f"not {user_input.cuisine_type.lower()[:-1] if user_input.cuisine_type.lower().endswith('n') else user_input.cuisine_type.lower()} cuisine"
                ]
                if any(indicator in reason for indicator in cuisine_mismatch_indicators):
                    continue
                
                filtered_restaurants.append(restaurant)
            
            print(f"Found {len(filtered_restaurants)} restaurants meeting quality threshold")
            
            # Only take top 3 from filtered restaurants
            top3_restaurants = filtered_restaurants[:3]
            
            # If no good matches found, inform user
            if len(top3_restaurants) == 0:
                print("\n⚠️  No restaurants found that match your preferences well enough.")
                print("The restaurants found didn't meet the quality threshold (minimum score 5/10) or cuisine match.")
                print("\nTry:")
                print(f"  - Adjusting your cuisine preference (currently: {user_input.cuisine_type})")
                print(f"  - Trying a different location (currently: {user_input.location})")
                print(f"  - Adjusting your budget (currently: {user_input.budget})")
                print("\nHere are some restaurants that were found (but didn't match well):")
                for i, restaurant in enumerate(scored_restaurants[:3], 1):
                    print(f"  {i}. {restaurant.name} ({restaurant.cuisine}) - Score: {restaurant.ai_score}/10")
                    print(f"     Reason: {restaurant.ai_reason}")
                return

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
                if primary_restaurant.verified:
                    print(f"   ✓ Verified by clicking through and inspecting the restaurant page")
                    if primary_restaurant.verified_details:
                        details = primary_restaurant.verified_details
                        if details.description:
                            print(f"   Description: {details.description}")
                        if details.address:
                            print(f"   Address: {details.address}")
                        if details.phone:
                            print(f"   Phone: {details.phone}")
                        if details.hours:
                            print(f"   Hours: {details.hours}")
                        if details.reservation_available is not None:
                            print(f"   Reservations: {'Available' if details.reservation_available else 'Not available'}")
                else:
                    print(f"   Not verified (could not access restaurant page)")
                if primary_restaurant.ai_score:
                    print(f"   AI Score: {primary_restaurant.ai_score}/10")
                    print(f"   Why: {primary_restaurant.ai_reason}")
                print(f"   URL: {primary_restaurant.url}")
                print()

            if backup_restaurants:
                print(f"🥈 BACKUP OPTIONS:")
                for i, restaurant in enumerate(backup_restaurants, 1):
                    print(f"   {i}. {restaurant.name} ({restaurant.cuisine}) - {restaurant.rating} - {restaurant.price_range}")
                    if restaurant.verified:
                        print(f"      ✓ Verified")
                        if restaurant.verified_details:
                            if restaurant.verified_details.address:
                                print(f"      Address: {restaurant.verified_details.address}")
                            if restaurant.verified_details.reservation_available is not None:
                                print(f"      Reservations: {'Available' if restaurant.verified_details.reservation_available else 'Not available'}")
                    if restaurant.ai_score:
                        print(f"      AI Score: {restaurant.ai_score}/10 - {restaurant.ai_reason}")
                print()

            # Step 5: Find nearby activities
            if primary_restaurant:
                print("\nFinding nearby activities...")
                activities = await find_nearby_activities(primary_restaurant)
                print("🎯 NEARBY ACTIVITIES:")
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
    except KeyboardInterrupt:
        print("\nApplication interrupted by user")
        exit(0)
    except Exception as err:
        print(f"\nApplication error: {err}")
        print("\nCommon issues:")
        print("  - Check .env has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify OPENAI_API_KEY is set")
        print("  - Ensure internet access and website accessibility")
        print("  - Check Browserbase project has active credits/sessions available")
        exit(1)
