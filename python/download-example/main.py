# Stagehand + Browserbase: Download Apple's Quarterly Financial Statements - See README.md for full documentation

import os
import asyncio
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from browserbase import Browserbase

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, GOOGLE_API_KEY
load_dotenv()


async def save_downloads_with_retry(
    bb: Browserbase,
    session_id: str,
    retry_for_seconds: int = 30
) -> int:
    """
    Polls Browserbase API for downloads with timeout handling.
    
    Browserbase stores downloaded files during a session and makes them available
    via API. Files may take a few seconds to process, so this function implements
    retry logic to wait for downloads to be ready before retrieving them.
    
    Args:
        bb: Browserbase client instance for API calls
        session_id: The Browserbase session ID to retrieve downloads from
        retry_for_seconds: Maximum time to wait for downloads (default: 30 seconds)
    
    Returns:
        int: The size of the downloaded ZIP file in bytes
    
    Raises:
        TimeoutError: If downloads aren't ready within the specified timeout
    """
    print(f"Waiting up to {retry_for_seconds} seconds for downloads to complete...")
    
    # Track elapsed time to implement timeout without using threading timers
    start_time = asyncio.get_event_loop().time()
    timeout = retry_for_seconds
    
    while True:
        elapsed = asyncio.get_event_loop().time() - start_time
        
        # Check if we've exceeded the timeout period
        if elapsed >= timeout:
            raise TimeoutError("Download timeout exceeded")
        
        try:
            print("Checking for downloads...")
            # Use asyncio.to_thread for synchronous Browserbase SDK calls
            # This prevents blocking the event loop while waiting for API responses
            response = await asyncio.to_thread(
                bb.sessions.downloads.list,
                session_id
            )
            download_buffer = await asyncio.to_thread(response.read)
            
            # Check if downloads are ready (non-empty buffer indicates files are available)
            if len(download_buffer) > 0:
                print(f"Downloads ready! File size: {len(download_buffer)} bytes")
                
                # Save the ZIP file containing all downloaded PDFs to disk
                with open('downloaded_files.zip', 'wb') as f:
                    f.write(download_buffer)
                print("Files saved as: downloaded_files.zip")
                return len(download_buffer)
            else:
                print("Downloads not ready yet, retrying...")
        except Exception as e:
            print(f'Error fetching downloads: {e}')
            raise
        
        # Poll every 2 seconds to check if downloads are ready
        # This interval balances responsiveness with API rate limits
        await asyncio.sleep(2)


async def main():
    """
    Main application entry point.
    
    Orchestrates the entire PDF download automation process:
    1. Initializes Browserbase and Stagehand clients
    2. Navigates to Apple's investor relations site
    3. Locates and clicks quarterly financial statement links
    4. Waits for downloads to process and saves them as a ZIP file
    """
    print("Starting Apple Financial Statements Download Automation...")
    
    # Initialize Browserbase client for session management and downloads API
    print("Initializing Browserbase client...")
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))
    
    # Initialize Stagehand with Browserbase for cloud-based browser automation
    # Stagehand provides natural language browser control (act, extract, observe)
    config = StagehandConfig(
        env="BROWSERBASE",  # Use Browserbase's cloud infrastructure instead of local browsers
        api_key=os.environ.get("BROWSERBASE_API_KEY"),
        project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash-preview-05-20",  # AI model for interpreting natural language actions
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
        verbose=2,
        # Logging levels: 0 = errors only, 1 = info, 2 = debug 
        # When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs
        # https://docs.stagehand.dev/configuration/logging
    )
    
    try:
        # Initialize browser session to start automation
        # Using context manager ensures proper cleanup even if errors occur
        async with Stagehand(config) as stagehand:
            print("Stagehand initialized successfully!")
            page = stagehand.page
            
            # Display live view URL for debugging and monitoring
            # Live view allows real-time observation of browser automation
            live_view_links = bb.sessions.debug(stagehand.session_id)
            live_view_link = live_view_links.debuggerFullscreenUrl
            print(f"🔍 Live View Link: {live_view_link}")
            
            # Navigate to Apple homepage with extended timeout for slow-loading sites
            print("Navigating to Apple.com...")
            await page.goto("https://www.apple.com/", timeout=60000)
            
            # Navigate to investor relations section using natural language actions
            # act() uses AI to interpret instructions and perform browser interactions
            print("Navigating to Investors section...")
            await page.act("Click the 'Investors' button at the bottom of the page")
            await page.act("Scroll down to the Financial Data section of the page")
            await page.act("Under Quarterly Earnings Reports, click on '2025'")
            
            # Download all quarterly financial statements
            # When a URL of a PDF is opened, Browserbase automatically downloads and stores the PDF
            # Files are captured in the session and can be retrieved via the downloads API
            # See https://docs.browserbase.com/features/screenshots#pdfs for more info
            print("Downloading quarterly financial statements...")
            await page.act("Click the 'Financial Statements' link under Q4")
            await page.act("Click the 'Financial Statements' link under Q3")
            await page.act("Click the 'Financial Statements' link under Q2")
            await page.act("Click the 'Financial Statements' link under Q1")
            
            # Retrieve all downloads triggered during this session from Browserbase API
            # Files take time to process, so we poll with retry logic (45 second timeout)
            print("Retrieving downloads from Browserbase...")
            await save_downloads_with_retry(bb, stagehand.session_id, 45)
            print("All downloads completed successfully!")
            
            # Print history if available in Stagehand v2
            # History shows all actions taken during the session for debugging
            if hasattr(stagehand, 'history'):
                print("\nStagehand History:")
                print(stagehand.history)
        
        # Context manager automatically closes the session and cleans up resources
        print("Session closed successfully")
        
    except Exception as error:
        print(f"Error during automation: {error}")
        raise


if __name__ == "__main__":
    # Entry point for script execution
    # asyncio.run() creates event loop and runs main() coroutine until completion
    try:
        asyncio.run(main())
    except Exception as err:
        # Handle any uncaught exceptions and provide helpful debugging information
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify internet connection and Apple website accessibility")
        print("  - Ensure sufficient timeout for slow-loading pages")
        print("Docs: https://docs.stagehand.dev/v2/first-steps/introduction")
        exit(1)

