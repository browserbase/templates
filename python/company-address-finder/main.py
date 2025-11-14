# Stagehand + Browserbase: Company Address Finder - See README.md for full documentation

import os
import asyncio
import json
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel, Field, HttpUrl

# Load environment variables
load_dotenv()

# Companies to process (modify this list to add/remove companies)
COMPANY_NAMES = ["Browserbase", "Mintlify", "Wordware", "Reducto"]

# Maximum number of companies to process concurrently.
# Default: 1 (sequential processing - works on all plans)
# Set to > 1 for concurrent processing (requires Startup or Developer plan or higher)
MAX_CONCURRENT = 1


class CompanyData(BaseModel):
    company_name: str
    homepage_url: str
    terms_of_service_link: str
    privacy_policy_link: str
    address: str


class TermsOfServiceLink(BaseModel):
    terms_of_service_link: HttpUrl = Field(..., description="The URL link to the Terms of Service page")


class PrivacyPolicyLink(BaseModel):
    privacy_policy_link: HttpUrl = Field(..., description="The URL link to the Privacy Policy page")


class CompanyAddress(BaseModel):
    company_address: str = Field(..., description="The physical company mailing address")


# Retries an async function with exponential backoff
# Handles transient network/page load failures for reliability
async def with_retry(fn, description: str, max_retries: int = 3, delay_ms: int = 2000):
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            return await fn()
        except Exception as error:
            last_error = error
            if attempt < max_retries:
                print(f"{description} - Attempt {attempt} failed, retrying in {delay_ms}ms...")
                await asyncio.sleep(delay_ms / 1000.0)
    
    raise Exception(f"{description} - Failed after {max_retries} attempts: {last_error}")


# Processes a single company: finds homepage, extracts ToS/Privacy links, and extracts physical address
# Uses CUA agent to navigate and Stagehand extract() for structured data extraction
# Falls back to Privacy Policy if address not found in Terms of Service
async def process_company(company_name: str) -> CompanyData:
    print(f"\nProcessing: {company_name}")
    
    stagehand = None
    
    try:
        # Initialize Stagehand with Browserbase
        stagehand = Stagehand(
            StagehandConfig(
                env="BROWSERBASE",
                api_key=os.environ.get("BROWSERBASE_API_KEY"),
                project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
                verbose=0,
                # 0 = errors only, 1 = info, 2 = debug
                # (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
                # https://docs.stagehand.dev/configuration/logging
                browserbase_session_create_params={
                    "project_id": os.environ.get("BROWSERBASE_PROJECT_ID"),
                    "region": "us-east-1",
                    "timeout": 900,
                    "browser_settings": {
                        "viewport": {
                            "width": 1920,
                            "height": 1080,
                        }
                    }
                }
            )
        )
        
        print(f"[{company_name}] Initializing browser session...")
        await stagehand.init()
        
        session_id = getattr(stagehand, 'session_id', None) or getattr(stagehand, 'browserbase_session_id', None)
        if session_id:
            print(f"[{company_name}] Live View Link: https://browserbase.com/sessions/{session_id}")
        
        page = stagehand.page
        
        # Navigate to Google as starting point for CUA agent to search and find company homepage
        print(f"[{company_name}] Navigating to Google...")
        await with_retry(
            lambda: page.goto("https://www.google.com/", wait_until="domcontentloaded"),
            f"[{company_name}] Initial navigation to Google"
        )
        
        # Create CUA agent for autonomous navigation
        # Agent can interact with the browser like a human: search, click, scroll, and navigate
        print(f"[{company_name}] Creating Computer Use Agent...")
        agent = stagehand.agent(
            provider="google",
            model="gemini-2.5-computer-use-preview-10-2025",
            instructions=f"""You are a helpful assistant that can use a web browser.
            You are currently on the following page: {page.url}.
            Do not ask follow up questions, the user will trust your judgement.""",
            options={
                "api_key": os.getenv("GEMINI_API_KEY"),
            }
        )
        
        print(f"[{company_name}] Finding company homepage using CUA agent...")
        await with_retry(
            lambda: agent.execute(
                instruction=f"Navigate to the {company_name} website",
                max_steps=5,
                auto_screenshot=True
            ),
            f"[{company_name}] Navigation to website"
        )
        
        homepage_url = page.url
        print(f"[{company_name}] Homepage found: {homepage_url}")
        
        # Extract both legal document links in parallel for speed (independent operations)
        print(f"[{company_name}] Finding Terms of Service & Privacy Policy links...")
        
        results = await asyncio.gather(
            page.extract(
                "extract the link to the Terms of Service page (may also be labeled as Terms of Use, Terms and Conditions, or similar equivalent names)",
                schema=TermsOfServiceLink
            ),
            page.extract(
                "extract the link to the Privacy Policy page (may also be labeled as Privacy Notice, Privacy Statement, or similar equivalent names)",
                schema=PrivacyPolicyLink
            ),
            return_exceptions=True
        )
        
        terms_of_service_link = ""
        privacy_policy_link = ""
        
        if not isinstance(results[0], Exception) and results[0]:
            terms_of_service_link = str(results[0].terms_of_service_link)
            print(f"[{company_name}] Terms of Service: {terms_of_service_link}")
        
        if not isinstance(results[1], Exception) and results[1]:
            privacy_policy_link = str(results[1].privacy_policy_link)
            print(f"[{company_name}] Privacy Policy: {privacy_policy_link}")
        
        address = ""
        
        # Try Terms of Service first - most likely to contain physical address for legal/contact purposes
        if terms_of_service_link:
            print(f"[{company_name}] Extracting address from Terms of Service...")
            await with_retry(
                lambda: page.goto(terms_of_service_link),
                f"[{company_name}] Navigate to Terms of Service"
            )
            
            try:
                address_result = await page.extract(
                    "Extract the physical company mailing address (street, city, state, postal code, and country if present) from the Terms of Service page. Ignore phone numbers or email addresses.",
                    schema=CompanyAddress
                )
                
                if address_result.company_address and address_result.company_address.strip():
                    address = address_result.company_address.strip()
                    print(f"[{company_name}] Address found in Terms of Service: {address}")
            except Exception as error:
                print(f"[{company_name}] Could not extract address from Terms of Service page")
        
        # Fallback: check Privacy Policy if address not found in Terms of Service
        if not address and privacy_policy_link:
            print(f"[{company_name}] Address not found in Terms of Service, trying Privacy Policy...")
            await with_retry(
                lambda: page.goto(privacy_policy_link),
                f"[{company_name}] Navigate to Privacy Policy"
            )
            
            try:
                address_result = await page.extract(
                    "Extract the physical company mailing address (street, city, state, postal code, and country if present) from the Privacy Policy page. Ignore phone numbers or email addresses.",
                    schema=CompanyAddress
                )
                
                if address_result.company_address and address_result.company_address.strip():
                    address = address_result.company_address.strip()
                    print(f"[{company_name}] Address found in Privacy Policy: {address}")
            except Exception as error:
                print(f"[{company_name}] Could not extract address from Privacy Policy page")
        
        if not address:
            address = "Address not found in Terms of Service or Privacy Policy pages"
            print(f"[{company_name}] {address}")
        
        result = CompanyData(
            company_name=company_name,
            homepage_url=homepage_url,
            terms_of_service_link=terms_of_service_link,
            privacy_policy_link=privacy_policy_link,
            address=address
        )
        
        print(f"[{company_name}] Successfully processed")
        return result
    
    except Exception as error:
        print(f"[{company_name}] Error: {error}")
        
        return CompanyData(
            company_name=company_name,
            homepage_url="",
            terms_of_service_link="",
            privacy_policy_link="",
            address=f"Error: {error}"
        )
    
    finally:
        if stagehand:
            try:
                await stagehand.close()
                print(f"[{company_name}] Session closed successfully")
            except Exception as close_error:
                print(f"[{company_name}] Error closing browser: {close_error}")


