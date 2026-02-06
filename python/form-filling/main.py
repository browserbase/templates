# Stagehand + Browserbase: Form Filling Automation - See README.md for full documentation

import os
import time

from dotenv import load_dotenv

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# Form data variables - using random/fake data for testing
# Set your own variables below to customize the form submission
first_name = "Alex"
last_name = "Johnson"
company = "TechCorp Solutions"
job_title = "Software Developer"
email = "alex.johnson@techcorp.com"
message = (
    "Hello, I'm interested in learning more about your services and would like to schedule a demo."
)


def main():
    print("Starting Form Filling Example...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="openai/gpt-4.1",
    )
    session_id = start_response.data.session_id
    print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

    try:
        print("Stagehand initialized successfully!")

        # Navigate to contact page
        print("Navigating to Browserbase contact page...")
        client.sessions.navigate(id=session_id, url="https://www.browserbase.com/contact")

        # Fill form using individual act() calls for reliability
        print("Filling in contact form...")

        # Fill each field individually for better reliability
        client.sessions.act(
            id=session_id,
            input=f'Fill in the first name field with "{first_name}"',
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the last name field with "{last_name}"',
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the company field with "{company}"',
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the job title field with "{job_title}"',
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the email field with "{email}"',
        )
        client.sessions.act(
            id=session_id,
            input=f'Fill in the message field with "{message}"',
        )

        # Language choice in Stagehand act() is crucial for reliable automation.
        # Use "click" for dropdown interactions rather than "select"
        client.sessions.act(
            id=session_id,
            input="Click on the How Can we help? dropdown",
        )
        time.sleep(0.5)
        client.sessions.act(
            id=session_id,
            input="Click on the first option from the dropdown",
        )

        # Uncomment the line below if you want to submit the form
        # client.sessions.act(id=session_id, input="Click the submit button")

        print("Form filled successfully! Waiting 30 seconds...")
        time.sleep(30)

    except Exception as error:
        print(f"Error during form filling: {error}")
        raise

    finally:
        client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error in form filling example: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Ensure form fields are available on the contact page")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
