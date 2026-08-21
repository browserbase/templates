"""Verify nurse-license records with Stagehand V4."""

import asyncio
import json
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from stagehand import Stagehand, browserbase

load_dotenv()


class LicenseRecord(BaseModel):
    name: str = Field(min_length=1, description="License holder name")
    license_number: str = Field(min_length=1, description="License number")
    status: str = Field(min_length=1, description="License status")
    more_info_url: str = Field(description="URL for more information")


class LicenseResults(BaseModel):
    list_of_licenses: list[LicenseRecord]


LICENSE_RECORDS = [
    {
        "site": "https://pod-search.kalmservices.net/",
        "first_name": "Ronald",
        "last_name": "Agee",
        "license_number": "346",
    }
]


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


async def main() -> None:
    print("Starting nurse license verification...")
    browser = await browserbase.launch(api_key=require_env("BROWSERBASE_API_KEY"))
    try:
        stagehand = await Stagehand.create(
            browser=browser,
        )
        try:
            pages = await browser.context.pages()
            page = pages[0] if pages else await browser.context.new_page()

            for record in LICENSE_RECORDS:
                expected_name = f"{record['first_name']} {record['last_name']}"
                print(f"Verifying {expected_name}, license {record['license_number']}")
                await page.goto(
                    record["site"],
                    wait_until="domcontentloaded",
                    timeout=60_000,
                )
                await stagehand.act(
                    f"Type {record['first_name']} into the first name field",
                    page=page,
                )
                await stagehand.act(
                    f"Type {record['last_name']} into the last name field",
                    page=page,
                )
                await stagehand.act(
                    f"Type {record['license_number']} into the license number field",
                    page=page,
                )
                await stagehand.act("Click the Search button", page=page)
                await stagehand.observe(
                    "Find the first visible license result row",
                    page=page,
                )

                extracted = await stagehand.extract(
                    "Extract every license result with name, license number, status, and details URL",
                    LicenseResults,
                    page=page,
                )
                print(json.dumps(extracted.data.model_dump(mode="json"), indent=2))
        finally:
            await stagehand.close()
    finally:
        await browser.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Nurse license verification failed: {error}")
        print("Docs: https://docs.stagehand.dev/v4/first-steps/introduction")
        raise
