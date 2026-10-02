# Human-in-the-Loop Approval Workflow - See README.md for full documentation

import os
import threading

from browserbase import Browserbase
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field
from stagehand import Stagehand

load_dotenv()

bb = Browserbase(api_key=os.environ.get("BROWSERBASE_API_KEY"))

# ============= CONFIGURATION =============
# Adjust these thresholds to control when human approval is required.
# With the default BOOK_URL below, the price rule always triggers (£51.77 > £20).
PRICE_THRESHOLD = 20.00  # Pause if price exceeds this (site uses £)
RATING_THRESHOLD = 3  # Pause if rating is strictly below this (out of 5)
BOOK_URL = "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"
APPROVAL_TIMEOUT_SECS = 120  # 2 minutes
# =========================================


class BookDetails(BaseModel):
    title: str = Field(description="The book title")
    price: float = Field(description="The price as a decimal number, without the currency symbol")
    rating: int = Field(description="The star rating as a whole number from 1 to 5", ge=1, le=5)
    availability: str = Field(description="Stock availability status")


def wait_for_human_decision(session_id: str, book: BookDetails) -> str:
    """
    Pause the workflow and wait for a human approve/reject decision.
    Prints a live Browserbase session URL so the human can watch the browser in real time.
    Returns "approved", "rejected", or "timeout".
    Uses a daemon thread so the 2-minute timeout can interrupt blocking input().
    """
    print("\n" + "=" * 62)
    print("  WORKFLOW PAUSED — HUMAN DECISION REQUIRED")
    print("=" * 62)
    print(f"\nLive browser: https://browserbase.com/sessions/{session_id}")
    print("\nProduct details:")
    print(f"  Title:        {book.title}")
    print(f"  Price:        £{book.price:.2f}")
    print(f"  Rating:       {book.rating}/5 stars")
    print(f"  Availability: {book.availability}")
    print("\nReview the details above, then decide whether to proceed.")
    print("(Auto-rejects in 2 minutes if no input received.)\n")

    result = [None]

    def ask():
        while True:
            try:
                answer = input('Type "approve" or "reject" and press Enter: ').strip().lower()
            except EOFError:
                return
            if answer == "approve":
                result[0] = "approved"
                return
            elif answer == "reject":
                result[0] = "rejected"
                return
            else:
                print('  Please type exactly "approve" or "reject".')

    thread = threading.Thread(target=ask, daemon=True)
    thread.start()
    thread.join(APPROVAL_TIMEOUT_SECS)

    if thread.is_alive():
        print()  # newline after dangling prompt
        return "timeout"
    return result[0]


def evaluate_purchase_rules(book: BookDetails) -> tuple[bool, list[str]]:
    """Return (should_pause, reasons) based on configurable thresholds."""
    reasons = []
    if book.price > PRICE_THRESHOLD:
        reasons.append(
            f"Price £{book.price:.2f} exceeds threshold £{PRICE_THRESHOLD:.2f}"
        )
    if book.rating < RATING_THRESHOLD:
        reasons.append(
            f"Rating {book.rating}/5 is below threshold {RATING_THRESHOLD}/5"
        )
    return bool(reasons), reasons


def main():
    print("Starting Human-in-the-Loop Purchase Approval Demo...")

    if not os.environ.get("BROWSERBASE_API_KEY") or not os.environ.get("BROWSERBASE_PROJECT_ID"):
        print("\nError: Missing Browserbase credentials")
        print("  Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env")
        exit(1)

    # Create a Browserbase session
    session = bb.sessions.create()
    session_id = session.id
    print(f"\nWatch live: https://browserbase.com/sessions/{session_id}")

    # Initialize the Stagehand client for AI-powered act/extract
    client = Stagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=os.environ.get("OPENAI_API_KEY"),
    )

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.browserbase.com"
                f"?apiKey={os.environ['BROWSERBASE_API_KEY']}"
                f"&sessionId={session_id}"
            )
            ctx = browser.contexts[0]
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            # Step 1: Navigate to the product page
            print("\nNavigating to product page...")
            page.goto(BOOK_URL, wait_until="domcontentloaded")

            # Step 2: Extract product details using AI
            print("Extracting product details...")
            extract_response = client.sessions.extract(
                id=session_id,
                instruction=(
                    "Extract the book title, price as a decimal number without the currency symbol, "
                    "star rating as a whole number from 1 to 5, and stock availability status."
                ),
                schema=BookDetails.model_json_schema(),
            )
            book = BookDetails(**extract_response.data.result)
            print(f'Found: "{book.title}" at £{book.price:.2f}, {book.rating}/5 stars')

            # Step 3: Evaluate purchase rules
            should_pause, reasons = evaluate_purchase_rules(book)

            if not should_pause:
                # Auto-approve path: rules not triggered
                print("\nPurchase rules not triggered — auto-approving.")
                print("Adding to basket...")
                client.sessions.act(
                    id=session_id,
                    input="Click the Add to basket button",
                )
                print("Item added to basket successfully.")
            else:
                # Step 4: Pause for human decision
                print("\nPurchase rules triggered:")
                for reason in reasons:
                    print(f"  - {reason}")

                decision = wait_for_human_decision(session_id, book)

                if decision == "approved":
                    print("\nApproved — proceeding with purchase...")
                    client.sessions.act(
                        id=session_id,
                        input="Click the Add to basket button",
                    )
                    print("Item added to basket successfully.")
                elif decision == "rejected":
                    print("\nRejected — aborting purchase workflow.")
                else:
                    print(
                        "\nTimeout — no response received within 2 minutes. Auto-rejecting."
                    )

            print("\n" + "=" * 62)
            print("  Workflow complete.")
            print("=" * 62)

            browser.close()

    except Exception as error:
        print(f"\nError: {error}")
        raise
    finally:
        client.sessions.end(id=session_id)
        print("Session closed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(f"Application error: {err}")
        print("\nTroubleshooting:")
        print("  - Ensure .env has BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and OPENAI_API_KEY")
        print("  - Docs: https://docs.stagehand.dev")
        exit(1)
