"""Verify a California real-estate license with Stagehand V4."""

import asyncio
import json
import os

from dotenv import load_dotenv
from pydantic import BaseModel

from stagehand import Stagehand, browserbase

load_dotenv()

LICENSE_ID = "02237476"


class LicenseDetails(BaseModel):
    license_type: str | None
    name: str | None
    mailing_address: str | None
    license_id: str | None
    expiration_date: str | None
    license_status: str | None
    salesperson_license_issued: str | None
    former_names: str | None
    responsible_broker: str | None
    broker_license_id: str | None
    broker_address: str | None
    disciplinary_action: str | None
    other_comments: str | None


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")

    browser = await browserbase.launch(api_key=api_key)
    try:
        stagehand = await Stagehand.create(
            browser=browser,
        )
        try:
            pages = await browser.context.pages()
            page = pages[0] if pages else await browser.context.new_page()
            await page.goto(
                "https://www2.dre.ca.gov/publicasp/pplinfo.asp",
                wait_until="domcontentloaded",
                timeout=60_000,
            )
            await stagehand.act(
                f"Type {LICENSE_ID} into the License ID input field",
                page=page,
            )
            await stagehand.act("Click the Find button", page=page)

            extracted = await stagehand.extract(
                f"Extract all license verification details for DRE #{LICENSE_ID}",
                LicenseDetails,
                page=page,
            )
            details = extracted.data
            print(json.dumps(details.model_dump(mode="json"), indent=2))
        finally:
            await stagehand.close()
    finally:
        await browser.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"License verification failed: {error}")
        print("Docs: https://docs.stagehand.dev/v4/first-steps/introduction")
        raise
