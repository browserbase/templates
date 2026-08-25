"""Check website links with the Browserbase Fetch API."""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urldefrag, urljoin, urlparse

from browserbase import AsyncBrowserbase
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

TARGET_URL = os.environ.get("TARGET_URL", "https://www.browserbase.com")


def positive_integer(name: str, fallback: int) -> int:
    value = int(os.environ.get(name, fallback))
    if value < 1:
        raise ValueError(f"{name} must be a positive integer")
    return value


MAX_LINKS = positive_integer("MAX_LINKS", 25)
MAX_CONCURRENT_LINKS = positive_integer("MAX_CONCURRENT_LINKS", 5)
FETCH_ATTEMPTS = positive_integer("FETCH_ATTEMPTS", 2)


@dataclass(frozen=True)
class Link:
    url: str
    link_text: str


@dataclass
class LinkCheckResult:
    url: str
    link_text: str
    success: bool
    status_code: int | None = None
    content_type: str | None = None
    page_title: str | None = None
    attempts: int = 1
    error: str | None = None


def response_body(content: str | dict[str, Any]) -> str:
    return content if isinstance(content, str) else json.dumps(content)


def extract_links(html: str, base_url: str) -> list[Link]:
    soup = BeautifulSoup(html, "html.parser")
    links: dict[str, Link] = {}

    for anchor in soup.select("a[href]"):
        href = anchor.get("href")
        if not isinstance(href, str):
            continue
        absolute, _fragment = urldefrag(urljoin(base_url, href))
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        absolute = parsed._replace(path=parsed.path or "/").geturl()
        if absolute in links:
            continue
        link_text = " ".join(anchor.get_text(" ", strip=True).split())
        aria_label = anchor.get("aria-label")
        if not link_text and isinstance(aria_label, str):
            link_text = aria_label.strip()
        links[absolute] = Link(url=absolute, link_text=link_text or absolute)

    return list(links.values())


def page_title(html: str) -> str | None:
    title = BeautifulSoup(html, "html.parser").title
    if not title:
        return None
    text = " ".join(title.get_text(" ", strip=True).split())
    return text or None


async def check_link(api: AsyncBrowserbase, link: Link) -> LinkCheckResult:
    last_error = "Fetch failed"

    for attempt in range(1, FETCH_ATTEMPTS + 1):
        try:
            response = await api.fetch_api.create(
                url=link.url,
                format="raw",
                allow_redirects=True,
            )
            if response.status_code >= 500 and attempt < FETCH_ATTEMPTS:
                continue

            body = response_body(response.content)
            success = 200 <= response.status_code < 400
            return LinkCheckResult(
                **asdict(link),
                success=success,
                status_code=response.status_code,
                content_type=response.content_type,
                page_title=page_title(body) if "text/html" in response.content_type else None,
                attempts=attempt,
                error=None if success else f"HTTP {response.status_code}",
            )
        except Exception as error:
            last_error = str(error)

    return LinkCheckResult(
        **asdict(link),
        success=False,
        attempts=FETCH_ATTEMPTS,
        error=last_error,
    )


async def main() -> None:
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    if not api_key:
        raise RuntimeError("BROWSERBASE_API_KEY is required")

    async with AsyncBrowserbase(api_key=api_key) as api:
        print(f"Fetching {TARGET_URL} to discover links...")
        homepage = await api.fetch_api.create(
            url=TARGET_URL,
            format="raw",
            allow_redirects=True,
        )
        if not 200 <= homepage.status_code < 400:
            raise RuntimeError(f"Homepage returned HTTP {homepage.status_code}")
        if "text/html" not in homepage.content_type:
            raise RuntimeError(f"Expected HTML, received {homepage.content_type}")

        discovered = extract_links(response_body(homepage.content), TARGET_URL)
        links = discovered[:MAX_LINKS]
        print(f"Found {len(discovered)} unique HTTP(S) links; checking {len(links)}.")

        results: list[LinkCheckResult] = []
        for index in range(0, len(links), MAX_CONCURRENT_LINKS):
            batch = links[index : index + MAX_CONCURRENT_LINKS]
            checked = await asyncio.gather(*(check_link(api, link) for link in batch))
            results.extend(checked)
            for result in checked:
                status = result.status_code if result.status_code is not None else "ERR"
                print(f"{'PASS' if result.success else 'FAIL'} {status} {result.url}")

    summary = {
        "target_url": TARGET_URL,
        "discovered_links": len(discovered),
        "checked_links": len(results),
        "successful": sum(result.success for result in results),
        "failed": sum(not result.success for result in results),
        "results": [asdict(result) for result in results],
    }
    print(json.dumps(summary, indent=2))
    if summary["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"Website link test failed: {error}")
        raise SystemExit(1) from error