# Main orchestration function: processes companies sequentially or in batches based on MAX_CONCURRENT
# Collects results and outputs final JSON summary
async def main():
    print("Starting Company Address Finder...")
    
    company_names = COMPANY_NAMES
    max_concurrent = max(1, MAX_CONCURRENT)
    company_count = len(company_names)
    is_sequential = max_concurrent == 1
    
    print(f"\nProcessing {company_count} {'company' if company_count == 1 else 'companies'} {'sequentially' if is_sequential else f'concurrently (batch size: {max_concurrent})'}...")
    
    all_results = []
    
    if is_sequential:
        for i, company_name in enumerate(company_names):
            print(f"[{i + 1}/{len(company_names)}] {company_name}")
            result = await process_company(company_name)
            all_results.append(result)
    else:
        for i in range(0, len(company_names), max_concurrent):
            batch = company_names[i:i + max_concurrent]
            batch_number = i // max_concurrent + 1
            total_batches = (len(company_names) + max_concurrent - 1) // max_concurrent
            
            print(f"\nBatch {batch_number}/{total_batches}: {', '.join(batch)}")
            
            batch_promises = [process_company(name) for name in batch]
            batch_results = await asyncio.gather(*batch_promises)
            all_results.extend(batch_results)
            
            print(f"Batch {batch_number}/{total_batches} completed: {len(batch_results)} companies processed")
    
    print("\n" + "=" * 80)
    print("RESULTS (JSON):")
    print("=" * 80)
    print(json.dumps([result.model_dump() for result in all_results], indent=2))
    print("=" * 80)
    
    print(f"\nComplete: processed {len(all_results)}/{len(company_names)} companies")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("Common issues:")
        print("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY")
        print("  - Verify GEMINI_API_KEY is set")
        print("  - Ensure COMPANY_NAMES is configured in the config section")
        print("Docs: https://docs.stagehand.dev/v3/first-steps/introduction")
        exit(1)
