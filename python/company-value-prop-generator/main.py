# Stagehand + Browserbase: Value Prop One-Liner Generator - See README.md for full documentation

import os

from dotenv import load_dotenv
from openai import OpenAI
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()

# Domain to analyze - change this to target a different website
target_domain = "www.browserbase.com"  # Or extract from email: email.split("@")[1]

# Initialize OpenAI client
openai_client = OpenAI()


class ValueProp(BaseModel):
    value_prop: str = Field(..., description="the value proposition from the landing page")


def generate_one_liner(domain: str) -> str:
    """
    Analyzes a website's landing page to generate a concise one-liner value proposition.
    Extracts the value prop using Stagehand, then uses an LLM to format it into a short phrase starting with "your".
    """
    # Initialize Stagehand with Browserbase for cloud-based browser automation
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    # Start a new session
    start_response = client.sessions.start(model_name="openai/gpt-4.1")
    session_id = start_response.data.session_id

    try:
        print("Stagehand initialized successfully!")
        print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            # Navigate to domain
            print(f"🌐 Navigating to https://{domain}...")
            # 5min timeout to handle slow-loading sites or network issues
            page.goto(
                f"https://{domain}/",
                wait_until="domcontentloaded",
                timeout=300000,
            )

            print(f"✅ Successfully loaded {domain}")

            # Extract value proposition from landing page
            print(f"📝 Extracting value proposition for {domain}...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction="extract the value proposition from the landing page",
                schema=ValueProp.model_json_schema(),
            )

            value_prop = extract_response.data.result.get("value_prop", "")
            print(f"📊 Extracted value prop for {domain}: {value_prop}")

            # Validate extraction returned meaningful content
            if not value_prop or value_prop.lower() == "null" or value_prop.lower() == "undefined":
                print("⚠️ Value prop extraction returned empty or invalid result")
                raise ValueError(f"No value prop found for {domain}")

            # Generate one-liner using OpenAI
            # Prompt uses few-shot examples to guide LLM toward concise, "your X" format
            # System prompt enforces constraints (9 words max, no quotes, must start with "your")
            print(f"🤖 Generating email one-liner for {domain}...")

            response = openai_client.chat.completions.create(
                model="gpt-4.1",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at generating concise, unique descriptions of companies. Generate ONLY a concise description (no greetings or extra text). Don't use generic adjectives like 'comprehensive', 'innovative', or 'powerful'. Keep it short and concise, no more than 9 words. DO NOT USE QUOTES. Only use English. You MUST start the response with 'your'.",
                    },
                    {
                        "role": "user",
                        "content": f"""The response will be inserted into this template: "{{response}}"

Examples:
Value prop: "Supercharge your investment team with AI-powered research"
Response: "your AI-powered investment research platform"

Value prop: "The video-first food delivery app"
Response: "your video-first approach to food delivery"

Value prop: "{value_prop}"
Response:""",
                    },
                ],
            )

            one_liner = (response.choices[0].message.content or "").strip()

            # Validate LLM response is usable (not empty, not generic placeholder)
            print("🔍 Validating generated one-liner...")
            if (
                not one_liner
                or one_liner.lower() == "null"
                or one_liner.lower() == "undefined"
                or one_liner.lower() == "your company"
            ):
                print(f'⚠️ LLM generated invalid or placeholder response: "{one_liner}"')
                raise ValueError(
                    f'No valid one-liner generated for {domain}. AI response: "{one_liner}"'
                )

            print(f"✨ Generated one-liner for {domain}: {one_liner}")

            browser.close()

        client.sessions.end(id=session_id)
        print("Session closed successfully")
        return one_liner

    except Exception as error:
        error_message = str(error) if isinstance(error, Exception) else error
        print(f"❌ Generation failed for {domain}: {error_message}")
        client.sessions.end(id=session_id)
        raise


def main():
    """
    Main entry point: generates a one-liner value proposition for the target domain.
    """
    print("Starting One-Liner Generator...")

    try:
        one_liner = generate_one_liner(target_domain)
        print("\n✅ Success!")
        print(f"One-liner: {one_liner}")
    except Exception as error:
        error_message = str(error) if isinstance(error, Exception) else error
        print(f"\n❌ Error: {error_message}")
        print("\nCommon issues:")
        print("  - Check .env file has OPENAI_API_KEY set (required for LLM generation)")
        print(
            "  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY set (required for browser automation)"
        )
        print("  - Ensure the domain is accessible and not a placeholder/maintenance page")
        print("  - Verify internet connectivity and that the target site is reachable")
        print("Docs: https://docs.browserbase.com/stagehand")
        exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Fatal error: {err}")
        exit(1)
