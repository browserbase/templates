# Stagehand + Browserbase + Exa: AI-Powered Job Search and Application
# See README.md for full documentation

import asyncio
import json
import os
from urllib.parse import urlparse

from dotenv import load_dotenv
from exa_py import Exa
from playwright.async_api import async_playwright

from stagehand import AsyncStagehand

# Load environment variables from .env file
# Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY, EXA_API_KEY
load_dotenv()

# Candidate application details - customize these for your job search
APPLICATION_DETAILS = {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "resume_path": "./Dummy_CV.pdf",
    "current_location": "San Francisco, CA",
    "willing_to_relocate": True,
    "requires_sponsorship": False,
    "visa_status": "",
    "phone": "+1-555-123-4567",
    "portfolio_url": "https://johndoe.dev",
    "cover_letter": "I am excited to apply for this position...",
}

# Search configuration - modify to target different companies
SEARCH_CONFIG = {
    "company_query": "AI startups in SF",
    "num_companies": 5,
    # Concurrency: set to False for sequential (works on all plans); True = concurrent (requires Startup or Developer plan or higher)
    "concurrent": True,
    "max_concurrent_browsers": 5,  # Max browsers when concurrent
    # Proxies: requires Developer plan or higher; residential proxies help avoid bot detection (https://docs.browserbase.com/features/proxies)
    "use_proxy": True,
}

# JSON schema for extracting structured job description data
JOB_DESCRIPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "jobTitle": {"type": "string", "description": "The job title"},
        "companyName": {"type": "string", "description": "The company name"},
        "requirements": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Job requirements",
        },
        "responsibilities": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Job responsibilities",
        },
        "benefits": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Job benefits",
        },
        "location": {"type": "string", "description": "Job location"},
        "workType": {"type": "string", "description": "Remote, hybrid, or on-site"},
        "fullDescription": {"type": "string", "description": "Full job description text"},
    },
}

# System prompt for the job application agent
AGENT_SYSTEM_PROMPT = """You are an intelligent job application assistant with decision-making power.

Your responsibilities:
- First, navigate to find a job posting and click through to its application page before filling out the form
- Analyze the job description to understand what the company is looking for
- Tailor responses to align with job requirements when available
- Craft thoughtful responses that highlight relevant experience/skills
- For cover letter or "why interested" fields, reference specific aspects of the job/company
- For location/relocation questions, use the willing_to_relocate flag to guide your answer
- For visa/sponsorship questions, answer honestly based on requires_sponsorship
- Skip resume/file upload fields - the resume will be uploaded automatically
- Use the provided application details as the source of truth for factual information
- IMPORTANT: Do NOT click the submit button - this is for testing purposes only

Think critically about each field and present the candidate in the best professional light."""


def build_agent_instruction(job_description: dict) -> str:
    """
    Build the instruction prompt for the agent based on available job description.

    Args:
        job_description: Extracted job description data

    Returns:
        str: The instruction prompt for the agent
    """
    has_job_description = job_description.get("jobTitle") or job_description.get("fullDescription")

    if has_job_description:
        return f"""You are filling out a job application. Here is the job description that was found:

JOB DESCRIPTION:
{json.dumps(job_description, indent=2)}

CANDIDATE INFORMATION:
{json.dumps(APPLICATION_DETAILS, indent=2)}

YOUR TASK:
- Fill out all text fields in the application form
- Reference specific aspects of the job description
- Highlight relevant skills/experience from the candidate's background
- Show alignment between candidate and role
- Skip file upload fields (resume will be handled separately)

Remember: Your goal is to fill out this application in a way that maximizes the candidate's chances by showing strong alignment with this specific role."""

    return f"""You are filling out a job application. No detailed job description was found on this page.

CANDIDATE INFORMATION:
{json.dumps(APPLICATION_DETAILS, indent=2)}

YOUR TASK:
- Fill out all text fields in the application form
- Write professional, thoughtful responses
- Highlight the candidate's general strengths and qualifications
- Express genuine interest and enthusiasm
- Skip file upload fields (resume will be handled separately)

Remember: Even without a job description, present the candidate professionally and enthusiastically."""


