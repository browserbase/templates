# Stagehand + Browserbase: Form Filling Automation - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig

# Load environment variables
load_dotenv()

# Form data variables - using random/fake data for testing
# Set your own variables below to customize the form submission
first_name = "Alex"
last_name = "Johnson"
company = "TechCorp Solutions"
job_title = "Software Developer"
email = "alex.johnson@techcorp.com"
message = "Hello, I'm interested in learning more about your services and would like to schedule a demo."


async def main():
    print("Starting Form Filling Example...")
    
    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="openai/gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
        },
        verbose=1  # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
    )

    try:
        # Use async context manager for automatic resource management
        async with Stagehand(config) as stagehand:
            print("Stagehand initialized successfully!")
            if hasattr(stagehand, 'session_id'):
                print(f"Live View Link: https://browserbase.com/sessions/{stagehand.session_id}")
            elif hasattr(stagehand, 'browserbase_session_id'):
                print(f"Live View Link: https://browserbase.com/sessions/{stagehand.browserbase_session_id}")

            page = stagehand.page

            # Navigate to contact page with extended timeout for slow-loading sites.
            print("Navigating to Browserbase contact page...")
            await page.goto(
                'https://www.browserbase.com/contact',
                wait_until='domcontentloaded',  # Wait for DOM to be ready before proceeding.
                timeout=60000  # Extended timeout for reliable page loading.
            )

            # Fill form using individual act() calls for reliability
            print("Filling in contact form...")
            
            # Fill each field individually for better reliability
            await page.act(f"Fill in the first name field with \"{first_name}\"")
            await page.act(f"Fill in the last name field with \"{last_name}\"")
            await page.act(f"Fill in the company field with \"{company}\"")
            await page.act(f"Fill in the job title field with \"{job_title}\"")
            await page.act(f"Fill in the email field with \"{email}\"")
            await page.act(f"Fill in the message field with \"{message}\"")
            
            # Language choice in Stagehand act() is crucial for reliable automation.
            # Use "click" for dropdown interactions rather than "select"
            await page.act("Click on the How Can we help? dropdown")
            await page.wait_for_timeout(500)
            await page.act("Click on the first option from the dropdown")
            # await page.act("Select the first option from the dropdown")  # Less reliable than "click"

            # Uncomment the line below if you want to submit the form
            # await page.act("Click the submit button")
        
            print("Form filled successfully! Waiting 3 seconds...")
            await page.wait_for_timeout(30000)
        
        print("Session closed successfully")

    except Exception as error:
        print(f"Error during form filling: {error}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in form filling example: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Ensure form fields are available on the contact page")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
