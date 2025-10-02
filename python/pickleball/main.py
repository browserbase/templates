# SF Court Booking Automation - See README.md for full documentation
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from InquirerPy import inquirer
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()


async def login_to_site(page, email: str, password: str) -> None:
    print("Logging in...")
    # Perform login sequence: each step is atomic to handle dynamic page changes.
    await page.act("Click the Login button")
    await page.act(f"Fill in the email or username field with \"{email}\"")
    await page.act("Click the next, continue, or submit button to proceed")
    await page.act(f"Fill in the password field with \"{password}\"")
    await page.act("Click the login, sign in, or submit button")
    print("Logged in")


async def select_filters(page, activity: str, time_of_day: str, selected_date: str) -> None:
    print("Selecting the activity")
    # Filter by activity type first to narrow down available courts.
    await page.act("Click the activites drop down menu")
    await page.act(f"Select the {activity} activity")
    await page.act("Click the Done button")
    
    print(f"Selecting date: {selected_date}")
    # Open calendar to select specific date for court booking.
    await page.act("Click the date picker or calendar")
    
    # Parse date string to extract day number for calendar selection.
    date_parts = selected_date.split('-')
    if len(date_parts) != 3:
        raise ValueError(f"Invalid date format: {selected_date}. Expected YYYY-MM-DD")
    
    day_number = int(date_parts[2])
    if day_number < 1 or day_number > 31:
        raise ValueError(f"Invalid day number: {day_number} from date: {selected_date}")
    
    print(f"Looking for day number: {day_number} in calendar")
    # Click specific day number in calendar to select date.
    await page.act(f"Click on the number {day_number} in the calendar")
    
    print(f"Selecting time of day: {time_of_day}")
    # Filter by time period to find courts available during preferred hours.
    await page.act("Click the time filter or time selection dropdown")
    await page.act(f"Select {time_of_day} time period")
    await page.act("Click the Done button")
    
    # Apply additional filters to show only available courts that accept reservations.
    await page.act("Click Available Only button")
    await page.act("Click All Facilities dropdown list")
    await page.act("Select Accept Reservations checkbox")
    await page.act("Click the Done button")


async def check_and_extract_courts(page, time_of_day: str) -> None:
    print("Checking for available courts...")
    
    # First observe the page to find all available court booking options.
    available_courts = await page.observe("Find all available court booking slots, time slots, or court reservation options")
    print(f"Found {len(available_courts)} available court options")
    
    # Define schema using Pydantic
    class Court(BaseModel):
        name: str = Field(..., description="the name or identifier of the court")
        opening_times: str = Field(..., description="the opening hours or operating times of the court")
        location: str = Field(..., description="the location or facility name")
        availability: str = Field(..., description="availability status or any restrictions")
        duration: Optional[str] = Field(None, description="the duration of the court session in minutes")
    
    class CourtData(BaseModel):
        courts: List[Court]
    
    # Extract structured court data using Pydantic schema for type safety and validation.
    court_data = await page.extract(
        "Extract all available court booking information including court names, time slots, locations, and any other relevant details",
        schema=CourtData
    )
    
    # Check if any courts are actually available by filtering out unavailable status messages.
    has_available_courts = any(
        'no free spots' not in court.availability.lower() and
        'unavailable' not in court.availability.lower() and
        'next available' not in court.availability.lower() and
        'the next available reservation' not in court.availability.lower()
        for court in court_data.courts
    )
    
    # If no courts available for selected time, try alternative time periods as fallback.
    if len(available_courts) == 0 or not has_available_courts:
        print("No courts available for selected time. Trying different time periods...")
        
        # Generate alternative time periods to try if original selection has no availability.
        alternative_times = ['Afternoon', 'Evening'] if time_of_day == 'Morning' else \
                           ['Morning', 'Evening'] if time_of_day == 'Afternoon' else \
                           ['Morning', 'Afternoon']
        
        for alt_time in alternative_times:
            print(f"Trying {alt_time} time period...")
            
            # Change time filter to alternative time period and check availability.
            await page.act(f"Click the time filter dropdown that currently shows \"{time_of_day}\"")
            await page.act(f"Select {alt_time} from the time period options")
            await page.act("Click the Done button")
            
            alt_available_courts = await page.observe("Find all available court booking slots, time slots, or court reservation options")
            print(f"Found {len(alt_available_courts)} available court options for {alt_time}")
            
            if len(alt_available_courts) > 0:
                alt_court_data = await page.extract(
                    "Extract all available court booking information including court names, time slots, locations, and any other relevant details",
                    schema=CourtData
                )
                
                has_alt_available_courts = any(
                    'no free spots' not in court.availability.lower() and
                    'unavailable' not in court.availability.lower() and
                    'next available' not in court.availability.lower() and
                    'the next available reservation' not in court.availability.lower()
                    for court in alt_court_data.courts
                )
                
                # If alternative time has available courts, use that data and stop searching.
                if has_alt_available_courts:
                    print(f"Found actually available courts for {alt_time}!")
                    court_data.courts = alt_court_data.courts
                    has_available_courts = True
                    break
    
    # If still no available courts found, extract final court data for display.
    if not has_available_courts:
        print("Extracting final court information...")
        final_court_data = await page.extract(
            "Extract all available court booking information including court names, time slots, locations, and any other relevant details",
            schema=CourtData
        )
        court_data.courts = final_court_data.courts
    
    # Display all found court information to user for review and selection.
    print("Available Courts:")
    if court_data.courts and len(court_data.courts) > 0:
        for index, court in enumerate(court_data.courts):
            print(f"{index + 1}. {court.name}")
            print(f"   Opening Times: {court.opening_times}")
            print(f"   Location: {court.location}")
            print(f"   Availability: {court.availability}")
            if court.duration:
                print(f"   Duration: {court.duration} minutes")
            print("")
    else:
        print("No court data available to display")