async def upload_resume(session_id: str, cdp_url: str, log_prefix: str = "") -> None:
    """
    Upload resume file using Playwright, checking main page and iframes.

    Args:
        session_id: The Stagehand session ID
        cdp_url: The CDP URL to connect to
        log_prefix: Optional prefix for log messages (e.g. per-application context)
    """
    print(f"{log_prefix}Attempting to upload resume...")

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(cdp_url)
        contexts = browser.contexts
        if not contexts:
            print(f"{log_prefix}No browser context found")
            return

        pw_context = contexts[0]
        pages = pw_context.pages
        if not pages:
            print(f"{log_prefix}No page found")
            return

        pw_page = pages[0]

        # Check main page for file input
        main_page_inputs = await pw_page.locator('input[type="file"]').count()

        if main_page_inputs > 0:
            await pw_page.locator('input[type="file"]').first.set_input_files(
                APPLICATION_DETAILS["resume_path"]
            )
            print(f"{log_prefix}Resume uploaded successfully from main page!")
            return

        # Check inside iframes for file input
        frames = pw_page.frames
        for frame in frames:
            try:
                frame_input_count = await frame.locator('input[type="file"]').count()
                if frame_input_count > 0:
                    await frame.locator('input[type="file"]').first.set_input_files(
                        APPLICATION_DETAILS["resume_path"]
                    )
                    print(f"{log_prefix}Resume uploaded successfully from iframe!")
                    return
            except Exception:
                # Frame not accessible, continue to next
                pass

        print(f"{log_prefix}No file upload field found on page")


async def search_companies(exa: Exa) -> list[dict]:
    """
    Search for companies matching the criteria using Exa.

    Args:
        exa: Exa client instance

    Returns:
        list: List of company results with title and url
    """
    print(f'Searching for companies: "{SEARCH_CONFIG["company_query"]}"...')

    # Use asyncio.to_thread for synchronous Exa SDK calls
    company_results = await asyncio.to_thread(
        exa.search_and_contents,
        SEARCH_CONFIG["company_query"],
        category="company",
        text=True,
        type="auto",
        livecrawl="fallback",
        num_results=SEARCH_CONFIG["num_companies"],
    )

    print(f"Found {len(company_results.results)} companies:")
    for i, company in enumerate(company_results.results):
        print(f"  {i + 1}. {company.title} - {company.url}")

    return company_results.results


async def find_careers_pages(exa: Exa, companies: list) -> list[dict]:
    """
    Find careers pages for each discovered company.

    Args:
        exa: Exa client instance
        companies: List of company results from search

    Returns:
        list: List of careers page data with company, url, and careersUrl
    """
    print("\nSearching for careers pages...")
    careers_pages = []

    for company in companies:
        # Extract domain from company URL for the careers search
        parsed_url = urlparse(company.url)
        company_domain = parsed_url.hostname.replace("www.", "") if parsed_url.hostname else ""
        print(f"  Looking for careers page: {company_domain}...")

        # Use asyncio.to_thread for synchronous Exa SDK calls
        careers_result = await asyncio.to_thread(
            exa.search_and_contents,
            f"{company_domain} careers page",
            context=True,
            exclude_domains=["linkedin.com"],
            num_results=5,
            text=True,
            type="deep",
            livecrawl="fallback",
        )

        if careers_result.results:
            careers_url = careers_result.results[0].url
            print(f"    Found: {careers_url}")
            careers_pages.append(
                {
                    "company": company.title or company_domain,
                    "url": company.url,
                    "careers_url": careers_url,
                }
            )
        else:
            print(f"    No careers page found for {company_domain}")

    return careers_pages


