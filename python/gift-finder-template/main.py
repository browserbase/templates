# Stagehand + Browserbase: AI-Powered Gift Finder - See README.md for full documentation

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


class GiftFinderAnswers(BaseModel):
    recipient: str
    description: str


class Product(BaseModel):
    title: str
    url: str
    price: str
    rating: str
    ai_score: Optional[int] = None
    ai_reason: Optional[str] = None


class SearchResult(BaseModel):
    query: str
    session_index: int
    products: List[Product]


client = OpenAI()


async def generate_search_queries(recipient: str, description: str) -> List[str]:
    """
    Generate intelligent search queries based on recipient profile.
    
    Uses AI to create thoughtful, complementary gift search terms that go beyond
    obvious basics to find unique and meaningful gifts.
    """
    print(f"Generating search queries for {recipient}...")

    # Use AI to generate search terms based on recipient profile
    # This avoids generic searches and focuses on thoughtful, complementary gifts
    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4.1",
        messages=[
            {
                "role": "user",
                "content": f"""Generate exactly 3 short gift search queries (1-2 words each) for finding gifts for a {recipient.lower()} who is described as: "{description}". 

IMPORTANT: Assume they already have the basic necessities related to their interests. Focus on:
- Complementary items that enhance their hobbies
- Thoughtful accessories or upgrades
- Related but unexpected items
- Premium or unique versions of things they might not buy themselves

AVOID obvious basics like "poker set" for poker players, "dumbbells" for fitness enthusiasts, etc.

Examples for "loves cooking":
spice rack
chef knife
herb garden

Return ONLY the search terms, one per line, no dashes, bullets, or numbers. Just the plain search terms:""",
            }
        ],
        max_completion_tokens=1000,
    )

    # Parse AI response and clean up formatting
    content = response.choices[0].message.content
    queries = content.strip().split("\n") if content else []
    queries = [q.strip() for q in queries if q.strip()]
    return queries[:3]


