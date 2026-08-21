"""Review job applications with Exa and direct Stagehand V4 primitives."""

from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from exa_py import Exa
from pydantic import BaseModel, Field
from stagehand import FilePayload, Stagehand, browserbase

load_dotenv()

APPLICANT = {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567",
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": None,
    "resume": Path("Dummy_CV.pdf").resolve(),
    "current_location": "San Francisco, CA",
    "relocation": True,
    "sponsorship": False,
    "visa_status": "",
    "portfolio": "https://johndoe.dev",
    "cover_letter": "I am excited to apply for this position.",
}


def positive_integer(name: str, fallback: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return fallback
    try:
        value = int(raw)
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer") from error
    if value < 1:
        raise RuntimeError(f"{name} must be a positive integer")
    return value


COMPANY_QUERY = os.environ.get("COMPANY_QUERY", "AI startups in SF currently hiring")
NUM_COMPANIES = positive_integer("NUM_COMPANIES", 1)
CONCURRENT = os.environ.get("CONCURRENT") == "true"
MAX_CONCURRENT_BROWSERS = positive_integer("MAX_CONCURRENT_BROWSERS", 2)


class CareersPage(BaseModel):
    company: str
    careers_url: str


class JobHeadline(BaseModel):
    company: str = Field(min_length=1)
    job_title: str = Field(min_length=1)


class JobDescription(BaseModel):
    requirements_summary: str
    responsibilities_summary: str


class RoleSummary(BaseModel):
    role_summary: str = Field(min_length=1)


class FormReview(BaseModel):
    summary: str = Field(min_length=1)
    visible_required_fields: list[str]


class ApplicationReview(BaseModel):
    job_title: str
    job_url: str
    application_url: str
    requirements: list[str]
    responsibilities: list[str]
    observed_fields: list[str]
    fields_attempted: list[str]
    resume_uploaded: bool
    outstanding_fields: list[str]
    summary: str


class ApplicationResult(BaseModel):
    company: str
    careers_url: str
    success: bool
    review: ApplicationReview | None = None
    error: str | None = None


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def candidate_score(url: str, title: str) -> int:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    searchable = f"{title} {parsed.path} {parsed.query}"
    ats = any(
        provider in host
        for provider in ("ashbyhq.com", "greenhouse.io", "lever.co", "smartrecruiters.com")
    )
    direct_role = is_direct_role_url(url)
    careers = re.search(
        r"\b(careers?|jobs?|open[- ]?roles?|positions?|join[- ]?us)\b",
        searchable,
        re.IGNORECASE,
    )
    return int(ats) * 4 + int(direct_role) * 3 + int(careers is not None) * 2


def is_direct_role_url(value: str) -> bool:
    parsed = urlparse(value)
    if (
        re.search(
            r"/(jobs?|positions?)/[^/]+|ashby_jid=|gh_jid=|lever-origin=",
            f"{parsed.path}?{parsed.query}",
            re.IGNORECASE,
        )
        is not None
    ):
        return True
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    return parsed.hostname in {"jobs.ashbyhq.com", "jobs.lever.co"} and len(path_segments) >= 2


async def discover_careers_pages(exa: Exa) -> list[CareersPage]:
    search = await asyncio.to_thread(
        exa.search_and_contents,
        f"{COMPANY_QUERY} official careers jobs open roles",
        context=True,
        exclude_domains=["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"],
        livecrawl="fallback",
        num_results=max(NUM_COMPANIES * 6, 10),
        text=True,
        type="deep",
    )

    seen: set[str] = set()
    candidates: list[tuple[int, CareersPage]] = []
    for result in search.results:
        parsed = urlparse(result.url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            continue
        score = candidate_score(result.url, result.title or "")
        identity = f"{parsed.hostname.removeprefix('www.')}{parsed.path}"
        if score < 2 or identity in seen:
            continue
        seen.add(identity)
        company = re.split(r"\s+[|–—]\s+", result.title or parsed.hostname, maxsplit=1)[0]
        candidates.append((score, CareersPage(company=company, careers_url=result.url)))

    candidates.sort(key=lambda candidate: candidate[0], reverse=True)
    candidate_limit = max(NUM_COMPANIES * 3, NUM_COMPANIES)
    pages = [candidate[1] for candidate in candidates[:candidate_limit]]
    if not pages:
        raise RuntimeError("Exa returned no direct careers or ATS pages")
    return pages


def includes(description: str, pattern: str) -> bool:
    return re.search(pattern, description, re.IGNORECASE) is not None


async def review_application(careers_page: CareersPage, _index: int) -> ApplicationResult:
    browser = await browserbase.launch(api_key=require_env("BROWSERBASE_API_KEY"))
    stagehand = await Stagehand.create(
        browser=browser,
        model="google/gemini-2.5-flash",
    )

    try:
        pages = await browser.context.pages()
        page = pages[0] if pages else await browser.context.new_page()
        await page.goto(
            careers_page.careers_url,
            wait_until="domcontentloaded",
            timeout=60_000,
        )

        # Exa often returns a role page directly, so a no-op role action is non-fatal.
        if not is_direct_role_url(careers_page.careers_url):
            try:
                await stagehand.act(
                    "Open the first currently open software, engineering, design, or product role.",
                    page=page,
                )
            except Exception:
                pass
        page = await browser.context.active_page() or page
        job_url = await page.url()

        try:
            description = (
                await stagehand.extract(
                    (
                        "Summarize the visible requirements and responsibilities for this role "
                        "as two plain-text strings. Use an empty string for a section that is "
                        "not shown."
                    ),
                    JobDescription,
                    page=page,
                )
            ).data
        except Exception:
            description = None
        has_description = bool(
            description
            and any(
                value.strip() and value.strip().casefold() != "null"
                for value in (
                    description.requirements_summary,
                    description.responsibilities_summary,
                )
            )
        )
        if not has_description:
            try:
                fallback_summary = (
                    await stagehand.extract(
                        (
                            "Return one concise plain-text summary of the visible requirements "
                            "and responsibilities for this role."
                        ),
                        RoleSummary,
                        page=page,
                    )
                ).data.role_summary
            except Exception:
                fallback_summary = None
        else:
            fallback_summary = None

        try:
            await stagehand.act(
                (
                    "Open the application form for this job. Click Apply or Apply for this job, "
                    "but never submit an application."
                ),
                page=page,
            )
        except Exception:
            pass
        page = await browser.context.active_page() or page
        await page.wait_for_timeout(1_500)

        headline = (
            await stagehand.extract(
                "Extract the exact role title and company shown above this application form.",
                JobHeadline,
                page=page,
            )
        ).data

        observed = await stagehand.observe(
            (
                "Find every visible application input, textarea, select, radio option, checkbox, "
                "and resume or CV file upload. Exclude the final submit button."
            ),
            page=page,
        )
        if not observed.data:
            raise RuntimeError("No usable application form was observed")

        fields_attempted: list[str] = []
        descriptions = [action.description for action in observed.data]

        async def run(label: str, pattern: str, value: str | bool | None) -> None:
            if value is None or value == "":
                return
            candidates = [
                action for action in observed.data if includes(action.description, pattern)
            ]
            if label == "phone":
                candidates = [
                    action for action in candidates if not includes(action.description, r"country")
                ]
            if label == "cover letter":
                candidates = [
                    action
                    for action in candidates
                    if not includes(action.description, r"file (upload|input)|attach.*cover")
                ]
            rendered = ("Yes" if value else "No") if isinstance(value, bool) else value
            if isinstance(value, bool):
                action = next(
                    (
                        candidate
                        for candidate in candidates
                        if rendered.casefold() in candidate.description.casefold()
                    ),
                    None,
                )
            else:
                action = candidates[0] if candidates else None
            if action is None:
                return
            try:
                result = await stagehand.act(
                    action.model_copy(
                        update={"arguments": [] if action.method == "click" else [rendered]}
                    ),
                    page=page,
                )
                if result.data.success:
                    fields_attempted.append(label)
            except Exception:
                # Optional and custom controls remain for the human reviewer.
                pass

        first_name = next(
            (action for action in observed.data if includes(action.description, r"first name")),
            None,
        )
        last_name = next(
            (action for action in observed.data if includes(action.description, r"last name")),
            None,
        )
        if first_name and last_name:
            name_parts = str(APPLICANT["name"]).split()
            try:
                first_result = await stagehand.act(
                    first_name.model_copy(update={"arguments": [name_parts[0]]}), page=page
                )
                last_result = await stagehand.act(
                    last_name.model_copy(update={"arguments": [" ".join(name_parts[1:])]}),
                    page=page,
                )
                if first_result.data.success and last_result.data.success:
                    fields_attempted.append("name")
            except Exception:
                pass
        else:
            await run("name", r"\b(full )?name\b", str(APPLICANT["name"]))

        await run("email", r"email", str(APPLICANT["email"]))
        await run("phone", r"phone|telephone", str(APPLICANT["phone"]))
        await run("LinkedIn", r"linkedin", str(APPLICANT["linkedin"]))
        await run("GitHub", r"github", APPLICANT["github"])
        await run(
            "portfolio", r"portfolio|personal website|\bwebsite\b", str(APPLICANT["portfolio"])
        )
        await run(
            "current location",
            r"current.*location|currently based|where.*based",
            str(APPLICANT["current_location"]),
        )
        await run("relocation", r"relocat", bool(APPLICANT["relocation"]))
        await run("sponsorship", r"sponsor|work authorization", bool(APPLICANT["sponsorship"]))
        await run("visa status", r"visa.*status|status.*visa", str(APPLICANT["visa_status"]))
        await run(
            "cover letter",
            r"cover letter|why.*apply|why.*interested|why.*want.*work|additional information",
            (
                f"{APPLICANT['cover_letter']} I am especially interested in the "
                f"{headline.job_title} role at {headline.company}."
            ),
        )

        resume_uploaded = False
        resume_action = next(
            (
                action
                for action in observed.data
                if action.selector
                and includes(action.description, r"resume|curriculum|\bcv\b|upload.*file")
                and not includes(action.description, r"autofill")
            ),
            None,
        )
        resume_path = APPLICANT["resume"]
        if resume_action and isinstance(resume_path, Path):
            try:
                input_element = page.locator(resume_action.selector)
                await input_element.set_input_files(
                    FilePayload(
                        name=resume_path.name,
                        buffer=resume_path.read_bytes(),
                        mime_type="application/pdf",
                    )
                )
                resume_uploaded = True
            except Exception:
                # Upload is exact browser mechanics; failure is reported instead of hidden.
                pass

        form_review = (
            await stagehand.extract(
                (
                    "Summarize this application for human review and list visible required "
                    "fields that still need attention."
                ),
                FormReview,
                page=page,
            )
        ).data
        application_url = await page.url()
        resolved_job_url = (
            job_url
            if is_direct_role_url(job_url)
            else re.sub(r"/application/?$", "", application_url)
        )

        return ApplicationResult(
            company=headline.company,
            careers_url=careers_page.careers_url,
            success=True,
            review=ApplicationReview(
                job_title=headline.job_title,
                job_url=resolved_job_url,
                application_url=application_url,
                requirements=(
                    [description.requirements_summary.strip()]
                    if description
                    and description.requirements_summary.strip()
                    and description.requirements_summary.strip().casefold() != "null"
                    else [fallback_summary]
                    if fallback_summary
                    else []
                ),
                responsibilities=(
                    [description.responsibilities_summary.strip()]
                    if description
                    and description.responsibilities_summary.strip()
                    and description.responsibilities_summary.strip().casefold() != "null"
                    else []
                ),
                observed_fields=descriptions,
                fields_attempted=fields_attempted,
                resume_uploaded=resume_uploaded,
                outstanding_fields=[
                    field
                    for field in form_review.visible_required_fields
                    if not (resume_uploaded and includes(field, r"resume|\bcv\b"))
                ],
                summary=form_review.summary,
            ),
        )
    except Exception as error:
        return ApplicationResult(
            company=careers_page.company,
            careers_url=careers_page.careers_url,
            success=False,
            error=str(error) or type(error).__name__,
        )
    finally:
        try:
            await stagehand.close()
        except Exception:
            pass
        try:
            await browser.close()
        except Exception:
            pass


async def main() -> None:
    require_env("BROWSERBASE_API_KEY")
    pages = await discover_careers_pages(Exa(api_key=require_env("EXA_API_KEY")))
    print(f"Found {len(pages)} direct job or careers page(s)")

    if CONCURRENT:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_BROWSERS)

        async def bounded_review(page: CareersPage, index: int) -> ApplicationResult:
            async with semaphore:
                return await review_application(page, index)

        results = await asyncio.gather(
            *(bounded_review(page, index) for index, page in enumerate(pages))
        )
    else:
        results = []
        for index, page in enumerate(pages):
            results.append(await review_application(page, index))
            if sum(result.success for result in results) >= NUM_COMPANIES:
                break

    print("[" + ",\n".join(result.model_dump_json(indent=2) for result in results) + "]")
    if not any(result.success for result in results):
        raise RuntimeError("No application review reached a usable form")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Exa + Browserbase workflow failed: {error}")
        raise SystemExit(1) from error
