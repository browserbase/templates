# Stagehand + Browserbase: Computer Use Agent (CUA) Example - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

# Validate required environment variables
def validate_env_vars():
    """Check that all required environment variables are set before proceeding."""
    required_vars = {
        "BROWSERBASE_API_KEY": "Browserbase API key for cloud browser automation",
        "BROWSERBASE_PROJECT_ID": "Browserbase Project ID for session management", 
        "GOOGLE_API_KEY": "Google API key for Computer Use Agent model access"
    }
    
    missing_vars = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing_vars.append(f"  - {var}: {description}")
    
    if missing_vars:
        print(" Missing required environment variables:")
        for var in missing_vars:
            print(var)
        print("\n Please add these to your .env file and try again.")
        print(" See README.md for setup instructions.")
        exit(1)
    
    print("✅ All required environment variables are set!")

# Validate environment variables before proceeding
validate_env_vars()

# ============================================================================
# EXAMPLE INSTRUCTIONS - Choose one to test different scenarios
# ============================================================================

# Example 1: Learning Plan Creation
# instruction = """I want to learn more about Sourdough Bread Making. It's my first time learning about it, and want to get a good grasp by investing 1 hour a day for the next 2 months. Go find online courses/resources, create a plan cross-referencing the time I want to invest with the modules/timelines of the courses and return the plan"""

# Example 2: Flight Search
# instruction = """Use flights.google.com to find the lowest fare from all eligible one-way flights for 1 adult from JFK to Heathrow in the next 30 days."""

# Example 3: Solar Eclipse Research
instruction = """Search for the next visible solar eclipse in North America and its expected date, and what about the one after that."""

# Example 4: GitHub PR Verification
# instruction = """Find the most recently opened non-draft PR on Github for Browserbase's Stagehand project and make sure the combination-evals in the PR validation passed."""

# ============================================================================

async def main():
    print("Starting Computer Use Agent Example...")
    
    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),  # this is the model stagehand uses in act, observe, extract (not agent)
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "proxies": True,  # Using proxies will give the agent a better chance of success - requires Developer Plan or higher, comment out if you don't have access
            "region": "us-west-2",
            "browser_settings": {
                "viewport": {
                    "width": 1920,
                    "height": 1080
                },
                "block_ads": True,
            },
        },
        verbose=1  # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )

    try:
        async with Stagehand(config) as stagehand:
            print("Stagehand initialized successfully!")
            print(f"Live View Link: https://browserbase.com/sessions/{stagehand.session_id}")

            page = stagehand.page

            # Navigate to search engine with extended timeout for slow-loading sites.
            print("Navigating to Google search...")
            await page.goto(
                "https://www.google.com/", 
                wait_until="domcontentloaded",
                timeout=60000  # Extended timeout for reliable page loading
            )

            # Create agent with computer use capabilities for autonomous web browsing.
            print("Creating Computer Use Agent...")
            agent = stagehand.agent(
                provider="google",
                model="gemini-2.5-computer-use-preview-10-2025",
                instructions=f"""You are a helpful assistant that can use a web browser.
                You are currently on the following page: {page.url}.
                Do not ask follow up questions, the user will trust your judgement. If you are getting blocked on google, try another search engine.""",
                options={
                    "api_key": os.getenv("GOOGLE_API_KEY"),
                },
            )

            # Execute the autonomous task with the Computer Use Agent
            print("Executing instruction:", instruction)
            result = await agent.execute(
                instruction=instruction,
                max_steps=30, # The maximum number of steps the agent can take to complete the task
                auto_screenshot=True
            )

            if result.success == True:
                print("Task completed successfully!")
                print("Result:", result)
            else:
                print("Task failed or was incomplete")
        
        print("Session closed successfully")

    except Exception as error:
        print(f"Error executing computer use agent: {error}")
        raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in computer use agent example: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set for the agent")
        print("  - Ensure internet connection and website accessibility")
        print("  - Check that you have access to Google's model")
        print("Docs: https://docs.browserbase.com/stagehand")
        exit(1)