async def score_products(
    products: List[Product],
    recipient: str,
    description: str,
) -> List[Product]:
    """
    Score and rank products based on recipient profile using AI.
    
    Analyzes each product against the recipient's interests, relationship context,
    value, uniqueness, and practical usefulness to find the best gift matches.
    """
    print("AI is analyzing gift options based on recipient profile...")

    # Flatten all products from multiple search sessions into single array
    all_products = products

    if len(all_products) == 0:
        print("No products to score")
        return []

    # Format products for AI analysis with index numbers for reference
    product_list = "\n".join([
        f"{index + 1}. {product.title} - {product.price} - {product.rating}"
        for index, product in enumerate(all_products)
    ])

    print(f"Scoring {len(all_products)} products...")

    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4.1",
        messages=[
            {
                "role": "user",
                "content": f"""You are a gift recommendation expert. Score each product based on how well it matches the recipient profile.

RECIPIENT: {recipient}
DESCRIPTION: {description}

PRODUCTS TO SCORE:
{product_list}

For each product, provide a score from 1-10 (10 being perfect match) and a brief reason. Consider:
- How well it matches their interests/hobbies
- Appropriateness for the relationship ({recipient.lower()})
- Value for money
- Uniqueness/thoughtfulness
- Practical usefulness

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact format:
[
  {{
    "productIndex": 1,
    "score": 8,
    "reason": "Perfect for poker enthusiasts, high quality chips enhance the gaming experience"
  }},
  {{
    "productIndex": 2,
    "score": 6,
    "reason": "Useful but basic, might already own similar item"
  }}
]

IMPORTANT: 
- Return raw JSON only, no code blocks
- Include all {len(all_products)} products
- Keep reasons under 100 characters
- Use productIndex 1-{len(all_products)}""",
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

        # Map AI scores back to products using index matching
        scored_products = []
        for index, product in enumerate(all_products):
            score_info = next((s for s in scores_data if s.get("productIndex") == index + 1), None)
            product.ai_score = score_info.get("score", 0) if score_info else 0
            product.ai_reason = score_info.get("reason", "No scoring available") if score_info else "No scoring available"
            scored_products.append(product)

        # Sort by AI score descending to show best matches first
        scored_products.sort(key=lambda x: x.ai_score or 0, reverse=True)
        return scored_products
    except Exception as error:
        print(f"Error parsing AI scores: {error}")
        print("Using fallback scoring (all products scored as 5)")

        # Fallback scoring ensures app continues working even if AI fails
        # Neutral score of 5 allows products to still be ranked and displayed
        for product in all_products:
            product.ai_score = 5
            product.ai_reason = "Scoring failed - using neutral score"
        return all_products


async def get_user_input() -> GiftFinderAnswers:
    """
    Collect user input for gift recipient and description.
    
    Uses interactive CLI prompts with validation to gather information
    needed for intelligent gift recommendations.
    """
    print("Welcome to the Gift Finder App!")
    print("Find the perfect gift with intelligent web browsing")

    # Use InquirerPy for interactive CLI prompts with validation
    def get_recipient():
        return inquirer.select(
            message="Who are you buying a gift for?",
            choices=["Mum", "Dad", "Sister", "Brother", "Friend", "Boss"],
        ).execute()
    
    recipient = await asyncio.to_thread(get_recipient)

    def validate_description(text):
        if len(text.strip()) < 5:
            raise ValueError("Please provide at least 5 characters for a better gift recommendation.")
        return True

    def get_description():
        return inquirer.text(
            message="Please provide a short description about them (interests, hobbies, age, etc.):",
            validate=validate_description,
        ).execute()
    
    description = await asyncio.to_thread(get_description)

    return GiftFinderAnswers(
        recipient=recipient,
        description=description
    )


async def main() -> None:
    """
    Main application entry point.
    
    Orchestrates the entire gift finding process:
    1. Collects user input
    2. Generates intelligent search queries
    3. Runs concurrent browser searches
    4. Scores and ranks products with AI
    5. Displays top recommendations
    """
    print("Starting Gift Finder Application...")

    # Step 1: Collect user input
    user_input = await get_user_input()
    recipient = user_input.recipient
    description = user_input.description
    print(f"User input received: {recipient} - {description}")

    # Step 2: Generate search queries using AI
    print("\nGenerating intelligent search queries...")
    try:
        search_queries = await generate_search_queries(recipient, description)

        print("\nGenerated Search Queries:")
        for index, query in enumerate(search_queries):
            cleaned_query = query.replace('"', '').replace("'", '')
            print(f"   {index + 1}. {cleaned_query}")
    except Exception as error:
        print(f"Error generating search queries: {error}")
        # Fallback queries ensure app continues working
        search_queries = ["gifts", "accessories", "items"]
        print("Using fallback search queries")

    # Step 3: Start concurrent browser searches
    print("\nStarting concurrent browser searches...")

    async def run_single_search(query: str, session_index: int) -> SearchResult:
        print(f"Starting search session {session_index + 1} for: \"{query}\"")

        # Create separate Stagehand instance for each search to run concurrently
        # Each session searches independently to maximize speed and parallel processing
        config = StagehandConfig(
            env="BROWSERBASE",
            api_key=os.environ.get("BROWSERBASE_API_KEY"),
            project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
            verbose=0,  # Silent logging to avoid cluttering output
            # Logging levels: 0 = errors only, 1 = info, 2 = debug 
            # When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs
            # https://docs.stagehand.dev/configuration/logging
            model_name="gpt-4.1",
            model_api_key=os.environ.get("OPENAI_API_KEY"),
            browserbase_session_create_params={
                "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
                # Proxies require Developer Plan or higher - uncomment if you have a Developer Plan or higher
                # "proxies": [
                #     {
                #         "type": "browserbase",
                #         "geolocation": {
                #             "city": "LONDON",
                #             "country": "GB"
                #         }
                #     }
                # ],
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

                # Navigate to European gift site
                print(f"Session {session_index + 1}: Navigating to Firebox.eu...")
                await session_page.goto("https://firebox.eu/")

                # Perform search using natural language actions
                print(f"Session {session_index + 1}: Searching for \"{query}\"...")
                await session_page.act(f"Type {query} into the search bar")
                await session_page.act("Click the search button")
                await session_page.wait_for_timeout(1000)

                # Extract structured product data using Pydantic schema for type safety
                print(f"Session {session_index + 1}: Extracting product data...")
                
                # Define Pydantic schemas for structured data extraction
                class ProductItem(BaseModel):
                    title: str = Field(..., description="the title/name of the product")
                    url: HttpUrl = Field(..., description="the full URL link to the product page")
                    price: str = Field(..., description="the price of the product (include currency symbol)")
                    rating: str = Field(..., description="the star rating or number of reviews (e.g., '4.5 stars' or '123 reviews')")
                
                class ProductsData(BaseModel):
                    products: List[ProductItem] = Field(..., max_length=3, description="array of the first 3 products from search results")
                
                products_data = await session_page.extract(
                    "Extract the first 3 products from the search results",
                    schema=ProductsData
                )

                print(
                    f"Session {session_index + 1}: Found {len(products_data.products)} products for \"{query}\""
                )

                # Convert to Product objects
                products = [
                    Product(
                        title=p.title,
                        url=str(p.url),
                        price=p.price,
                        rating=p.rating
                    )
                    for p in products_data.products
                ]

                return SearchResult(
                    query=query,
                    session_index=session_index + 1,
                    products=products
                )
        except Exception as error:
            print(f"Session {session_index + 1} failed: {error}")

            return SearchResult(
                query=query,
                session_index=session_index + 1,
                products=[]
            )

    # Create concurrent search tasks for all generated queries
    search_promises = [run_single_search(query, index) for index, query in enumerate(search_queries)]

    print("\nBrowser Sessions Starting...")
    print("Live view links will appear as each session initializes")

    # Execute all searches concurrently using asyncio.gather()
    all_results = await asyncio.gather(*search_promises)

    # Calculate total products found across all search sessions
    total_products = sum(len(result.products) for result in all_results)
    print(f"\nTotal products found: {total_products} across {len(search_queries)} searches")

    # Flatten all products into single array for AI scoring
    all_products_flat = []
    for result in all_results:
        all_products_flat.extend(result.products)

    # Step 4: Score and rank products with AI
    if len(all_products_flat) > 0:
        try:
            # AI scores all products and ranks them by relevance to recipient
            scored_products = await score_products(all_products_flat, recipient, description)
            top3_products = scored_products[:3]

            print("\nTOP 3 RECOMMENDED GIFTS:")
            print("=" * 50)

            # Display top 3 products with AI reasoning for transparency
            for index, product in enumerate(top3_products):
                rank = f"#{index + 1}"
                print(f"\n{rank} - {product.title}")
                print(f"Price: {product.price}")
                print(f"Rating: {product.rating}")
                print(f"AI Score: {product.ai_score}/10")
                print(f"Why: {product.ai_reason}")
                print(f"Link: {product.url}")
                print("-" * 30)

            print(
                f"\nGift finding complete! Found {total_products} products, analyzed {len(scored_products)} with AI."
            )
        except Exception as error:
            # Handle AI scoring errors
            print(f"Error scoring products: {error}")
            print(f"Target: {recipient}")
            print(f"Profile: {description}")
    else:
        # Handle case where no products were found
        print("No products found to score")
        print("Try adjusting your recipient description or check if the website is accessible")

    print("\nThank you for using Gift Finder!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Check your environment variables and internet connection")
        exit(1)