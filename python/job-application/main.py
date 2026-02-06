# Stagehand + Browserbase: Job Application Automation - See README.md for full documentation

import os
import random
import time

import httpx
from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field, HttpUrl

from stagehand import Stagehand

# Load environment variables
load_dotenv()


# Define Pydantic schemas for structured data extraction
# Using schemas ensures consistent data extraction even if page layout changes
class JobInfo(BaseModel):
    url: HttpUrl = Field(..., description="Job URL")
    title: str = Field(..., description="Job title")


class JobsData(BaseModel):
    jobs: list[JobInfo]


def get_project_concurrency() -> int:
    """
    Fetch project concurrency limit from Browserbase SDK.

    Retrieves the maximum concurrent sessions allowed for the project,
    capped at 5.
    """
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))
    project = bb.projects.retrieve(os.environ.get("BROWSERBASE_PROJECT_ID"))
    return min(project.concurrency, 5)


def generate_random_email() -> str:
    """
    Generate a random email address for form submission.

    """
    random_string = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=8))
    return f"agent-{random_string}@example.com"


def generate_agent_id() -> str:
    """
    Generate a unique agent identifier for job applications.

    Combines timestamp and random string to ensure uniqueness across
    multiple job applications and sessions.
    """
    timestamp = int(time.time() * 1000)
    random_string = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=7))
    return f"agent-{timestamp}-{random_string}"


def apply_to_job(job_info: JobInfo):
    """
    Apply to a single job posting with automated form filling.

    Uses Stagehand to navigate to job page, fill out application form,
    upload resume, and submit the application.
    """
    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="google/gemini-2.5-flash",
    )
    session_id = start_response.data.session_id

    try:
        print(f"[{job_info.title}] Session Started")
        print(f"[{job_info.title}] Watch live: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to job URL
            page.goto(str(job_info.url))
            print(f"[{job_info.title}] Navigated to job page")

            # Click on the specific job listing to open application form
            client.sessions.act(
                id=session_id,
                input=f"click on {job_info.title}",
            )
            print(f"[{job_info.title}] Clicked on job")

            # Generate unique identifiers for this application
            agent_id = generate_agent_id()
            email = generate_random_email()

            print(f"[{job_info.title}] Agent ID: {agent_id}")
            print(f"[{job_info.title}] Email: {email}")

            # Fill out application form fields using natural language actions
            # Stagehand's act() method understands natural language instructions
            client.sessions.act(
                id=session_id,
                input=f"type '{agent_id}' into the agent identifier field",
            )

            client.sessions.act(
                id=session_id,
                input=f"type '{email}' into the contact endpoint field",
            )

            client.sessions.act(
                id=session_id,
                input="type 'us-west-2' into the deployment region field",
            )

            # Upload agent profile/resume file
            # Using observe() to find the upload button, then setting files programmatically
            observe_response = client.sessions.observe(
                id=session_id,
                instruction="find the file upload button for agent profile",
            )
            upload_actions = observe_response.data.results or []

            if upload_actions and len(upload_actions) > 0:
                upload_action = upload_actions[0]
                upload_selector = (
                    str(upload_action.selector) if hasattr(upload_action, "selector") else None
                )
                if upload_selector:
                    file_input = page.locator(upload_selector)

                    # Fetch resume PDF from remote URL
                    # Using httpx to download the file before uploading
                    resume_url = "https://agent-job-board.vercel.app/Agent%20Resume.pdf"
                    with httpx.Client() as http_client:
                        response = http_client.get(resume_url)
                        if response.status_code != 200:
                            raise Exception(f"Failed to fetch resume: {response.status_code}")
                        resume_buffer = response.content

                    # Upload file using Playwright's set_input_files with buffer
                    file_input.set_input_files(
                        {
                            "name": "Agent Resume.pdf",
                            "mimeType": "application/pdf",
                            "buffer": resume_buffer,
                        }
                    )
                    print(f"[{job_info.title}] Uploaded resume from {resume_url}")

            # Select multi-region deployment option
            client.sessions.act(
                id=session_id,
                input="select 'Yes' for multi region deployment",
            )

            # Submit the application form
            client.sessions.act(
                id=session_id,
                input="click deploy agent button",
            )

            print(f"[{job_info.title}] Application submitted successfully!")

            browser.close()

        client.sessions.end(id=session_id)

    except Exception as error:
        print(f"[{job_info.title}] Error: {error}")
        client.sessions.end(id=session_id)
        raise error


def main():
    """
    Main application entry point.

    Orchestrates the job application process:
    1. Fetches project concurrency limits
    2. Scrapes job listings from the job board
    3. Applies to all jobs sequentially
    """
    print("Starting Job Application Automation...")

    # Get project concurrency limit
    max_concurrency = get_project_concurrency()
    print(f"Project concurrency limit: {max_concurrency}")

    # Initialize Stagehand with Browserbase for cloud-based browser automation (main session for job scraping)
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(
        model_name="google/gemini-2.5-flash",
    )
    session_id = start_response.data.session_id

    print("Main Stagehand Session Started")
    print(f"Watch live: https://browserbase.com/sessions/{session_id}")

    try:
        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to agent job board homepage
            page.goto("https://agent-job-board.vercel.app/")
            print("Navigated to agent-job-board.vercel.app")

            # Click on "View Jobs" button to access job listings
            client.sessions.act(
                id=session_id,
                input="click on the view jobs button",
            )
            print("Clicked on view jobs button")

            # Extract all job listings with titles and URLs using inline schema (avoids $ref issues)
            jobs_schema = {
                "type": "object",
                "properties": {
                    "jobs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "url": {"type": "string", "description": "Job URL"},
                                "title": {"type": "string", "description": "Job title"},
                            },
                            "required": ["url", "title"],
                        },
                    }
                },
                "required": ["jobs"],
            }
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="extract all job listings with their titles and URLs",
                schema=jobs_schema,
            )
            jobs_result = extract_response.data.result

            jobs_data = [
                JobInfo(url=job["url"], title=job["title"]) for job in jobs_result.get("jobs", [])
            ]
            print(f"Found {len(jobs_data)} jobs")

            browser.close()

        client.sessions.end(id=session_id)

    except Exception as error:
        print(f"Error during job scraping: {error}")
        client.sessions.end(id=session_id)
        raise error

    # Apply to all jobs sequentially
    print(f"Starting to apply to {len(jobs_data)} jobs...")

    for job in jobs_data:
        try:
            apply_to_job(job)
        except Exception as error:
            print(f"Failed to apply to {job.title}: {error}")
            continue

    print("All applications completed!")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Error: {err}")
        exit(1)
