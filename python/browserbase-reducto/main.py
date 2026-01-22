# Stagehand + Browserbase: Download Apple's Q4 Financial Statement and Parse with Reducto
# See README.md for full documentation

import asyncio
import os
import zipfile
from pathlib import Path

from browserbase import Browserbase
from dotenv import load_dotenv
from reducto import Reducto
from stagehand import AsyncStagehand

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, REDUCTOAI_API_KEY, GOOGLE_API_KEY
load_dotenv()


# Polls Browserbase API for completed downloads with retry logic
async def save_downloads_with_retry(
    bb: Browserbase, session_id: str, retry_for_seconds: int = 30
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
            # Fetch downloads from Browserbase API and save to disk when ready
            # Use asyncio.to_thread for synchronous Browserbase SDK calls
            # This prevents blocking the event loop while waiting for API responses
            response = await asyncio.to_thread(bb.sessions.downloads.list, session_id)
            download_buffer = await asyncio.to_thread(response.read)

            # Save downloads to disk when file size indicates content is available
            # Empty zip files are ~22 bytes, so require at least 100 bytes for real content
            if len(download_buffer) > 100:
                print(f"Downloads ready! File size: {len(download_buffer)} bytes")
                # Save the ZIP file containing all downloaded PDFs to disk
                with open("downloaded_files.zip", "wb") as f:
                    f.write(download_buffer)
                print("Files saved as: downloaded_files.zip")
                return len(download_buffer)
            else:
                print("Downloads not ready yet, retrying...")
        except Exception as e:
            error_message = str(e)
            # Handle session not found errors gracefully (session may have expired)
            if "Session with given id not found" in error_message or "-32001" in error_message:
                print("Session not found, returning empty result")
                return 0
            print(f"Error fetching downloads: {e}")
            raise

        # Poll every 2 seconds to check if downloads are ready
        await asyncio.sleep(2)


# Extracts PDF files from downloaded zip archive
def extract_pdf_from_zip(zip_path: str, output_dir: str = "downloaded_files") -> str:
    """
    Extract PDF files from a ZIP archive.

    Args:
        zip_path: Path to the ZIP file containing PDFs
        output_dir: Directory to extract PDFs to (default: "downloaded_files")

    Returns:
        str: Path to the first extracted PDF file

    Raises:
        FileNotFoundError: If ZIP file doesn't exist
        ValueError: If no PDF files are found in the ZIP
    """
    print(f"Extracting PDF from {zip_path}...")

    # Create output directory if it doesn't exist
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    pdf_path = None

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        # Open zip file and filter for PDF entries only
        pdf_entries = [entry for entry in zip_ref.namelist() if entry.lower().endswith(".pdf")]

        if len(pdf_entries) == 0:
            raise ValueError("No PDF files found in the downloaded zip")

        # Extract all PDF files and return path to first one
        for entry in pdf_entries:
            zip_ref.extract(entry, output_dir)
            extracted_path = output_path / entry
            print(f"Extracted: {extracted_path}")

            if pdf_path is None:
                pdf_path = str(extracted_path)

    if pdf_path is None:
        raise ValueError("Failed to extract PDF file")

    return pdf_path


# Uploads PDF to Reducto and extracts structured financial data
async def extract_pdf_with_reducto(pdf_path: str, reducto_client: Reducto) -> None:
    """
    Extract structured financial data from PDF using Reducto.

    Uploads the PDF to Reducto and extracts iPhone net sales data
    using a JSON schema definition.

    Args:
        pdf_path: Path to the PDF file to process
        reducto_client: Reducto client instance for API calls
    """
    print(f"\nExtracting financial data with Reducto: {pdf_path}...")

    # Upload PDF to Reducto for processing
    # Use asyncio.to_thread for synchronous SDK calls
    upload_response = await asyncio.to_thread(reducto_client.upload, file=Path(pdf_path))
    print(f"Uploaded to Reducto: {upload_response}")

    # Define JSON schema to extract iPhone net sales from financial statements
    schema = {
        "type": "object",
        "properties": {
            "iphone_net_sales": {
                "type": "object",
                "properties": {
                    "current_quarter": {
                        "type": "number",
                        "description": "iPhone net sales for the current quarter (in millions)",
                    },
                    "previous_quarter": {
                        "type": "number",
                        "description": "iPhone net sales for the previous quarter (in millions)",
                    },
                    "current_year": {
                        "type": "number",
                        "description": "iPhone net sales for the current year (in millions)",
                    },
                    "previous_year": {
                        "type": "number",
                        "description": "iPhone net sales for the previous year (in millions)",
                    },
                    "current_quarter_date": {
                        "type": "string",
                        "description": "Date or period label for the current quarter",
                    },
                    "previous_quarter_date": {
                        "type": "string",
                        "description": "Date or period label for the previous quarter",
                    },
                },
                "required": [
                    "current_quarter",
                    "previous_quarter",
                    "current_year",
                    "previous_year",
                    "current_quarter_date",
                    "previous_quarter_date",
                ],
                "description": "iPhone net sales values from the financial statements",
            }
        },
        "required": ["iphone_net_sales"],
    }

    # Configure extraction instructions
    instructions = {
        "schema": schema,
        "system_prompt": (
            "Extract the iPhone net sales values from the financial statements. "
            "Find the iPhone line item in the net sales by category table and extract "
            "the values for current quarter, previous quarter, current year, and previous year "
            "(typically shown in columns in the income statement or operations statement)."
        ),
    }

    # Configure extraction settings
    settings = {
        "optimize_for_latency": True,
        "citations": {"numerical_confidence": False},
    }

    # Extract structured data using Reducto's AI extraction with schema
    # Use asyncio.to_thread for synchronous SDK calls
    result = await asyncio.to_thread(
        reducto_client.extract.run,
        input=upload_response,
        instructions=instructions,
        settings=settings,
    )

    # Display extracted financial data in formatted JSON
    print("\n=== Extracted Financial Data ===\n")
    # Handle different possible response structures
    extracted_data = result
    if hasattr(result, "result"):
        extracted_data = result.result
    elif hasattr(result, "data"):
        extracted_data = result.data

    import json

    print(json.dumps(extracted_data, indent=2))


async def main():
    """
    Main application entry point.

    Orchestrates the entire PDF download and extraction automation process:
    1. Initializes Browserbase, Reducto, and Stagehand clients
    2. Navigates to Apple's investor relations site
    3. Downloads Q4 financial statement PDF
    4. Extracts PDF from ZIP archive
    5. Uploads PDF to Reducto and extracts structured financial data
    """
    print("Starting Apple Q4 Financial Statement Download and Parse Automation...")

    # Initialize Browserbase SDK for session management and download retrieval
    bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

    # Initialize Reducto AI client for PDF data extraction
    reducto_client = Reducto(api_key=os.environ.get("REDUCTOAI_API_KEY"))

    # Initialize AsyncStagehand client (v3 BYOB architecture)
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("GOOGLE_API_KEY"),
    )

    # Start a Stagehand session (returns a response with session_id)
    start_response = await client.sessions.start(model_name="google/gemini-2.5-pro")
    session_id = start_response.data.session_id
    print(f"Stagehand session started: {session_id}")

    try:
        # Get live view URL for monitoring browser session in real-time
        # Use asyncio.to_thread for synchronous SDK calls
        live_view_links = await asyncio.to_thread(bb.sessions.debug, session_id)
        live_view_link = live_view_links.debuggerFullscreenUrl
        print(f"Live View Link: {live_view_link}")

        # Navigate to Apple homepage using Stagehand
        print("Navigating to Apple.com...")
        await client.sessions.navigate(id=session_id, url="https://www.apple.com/")

        # Navigate to investor relations section using Stagehand AI actions
        print("Navigating to Investors section...")
        await client.sessions.act(
            id=session_id, input="Click the 'Investors' button at the bottom of the page"
        )
        await client.sessions.act(
            id=session_id, input="Scroll down to the Financial Data section of the page"
        )
        await client.sessions.act(
            id=session_id, input="Under Quarterly Earnings Reports, click on '2025'"
        )

        # Download Q4 quarterly financial statement
        # When a URL of a PDF is opened, Browserbase automatically downloads and stores the PDF
        # See https://docs.browserbase.com/features/downloads for more info
        print("Downloading Q4 financial statement...")
        await client.sessions.act(
            id=session_id, input="Click the 'Financial Statements' link under Q4"
        )

        # Wait for the PDF download to be triggered and processed
        print("Waiting for download to be triggered...")
        await asyncio.sleep(10)

        # Retrieve all downloads triggered during this session from Browserbase API
        print("Retrieving downloads from Browserbase...")
        await save_downloads_with_retry(bb, session_id, 60)
        print("Download completed successfully!")

        # Extract PDF from downloaded zip archive
        pdf_path = extract_pdf_from_zip("downloaded_files.zip")
        print(f"PDF extracted to: {pdf_path}")

        # Extract structured financial data using Reducto AI
        await extract_pdf_with_reducto(pdf_path, reducto_client)

    finally:
        # End the Stagehand session
        await client.sessions.end(id=session_id)
        print("Session closed successfully")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Common issues:")
        print(
            "  - Check .env file has BROWSERBASE_PROJECT_ID, "
            "BROWSERBASE_API_KEY, and REDUCTOAI_API_KEY"
        )
        print("  - Verify internet connection and Apple website accessibility")
        print("  - Ensure sufficient timeout for slow-loading pages")
        print("Docs: https://docs.stagehand.dev/reference/python/overview")
        exit(1)
