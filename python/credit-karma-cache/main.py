# Stagehand + Browserbase: Credit Karma Mortgage Rates with Caching - See README.md for full documentation

import asyncio
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand, StagehandConfig

load_dotenv()

# User configuration for mortgage rate lookup
# Modify these values to customize the mortgage rate search
USER_CONFIG = {
    "credit_score": "Above 760",
    "zipcode": "94109",
    "loan_balance": "500000",
    "home_value": "1000000",
    "cash_out": "200000",
}


class MortgageRate(BaseModel):
    lender: str = Field(..., description="Name of the lender")
    interest_rate: str = Field(..., description="Interest rate percentage")
    apr: str = Field(..., description="APR percentage")
    monthly_payment: str = Field(..., description="Monthly payment amount")


class MortgageRates(BaseModel):
    rates: list[MortgageRate] = Field(..., description="List of mortgage rate offers")


async def main():
    print("Starting Credit Karma Mortgage Rate Automation...")

    # Initialize Stagehand with Browserbase for cloud-based browser automation.
    config = StagehandConfig(
        env="BROWSERBASE",
        api_key=os.getenv("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_name="google/gemini-2.5-flash",
        model_api_key=os.getenv("GOOGLE_API_KEY"),
        verbose=0,
        # 0 = errors only, 1 = info, 2 = debug
        # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
        # https://docs.stagehand.dev/configuration/logging
        browserbase_session_create_params={
            "project_id": os.getenv("BROWSERBASE_PROJECT_ID"),
        },
    )

    try:
        async with Stagehand(config) as stagehand:
            print("Stagehand initialized successfully!")

            # Display live view URL for debugging and monitoring
            session_id = None
            if hasattr(stagehand, "session_id"):
                session_id = stagehand.session_id
            elif hasattr(stagehand, "browserbase_session_id"):
                session_id = stagehand.browserbase_session_id

            if session_id:
                print(f"Live View Link: https://browserbase.com/sessions/{session_id}")

            page = stagehand.page

            print("Navigating to Credit Karma mortgage rates page...")
            await page.goto(
                "https://www.creditkarma.com/home-loans/mortgage-rates",
                wait_until="domcontentloaded",
            )

            await page.act(
                "click on the 'Refinance' tab button in the mortgage rate calculator form (not a navigation link)"
            )
            print("Selected Refinance tab")

            await page.act(
                f"in the mortgage calculator form, select '{USER_CONFIG['credit_score']}' from the credit score dropdown"
            )
            print(f"Selected credit score: {USER_CONFIG['credit_score']}")

            await page.act(
                f"in the mortgage calculator form, enter '{USER_CONFIG['zipcode']}' in the ZIP code field"
            )
            print(f"Entered ZIP code: {USER_CONFIG['zipcode']}")

            await page.act(
                f"in the mortgage calculator form, enter '{USER_CONFIG['loan_balance']}' in the current loan balance field"
            )
            print(f"Entered loan balance: ${USER_CONFIG['loan_balance']}")

            await page.act(
                f"in the mortgage calculator form, enter '{USER_CONFIG['home_value']}' in the estimated home value field"
            )
            print(f"Entered home value: ${USER_CONFIG['home_value']}")

            await page.act(
                f"in the mortgage calculator form, enter '{USER_CONFIG['cash_out']}' in the cash out amount field"
            )
            print(f"Entered cash-out amount: ${USER_CONFIG['cash_out']}")

            await page.act(
                "click the 'Get my rates' or 'See rates' submit button in the mortgage calculator form"
            )
            print("Clicked 'Get my rates' button")

            # Extract mortgage rates using Pydantic schema for structured data
            mortgage_rates = await page.extract(
                "Extract all mortgage rate offers shown on the page. For each offer, include: lender name, interest rate, APR, and monthly payment.",
                schema=MortgageRates,
            )

            print("\n=== Credit Karma Refinance Query Summary ===")
            print(f"Credit Score: {USER_CONFIG['credit_score']}")
            print(f"ZIP Code: {USER_CONFIG['zipcode']}")
            print(f"Loan Balance: ${USER_CONFIG['loan_balance']}")
            print(f"Home Value: ${USER_CONFIG['home_value']}")
            print(f"Cash Out: ${USER_CONFIG['cash_out']}")
            print("=============================================\n")

            print("=== Mortgage Rate Results ===")
            if mortgage_rates and mortgage_rates.rates:
                for rate in mortgage_rates.rates:
                    print(
                        f"  {rate.lender}: {rate.interest_rate} ({rate.apr} APR) - {rate.monthly_payment}/mo"
                    )
            else:
                print("No rates found")
            print("=============================\n")

        print("Session closed successfully")

    except Exception as error:
        print(f"Error during mortgage rate lookup: {error}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in credit karma automation: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GOOGLE_API_KEY is set for the model")
        print("  - Credit Karma page structure may have changed")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
