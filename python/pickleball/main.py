# SF Court Booking Automation - See README.md for full documentation
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from InquirerPy import inquirer
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from stagehand import Stagehand

# Load environment variables
load_dotenv()


def login_to_site(client, session_id: str, email: str, password: str) -> None:
    print("Logging in...")
    client.sessions.act(
        id=session_id,
        input="Click the Login button",
    )
    client.sessions.act(
        id=session_id,
        input=f'Fill in the email or username field with "{email}"',
    )
    client.sessions.act(
        id=session_id,
        input="Click the next, continue, or submit button to proceed",
    )
    client.sessions.act(
        id=session_id,
        input=f'Fill in the password field with "{password}"',
    )
    client.sessions.act(
        id=session_id,
        input="Click the login, sign in, or submit button",
    )
    print("Logged in")


def select_filters(
    client, session_id: str, activity: str, time_of_day: str, selected_date: str
) -> None:
    print("Selecting the activity")
    client.sessions.act(
        id=session_id,
        input="Click the activites drop down menu",
    )
    client.sessions.act(
        id=session_id,
        input=f"Select the {activity} activity",
    )
    client.sessions.act(id=session_id, input="Click the Done button")

    print(f"Selecting date: {selected_date}")
    client.sessions.act(
        id=session_id,
        input="Click the date picker or calendar",
    )

    date_parts = selected_date.split("-")
    if len(date_parts) != 3:
        raise ValueError(f"Invalid date format: {selected_date}. Expected YYYY-MM-DD")

    day_number = int(date_parts[2])
    if day_number < 1 or day_number > 31:
        raise ValueError(f"Invalid day number: {day_number} from date: {selected_date}")

    print(f"Looking for day number: {day_number} in calendar")
    client.sessions.act(
        id=session_id,
        input=f"Click on the number {day_number} in the calendar",
    )

    print(f"Selecting time of day: {time_of_day}")
    client.sessions.act(
        id=session_id,
        input="Click the time filter or time selection dropdown",
    )
    client.sessions.act(
        id=session_id,
        input=f"Select {time_of_day} time period",
    )
    client.sessions.act(id=session_id, input="Click the Done button")

    client.sessions.act(
        id=session_id,
        input="Click Available Only button",
    )
    client.sessions.act(
        id=session_id,
        input="Click All Facilities dropdown list",
    )
    client.sessions.act(
        id=session_id,
        input="Select Accept Reservations checkbox",
    )
    client.sessions.act(id=session_id, input="Click the Done button")