async def apply_to_job(careers_page: dict, index: int) -> dict:
    """
    Apply to a single job posting: start session, extract job description,
    run agent to fill form, upload resume. Returns result dict for summary.

    Args:
        careers_page: Dict with company, url, careers_url
        index: 0-based index for logging (e.g. [1/N] Company: ...)

    Returns:
        dict: company, careers_url, success, message, session_url (optional)
    """
    num_companies = SEARCH_CONFIG["num_companies"]
    company_name = careers_page["company"]
    log_prefix = f"[{index + 1}/{num_companies}] {company_name}: "
    print(f"\n{log_prefix}Starting application...")

    model_api_key = (
        os.environ.get("MODEL_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    )
    client = AsyncStagehand(
        browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),
        browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),
        model_api_key=model_api_key,
    )

    # Start session (proxies require Developer plan or higher)
    start_response = await client.sessions.start(model_name="google/gemini-2.5-pro")
    session_id = start_response.data.session_id
    session_url = f"https://browserbase.com/sessions/{session_id}"
    print(f"{log_prefix}Session started: {session_url}")

    try:
        await client.sessions.navigate(id=session_id, url=careers_page["careers_url"])

        extract_response = await client.sessions.extract(
            id=session_id,
            instruction="extract the full job description including title, requirements, responsibilities, and any important details about the role",
            schema=JOB_DESCRIPTION_SCHEMA,
        )
        job_description = extract_response.data.result or {}

        instruction = build_agent_instruction(job_description)
        execute_response = await client.sessions.execute(
            id=session_id,
            execute_options={
                "instruction": instruction,
                "max_steps": 50,
            },
            agent_config={
                "model": "google/gemini-2.5-flash",
                "system_prompt": AGENT_SYSTEM_PROMPT,
            },
            timeout=300.0,
        )
        result = execute_response.data.result

        try:
            cdp_url = f"wss://connect.browserbase.com?apiKey={os.environ.get('BROWSERBASE_API_KEY')}&sessionId={session_id}"
            await upload_resume(session_id, cdp_url, log_prefix)
        except Exception as upload_error:
            print(f"{log_prefix}Could not upload resume: {upload_error}")

        if result.success:
            print(f"{log_prefix}Form filled successfully!")
        else:
            print(f"{log_prefix}Form filling may be incomplete")

        return {
            "company": company_name,
            "careers_url": careers_page["careers_url"],
            "success": result.success,
            "message": result.message,
            "session_url": session_url,
        }
    except Exception as error:
        print(f"{log_prefix}Error: {error}")
        return {
            "company": company_name,
            "careers_url": careers_page["careers_url"],
            "success": False,
            "message": str(error),
            "session_url": session_url,
        }
    finally:
        await client.sessions.end(id=session_id)
        print(f"{log_prefix}Session closed")


async def main():
    """
    Main application entry point.

    Orchestrates the job search and application automation:
    1. Uses Exa to find companies matching search criteria
    2. Finds careers pages for each company
    3. Navigates to careers page with Stagehand
    4. Extracts job description data
    5. Uses AI agent to fill out application form
    6. Uploads resume using Playwright
    """
    print("Starting Exa + Browserbase Job Search and Application...")

    # Initialize Exa client for AI-powered company search
    exa = Exa(api_key=os.environ.get("EXA_API_KEY"))

    # Search for companies matching the criteria using Exa
    companies = await search_companies(exa)

    if not companies:
        print("No companies found. Exiting.")
        return

    # Find careers pages for each discovered company
    careers_pages = await find_careers_pages(exa, companies)

    print(f"\nFound {len(careers_pages)} careers pages total.")

    if not careers_pages:
        print("No careers pages found. Exiting.")
        return

    # Apply to jobs either concurrently or sequentially based on config
    concurrent = SEARCH_CONFIG["concurrent"]
    max_browsers = SEARCH_CONFIG["max_concurrent_browsers"]
    print("\n" + "=" * 50)
    mode = f"concurrent, max {max_browsers} browsers" if concurrent else "sequential"
    print(f"Starting applications ({mode})...")
    print("=" * 50)

    if concurrent:
        # Run applications concurrently with limited parallelism
        results = []
        for i in range(0, len(careers_pages), max_browsers):
            chunk = careers_pages[i : i + max_browsers]
            chunk_results = await asyncio.gather(
                *[apply_to_job(page, len(results) + j) for j, page in enumerate(chunk)]
            )
            results.extend(chunk_results)
    else:
        # Run applications sequentially
        results = []
        for i, careers_page in enumerate(careers_pages):
            result = await apply_to_job(careers_page, i)
            results.append(result)

    # Print summary
    print("\n" + "=" * 50)
    print("APPLICATION SUMMARY")
    print("=" * 50)
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    print(f"\nTotal: {len(results)} | Success: {len(successful)} | Failed: {len(failed)}\n")
    for i, r in enumerate(results):
        status = "[SUCCESS]" if r["success"] else "[FAILED]"
        print(f"{i + 1}. {status} {r['company']}")
        print(f"   URL: {r['careers_url']}")
        if r.get("session_url"):
            print(f"   Session: {r['session_url']}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Error in Exa + Browserbase job application: {err}")
        print("Common issues:")
        print(
            "  - Check .env file has BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, "
            "MODEL_API_KEY, and EXA_API_KEY"
        )
        print("  - Verify companies exist for the search query")
        print("  - Ensure careers pages are accessible")
        print("Docs: https://docs.stagehand.dev/v3/sdk/python")
        exit(1)