async def book_court(page) -> None:
    print("Starting court booking process...")
    
    try:
        # Select the first available court time slot for booking.
        print("Clicking the top available time slot...")
        await page.act("Click the first available time slot or court booking option")
        
        # Select participant from dropdown - assumes only one participant is available.
        print("Opening participant dropdown...")
        await page.act("Click the participant dropdown menu or select participant field")
        await page.act("Click the only named participant in the dropdown!")
        
        # Complete booking process and trigger verification code request.
        print("Clicking the book button to complete reservation...")
        await page.act("Click the book, reserve, or confirm booking button")
        await page.act("Click the Send Code Button")
        
        # Prompt user for verification code received via SMS/email for booking confirmation.
        def validate_code(text):
            if not text.strip():
                raise ValueError("Please enter a verification code")
            return True
        
        def get_verification_code():
            return inquirer.text(
                message="Please enter the verification code you received:",
                validate=validate_code,
            ).execute()
        
        verification_code = await asyncio.to_thread(get_verification_code)
        
        print(f"Verification code: {verification_code}")
        
        # Enter verification code and confirm booking to complete reservation.
        await page.act(f"Fill in the verification code field with \"{verification_code}\"")
        await page.act("Click the confirm button")
        
        # Define schema using Pydantic
        class Confirmation(BaseModel):
            confirmation_message: Optional[str] = Field(None, description="any confirmation or success message")
            booking_details: Optional[str] = Field(None, description="booking details like time, court, etc.")
            error_message: Optional[str] = Field(None, description="any error message if booking failed")
        
        # Extract booking confirmation details to verify successful reservation.
        print("Checking for booking confirmation...")
        confirmation = await page.extract(
            "Extract any booking confirmation message, success notification, or reservation details",
            schema=Confirmation
        )
        
        # Display confirmation details if booking was successful.
        if confirmation.confirmation_message or confirmation.booking_details:
            print("Booking Confirmed!")
            if confirmation.confirmation_message:
                print(f"{confirmation.confirmation_message}")
            if confirmation.booking_details:
                print(f"{confirmation.booking_details}")
        
        # Display error message if booking failed.
        if confirmation.error_message:
            print("Booking Error:")
            print(confirmation.error_message)
        
    except Exception as error:
        print(f"Error during court booking: {error}")
        raise error


async def select_activity() -> str:
    # Prompt user to select between Tennis and Pickleball activities.
    def get_activity():
        return inquirer.select(
            message="Please select an activity:",
            choices=[
                {"name": "Tennis", "value": "Tennis"},
                {"name": "Pickleball", "value": "Pickleball"}
            ],
            default="Tennis"
        ).execute()
    
    activity = await asyncio.to_thread(get_activity)

    print(f"Selected: {activity}")
    return activity