def check_and_extract_courts(client, session_id: str, time_of_day: str) -> None:
    print("Checking for available courts...")

    # Inline schema to avoid $ref issues with nested models
    court_data_schema = {
        "type": "object",
        "properties": {
            "courts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "the name or identifier of the court",
                        },
                        "opening_times": {
                            "type": "string",
                            "description": "the opening hours or operating times of the court",
                        },
                        "location": {
                            "type": "string",
                            "description": "the location or facility name",
                        },
                        "availability": {
                            "type": "string",
                            "description": "availability status or any restrictions",
                        },
                        "duration": {
                            "type": "string",
                            "description": "the duration of the court session in minutes",
                        },
                    },
                    "required": ["name", "opening_times", "location", "availability"],
                },
            }
        },
        "required": ["courts"],
    }

    observe_response = client.sessions.observe(
        id=session_id,
        instruction="Find all available court booking slots, time slots, or court reservation options",
    )
    available_courts = observe_response.data.results or []
    print(f"Found {len(available_courts)} available court options")

    extract_response = client.sessions.extract(
        id=session_id,
        instruction="Extract all available court booking information including court names, time slots, locations, and any other relevant details",
        schema=court_data_schema,
    )
    court_data = extract_response.data.result

    courts = court_data.get("courts", [])
    has_available_courts = any(
        "no free spots" not in court.get("availability", "").lower()
        and "unavailable" not in court.get("availability", "").lower()
        and "next available" not in court.get("availability", "").lower()
        and "the next available reservation" not in court.get("availability", "").lower()
        for court in courts
    )

    if len(available_courts) == 0 or not has_available_courts:
        print("No courts available for selected time. Trying different time periods...")

        alternative_times = (
            ["Afternoon", "Evening"]
            if time_of_day == "Morning"
            else ["Morning", "Evening"]
            if time_of_day == "Afternoon"
            else ["Morning", "Afternoon"]
        )

        for alt_time in alternative_times:
            print(f"Trying {alt_time} time period...")

            client.sessions.act(
                id=session_id,
                input=f'Click the time filter dropdown that currently shows "{time_of_day}"',
            )
            client.sessions.act(
                id=session_id,
                input=f"Select {alt_time} from the time period options",
            )
            client.sessions.act(
                id=session_id,
                input="Click the Done button",
            )

            alt_observe_response = client.sessions.observe(
                id=session_id,
                instruction="Find all available court booking slots, time slots, or court reservation options",
            )
            alt_available_courts = alt_observe_response.data.results or []
            print(f"Found {len(alt_available_courts)} available court options for {alt_time}")

            if len(alt_available_courts) > 0:
                alt_extract_response = client.sessions.extract(
                    id=session_id,
                    instruction="Extract all available court booking information including court names, time slots, locations, and any other relevant details",
                    schema=court_data_schema,
                )
                alt_court_data = alt_extract_response.data.result
                alt_courts = alt_court_data.get("courts", [])

                has_alt_available_courts = any(
                    "no free spots" not in court.get("availability", "").lower()
                    and "unavailable" not in court.get("availability", "").lower()
                    and "next available" not in court.get("availability", "").lower()
                    and "the next available reservation"
                    not in court.get("availability", "").lower()
                    for court in alt_courts
                )

                if has_alt_available_courts:
                    print(f"Found actually available courts for {alt_time}!")
                    courts = alt_courts
                    has_available_courts = True
                    break

    if not has_available_courts:
        print("Extracting final court information...")
        final_extract_response = client.sessions.extract(
            id=session_id,
            instruction="Extract all available court booking information including court names, time slots, locations, and any other relevant details",
            schema=court_data_schema,
        )
        courts = final_extract_response.data.result.get("courts", [])

    print("Available Courts:")
    if courts and len(courts) > 0:
        for index, court in enumerate(courts):
            print(f"{index + 1}. {court.get('name', 'Unknown')}")
            print(f"   Opening Times: {court.get('opening_times', 'N/A')}")
            print(f"   Location: {court.get('location', 'N/A')}")
            print(f"   Availability: {court.get('availability', 'N/A')}")
            if court.get("duration"):
                print(f"   Duration: {court.get('duration')} minutes")
            print("")
    else:
        print("No court data available to display")


def book_court(client, session_id: str) -> None:
    print("Starting court booking process...")

    class Confirmation(BaseModel):
        confirmation_message: str | None = Field(
            None, description="any confirmation or success message"
        )
        booking_details: str | None = Field(
            None, description="booking details like time, court, etc."
        )
        error_message: str | None = Field(None, description="any error message if booking failed")

    try:
        print("Clicking the top available time slot...")
        client.sessions.act(
            id=session_id,
            input="Click the first available time slot or court booking option",
        )

        print("Opening participant dropdown...")
        client.sessions.act(
            id=session_id,
            input="Click the participant dropdown menu or select participant field",
        )
        client.sessions.act(
            id=session_id,
            input="Click the only named participant in the dropdown!",
        )

        print("Clicking the book button to complete reservation...")
        client.sessions.act(
            id=session_id,
            input="Click the book, reserve, or confirm booking button",
        )
        client.sessions.act(
            id=session_id,
            input="Click the Send Code Button",
        )

        def validate_code(text):
            if not text.strip():
                raise ValueError("Please enter a verification code")
            return True

        verification_code = inquirer.text(
            message="Please enter the verification code you received:",
            validate=validate_code,
        ).execute()

        print(f"Verification code: {verification_code}")

        client.sessions.act(
            id=session_id,
            input=f'Fill in the verification code field with "{verification_code}"',
        )
        client.sessions.act(
            id=session_id,
            input="Click the confirm button",
        )

        print("Checking for booking confirmation...")
        confirm_response = client.sessions.extract(
            id=session_id,
            instruction="Extract any booking confirmation message, success notification, or reservation details",
            schema=Confirmation.model_json_schema(),
        )
        confirmation = confirm_response.data.result

        if confirmation.get("confirmation_message") or confirmation.get("booking_details"):
            print("Booking Confirmed!")
            if confirmation.get("confirmation_message"):
                print(f"{confirmation.get('confirmation_message')}")
            if confirmation.get("booking_details"):
                print(f"{confirmation.get('booking_details')}")

        if confirmation.get("error_message"):
            print("Booking Error:")
            print(confirmation.get("error_message"))

    except Exception as error:
        print(f"Error during court booking: {error}")
        raise error