async def select_time_of_day() -> str:
    # Prompt user to select preferred time period for court booking.
    def get_time_of_day():
        return inquirer.select(
            message="Please select the time of day:",
            choices=[
                {"name": "Morning (Before 12 PM)", "value": "Morning"},
                {"name": "Afternoon (After 12 PM)", "value": "Afternoon"},
                {"name": "Evening (After 5 PM)", "value": "Evening"}
            ],
            default="Morning"
        ).execute()
    
    time_of_day = await asyncio.to_thread(get_time_of_day)

    print(f"Selected: {time_of_day}")
    return time_of_day


async def select_date() -> str:
    # Generate date options for the next 7 days including today.
    today = datetime.now()
    date_options = []
    
    for i in range(7):
        date = today + timedelta(days=i)
        
        day_name = date.strftime('%A')
        month_day = date.strftime('%b %-d')
        full_date = date.strftime('%Y-%m-%d')
        
        display_name = f"{day_name}, {month_day} (Today)" if i == 0 else f"{day_name}, {month_day}"
        
        date_options.append({
            "name": display_name,
            "value": full_date
        })

    # Prompt user to select from available date options.
    def get_date():
        return inquirer.select(
            message="Please select a date:",
            choices=date_options,
            default=date_options[0]["value"]
        ).execute()
    
    selected_date = await asyncio.to_thread(get_date)

    # Format selected date for display and return ISO date string.
    selected_date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
    display_date = selected_date_obj.strftime('%A, %B %-d, %Y')
    
    print(f"Selected: {display_date}")
    return selected_date


async def book_tennis_paddle_court():
    print("Starting tennis/paddle court booking automation in SF...")

    # Load credentials from environment variables for SF Rec & Parks login.
    email = os.environ.get("SF_REC_PARK_EMAIL")
    password = os.environ.get("SF_REC_PARK_PASSWORD")
    debug_mode = os.environ.get("DEBUG") == "true"
    
    # Collect user preferences for activity, date, and time selection.
    activity = await select_activity()
    selected_date = await select_date()
    time_of_day = await select_time_of_day()
    
    print(f"Booking {activity} courts in San Francisco for {time_of_day} on {selected_date}...")

    # Validate that required credentials are available before proceeding.
    if not email or not password:
        raise ValueError("Missing SF_REC_PARK_EMAIL or SF_REC_PARK_PASSWORD environment variables")

    # Initialize Stagehand with Browserbase for AI-powered browser automation.
    print("Initializing Stagehand with Browserbase")
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        verbose=1,
        # 0 = errors only, 1 = info, 2 = debug 
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        # https://docs.stagehand.dev/configuration/logging
        model_name="openai/gpt-4.1",
        model_api_key=os.environ.get("OPENAI_API_KEY"),
        browserbase_session_create_params={
            "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
            "timeout": 900,
            "region": "us-west-2"
        }
    )

    try:
        # Start browser session and connect to SF Rec & Parks booking system.
        async with Stagehand(config) as stagehand:
            print("Browserbase Session Started")
            session_id = None
            if hasattr(stagehand, 'session_id'):
                session_id = stagehand.session_id
            elif hasattr(stagehand, 'browserbase_session_id'):
                session_id = stagehand.browserbase_session_id
            
            if session_id:
                print(f"Watch live: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            # Navigate to SF Rec & Parks booking site with extended timeout for slow loading.
            print("Navigating to court booking site...")
            await page.goto(
                "https://www.rec.us/organizations/san-francisco-rec-park",
                wait_until='domcontentloaded',
                timeout=60000
            )

            # Execute booking workflow: login, filter, find courts, and complete booking.
            await login_to_site(page, email, password)
            await select_filters(page, activity, time_of_day, selected_date)
            await check_and_extract_courts(page, time_of_day)
            await book_court(page)
        
        print("\nBrowser session closed")

    except Exception as error:
        print(f"Error during court booking: {error}")
        raise error


async def main():
    # Display welcome message and explain the automation workflow to user.
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
        # Execute the complete court booking automation workflow.
        await book_tennis_paddle_court()
        
        print("Court booking completed successfully!")
        print("Your court has been reserved. Check your email for confirmation details.")
    except Exception as error:
        print("Failed to complete court booking")
        print(f"Error: {error}")
        exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Check your environment variables and internet connection")
        exit(1)