def select_activity() -> str:
    activity = inquirer.select(
        message="Please select an activity:",
        choices=[
            {"name": "Tennis", "value": "Tennis"},
            {"name": "Pickleball", "value": "Pickleball"},
        ],
        default="Tennis",
    ).execute()

    print(f"Selected: {activity}")
    return activity


def select_time_of_day() -> str:
    time_of_day = inquirer.select(
        message="Please select the time of day:",
        choices=[
            {"name": "Morning (Before 12 PM)", "value": "Morning"},
            {"name": "Afternoon (After 12 PM)", "value": "Afternoon"},
            {"name": "Evening (After 5 PM)", "value": "Evening"},
        ],
        default="Morning",
    ).execute()

    print(f"Selected: {time_of_day}")
    return time_of_day


def select_date() -> str:
    today = datetime.now()
    date_options = []

    for i in range(7):
        date = today + timedelta(days=i)
        day_name = date.strftime("%A")
        month_day = date.strftime("%b %-d")
        full_date = date.strftime("%Y-%m-%d")

        display_name = f"{day_name}, {month_day} (Today)" if i == 0 else f"{day_name}, {month_day}"
        date_options.append({"name": display_name, "value": full_date})

    selected_date = inquirer.select(
        message="Please select a date:", choices=date_options, default=date_options[0]["value"]
    ).execute()

    selected_date_obj = datetime.strptime(selected_date, "%Y-%m-%d")
    display_date = selected_date_obj.strftime("%A, %B %-d, %Y")

    print(f"Selected: {display_date}")
    return selected_date


def book_tennis_paddle_court():
    print("Starting tennis/paddle court booking automation in SF...")

    email = os.environ.get("SF_REC_PARK_EMAIL")
    password = os.environ.get("SF_REC_PARK_PASSWORD")

    if not email or not password:
        raise ValueError("Missing SF_REC_PARK_EMAIL or SF_REC_PARK_PASSWORD environment variables")

    activity = select_activity()
    selected_date = select_date()
    time_of_day = select_time_of_day()

    print(f"Booking {activity} courts in San Francisco for {time_of_day} on {selected_date}...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation
    print("Initializing Stagehand with Browserbase")
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

    try:
        print("Browserbase Session Started")
        print(f"Watch live: https://browserbase.com/sessions/{session_id}")

        # Connect to the browser via CDP
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com?apiKey={os.environ['BROWSERBASE_API_KEY']}&sessionId={session_id}"
            )
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            print("Navigating to court booking site...")
            page.goto(
                "https://www.rec.us/organizations/san-francisco-rec-park",
                wait_until="domcontentloaded",
                timeout=60000,
            )

            login_to_site(client, session_id, email, password)
            select_filters(client, session_id, activity, time_of_day, selected_date)
            check_and_extract_courts(client, session_id, time_of_day)
            book_court(client, session_id)

            browser.close()

        client.sessions.end(id=session_id)
        print("\nBrowser session closed")

    except Exception as error:
        print(f"Error during court booking: {error}")
        client.sessions.end(id=session_id)
        raise error


def main():
    print("Welcome to SF Court Booking Automation!")
    print("")
    print("This tool automates tennis and pickleball court bookings in San Francisco.")
    print("Here's what we'll do:")
    print("")
    print("1. Navigate to https://www.rec.us/organizations/san-francisco-rec-park")
    print("2. Use automated login with your credentials")
    print("3. Select your preferred activity, date, and time")
    print("4. Find and book available courts automatically")
    print("5. Handle verification codes and confirmation")
    print("")

    try:
        book_tennis_paddle_court()
        print("Court booking completed successfully!")
        print("Your court has been reserved. Check your email for confirmation details.")
    except Exception as error:
        print("Failed to complete court booking")
        print(f"Error: {error}")
        exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Application error: {err}")
        exit(1)
