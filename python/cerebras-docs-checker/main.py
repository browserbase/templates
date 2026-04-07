# Stagehand + Browserbase: Cerebras Documentation Checker - See README.md for full documentation

import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from playwright.async_api import async_playwright
from pydantic import BaseModel, Field
from stagehand import Stagehand

load_dotenv(override=True)

# API keys (loaded from .env file)
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
BROWSERBASE_API_KEY = os.getenv("BROWSERBASE_API_KEY")

if not all([CEREBRAS_API_KEY, BROWSERBASE_API_KEY]):
    raise ValueError("Missing required API keys. Check .env file.")

# Cerebras model to use for verification and analysis (override via CEREBRAS_MODEL env var)
CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "llama-3.3-70b")

# Crawl configuration (modify these to control scope and speed)
DEFAULT_URL = "https://docs.stagehand.dev"  # Target docs site (can also be passed as CLI arg)
MAX_PAGES = 20       # Maximum number of pages to crawl
MAX_DEPTH = 2        # Maximum link depth from the root page
MAX_CRAWL_WORKERS = 5  # Number of parallel browser sessions for crawling


# ── Data Models ────────────────────────────────────────────────────


class Page(BaseModel):
    url: str
    title: str = ""
    content: str = ""
    last_updated: Optional[datetime] = None
    depth: int = 0
    links: list[dict] = Field(default_factory=list)
    broken_links: list[dict] = Field(default_factory=list)
    broken_anchors: list[str] = Field(default_factory=list)


class Issue(BaseModel):
    url: str
    type: str  # broken_link, outdated, unclear, grammar, missing_context, broken_anchor, error
    severity: str  # critical, high, medium, low
    description: str
    suggestion: str
    context: str = ""


# ── Phase 1: Crawl ────────────────────────────────────────────────


async def _crawl_worker(
    worker_id: int,
    queue: asyncio.Queue,
    visited: dict,
    visited_lock: asyncio.Lock,
    base_domain: str,
    max_pages: int,
    max_depth: int,
    stagehand: Stagehand,
    counter: list,
):
    """Worker coroutine: pops URLs from the shared queue, navigates via Stagehand, and extracts
    the accessibility tree (aria tree) for each page. Each worker runs its own browser session."""

    session_id = None
    browser = None
    pw = None

    try:
        # Start a new Browserbase session via the Stagehand REST API
        start_response = stagehand.sessions.start(model_name="cerebras/llama-3.3-70b")
        session_id = start_response.data.session_id
        live_url = f"https://www.browserbase.com/sessions/{session_id}"
        print(f"  [Worker {worker_id}] Live session: {live_url}")

        # Connect Playwright to the remote browser via Chrome DevTools Protocol (BYOB pattern)
        cdp_url = (
            f"wss://connect.browserbase.com?apiKey={BROWSERBASE_API_KEY}&sessionId={session_id}"
        )

        pw = await async_playwright().start()
        browser = await pw.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        # HTTP client for checking broken links (HEAD requests)
        http = httpx.AsyncClient()

        while True:
            async with visited_lock:
                if len(visited) >= max_pages:
                    break

            try:
                url, depth = queue.get_nowait()
            except asyncio.QueueEmpty:
                await asyncio.sleep(0.2)
                try:
                    url, depth = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

            url = url.split("#")[0]

            async with visited_lock:
                if url in visited or len(visited) >= max_pages:
                    queue.task_done()
                    continue
                visited[url] = None

            if depth > max_depth:
                async with visited_lock:
                    del visited[url]
                queue.task_done()
                continue

            async with visited_lock:
                counter[0] += 1
                page_num = counter[0]
            short_url = url.split("/")[-1] or url.split("/")[-2] or "index"
            start_time = asyncio.get_event_loop().time()

            try:
                # Navigate to the URL using Stagehand's server-side navigation
                stagehand.sessions.navigate(id=session_id, url=url)
                title = await page.title()

                # Extract the accessibility tree (aria tree) — this is free, no LLM call needed.
                # The aria tree gives us the page's text content in a structured format.
                extract_response = stagehand.sessions.extract(id=session_id)
                result = extract_response.data.result
                if isinstance(result, dict):
                    aria_tree = result.get("pageText", str(result))
                elif isinstance(result, str):
                    aria_tree = result
                else:
                    aria_tree = str(result)

                # Collect all links on the page for BFS crawling and broken link detection
                links = await page.eval_on_selector_all(
                    "a[href]",
                    "els => els.map(e => ({href: e.href, text: e.textContent.trim().slice(0,30)}))",
                )

                # Check first 15 links for broken URLs using HEAD requests
                broken = []
                for link in links[:15]:
                    href = link["href"]
                    if href.startswith("http"):
                        try:
                            r = await http.head(href, follow_redirects=True, timeout=8)
                            if r.status_code >= 400:
                                broken.append(
                                    {"url": href, "text": link["text"], "status": r.status_code}
                                )
                        except Exception:
                            broken.append({"url": href, "text": link["text"], "status": 0})

                # Find broken anchor links (e.g. #section-name that doesn't exist on the page)
                broken_anchors = await page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('a[href^="#"]'))
                        .map(a => a.href.split('#')[1])
                        .filter(id => {
                            if (!id || id.length <= 1 || id === 'top') return false;
                            return !document.getElementById(id);
                        });
                }""")

                elapsed = asyncio.get_event_loop().time() - start_time
                content_kb = len(aria_tree) / 1024
                print(
                    f"  [{page_num}/{max_pages}] {short_url}"
                    f" — aria: {content_kb:.1f}KB, {len(broken)} broken links"
                    f" ({elapsed:.1f}s)"
                )

                page_obj = Page(
                    url=url,
                    title=title,
                    content=aria_tree,
                    depth=depth,
                    links=links,
                    broken_links=broken,
                    broken_anchors=broken_anchors,
                )
                async with visited_lock:
                    visited[url] = page_obj

                # Add newly discovered same-domain links to the BFS queue
                for link in links:
                    href = link["href"].split("#")[0]
                    parsed = urlparse(href)
                    async with visited_lock:
                        if parsed.netloc == base_domain and href not in visited:
                            queue.put_nowait((href, depth + 1))

            except Exception as e:
                elapsed = asyncio.get_event_loop().time() - start_time
                print(f"  [{page_num}/{max_pages}] {short_url} — ERROR: {e!s:.80} ({elapsed:.1f}s)")
                page_obj = Page(url=url, title="[Error]", content=str(e), depth=depth)
                async with visited_lock:
                    visited[url] = page_obj

            queue.task_done()

        await http.aclose()

    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
        if session_id:
            try:
                stagehand.sessions.end(id=session_id)
            except Exception:
                pass


async def crawl(
    root_url: str, max_pages: int = 30, max_depth: int = 2, max_workers: int = 5
) -> list[Page]:
    """Parallel BFS crawl using an async work queue with multiple Stagehand sessions.
    Each worker gets its own browser session and pulls URLs from a shared queue."""
    parsed_root = urlparse(root_url)
    base_domain = parsed_root.netloc

    # Shared state protected by asyncio.Lock (needed because multiple workers access concurrently)
    visited: dict[str, Page] = {}
    visited_lock = asyncio.Lock()
    counter = [0]  # Mutable list used as a counter so workers can increment it

    queue = asyncio.Queue()
    queue.put_nowait((root_url, 0))

    # Initialize the Stagehand REST client (used to create and manage browser sessions)
    stagehand = Stagehand(
        browserbase_api_key=BROWSERBASE_API_KEY,
        model_api_key=CEREBRAS_API_KEY,
    )

    print(f"Starting {max_workers} crawl workers...")

    workers = [
        asyncio.create_task(
            _crawl_worker(
                i, queue, visited, visited_lock, base_domain,
                max_pages, max_depth, stagehand, counter,
            )
        )
        for i in range(max_workers)
    ]

    await asyncio.gather(*workers)

    result = {url: pg for url, pg in visited.items() if pg is not None}
    print(f"Crawled {len(result)} pages\n")
    return list(result.values())


# ── Phase 2: Discover GitHub Repository ───────────────────────────


def discover_repo_from_pages(pages: list[Page]) -> Optional[str]:
    """Search crawled page content and links for a GitHub repository URL.
    This is the fast path — no browser session needed, just regex over existing data."""
    github_pattern = re.compile(r"https?://github\.com/[\w\-]+/[\w\-]+")

    # Check both aria tree text and extracted links for GitHub URLs
    for pg in pages:
        matches = github_pattern.findall(pg.content)
        for m in matches:
            parts = m.rstrip("/").split("/")
            if len(parts) >= 5:
                print(f"  Found repo in aria tree: {m}")
                return m

        for link in pg.links:
            href = link.get("href", "")
            matches = github_pattern.findall(href)
            for m in matches:
                parts = m.rstrip("/").split("/")
                if len(parts) >= 5:
                    print(f"  Found repo in page links: {m}")
                    return m

    print("  No GitHub link found in aria trees or links")
    return None


async def discover_repo_with_agent(root_url: str, stagehand: Stagehand) -> Optional[str]:
    """Fallback: use a Stagehand agent to find the GitHub repo link on a dynamic page.
    Some sites render the GitHub link via JavaScript, so regex alone won't find it."""
    print("  Using Stagehand agent to find GitHub repo link...")

    session_id = None
    browser = None
    pw = None

    try:
        # Start a new browser session for the agent
        start_response = stagehand.sessions.start(model_name="cerebras/llama-3.3-70b")
        session_id = start_response.data.session_id
        live_url = f"https://www.browserbase.com/sessions/{session_id}"
        print(f"  Live session (agent): {live_url}")

        # Connect Playwright via CDP (same BYOB pattern as crawl workers)
        cdp_url = (
            f"wss://connect.browserbase.com?apiKey={BROWSERBASE_API_KEY}&sessionId={session_id}"
        )

        pw = await async_playwright().start()
        browser = await pw.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        # Navigate and wait for JavaScript to render
        stagehand.sessions.navigate(id=session_id, url=root_url)
        await page.wait_for_timeout(3000)

        # Use the Stagehand agent to autonomously click around and find the GitHub link
        agent_result = stagehand.sessions.execute(
            id=session_id,
            agent_config={
                "model": {
                    "modelName": "cerebras/llama-3.3-70b",
                    "apiKey": CEREBRAS_API_KEY,
                },
            },
            execute_options={
                "instruction": (
                    "Find the GitHub repository link on this page. It may be in a button, "
                    "footer, navigation, or generated by JavaScript. Click any button that "
                    "might reveal it (like a 'Source' or 'GitHub' button). "
                    "Return the full GitHub URL."
                ),
                "max_steps": 10,
            },
        )

        # Parse the agent's response for a GitHub URL
        result_text = str(agent_result.data) if agent_result.data else ""
        github_pattern = re.compile(r"https?://github\.com/[\w\-]+/[\w\-]+")
        matches = github_pattern.findall(result_text)

        if matches:
            print(f"  Agent found repo: {matches[0]}")
            return matches[0]

        # Fallback: check the aria tree after the agent has interacted with the page
        extract_response = stagehand.sessions.extract(id=session_id)
        result = extract_response.data.result
        matches = github_pattern.findall(str(result))
        if matches:
            print(f"  Found repo in post-agent aria tree: {matches[0]}")
            return matches[0]

        print("  Agent could not find GitHub repo link")
        return None

    except Exception as e:
        print(f"  Agent error: {e}")
        return None
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
        if session_id:
            try:
                stagehand.sessions.end(id=session_id)
            except Exception:
                pass


# ── Phase 3: Clone Repository ─────────────────────────────────────


def clone_repo(repo_url: str) -> Optional[Path]:
    """Clone a GitHub repo to a temp directory. Returns the path."""
    repo_url = repo_url.rstrip("/")
    clone_url = repo_url + ".git" if not repo_url.endswith(".git") else repo_url
    repo_name = repo_url.split("/")[-1]
    clone_dir = Path(tempfile.mkdtemp(prefix="docs-verify-")) / repo_name

    print(f"  Cloning {repo_url} -> {clone_dir}")
    try:
        subprocess.run(
            ["git", "clone", clone_url, str(clone_dir)],
            capture_output=True, text=True, timeout=60, check=True,
        )
        print(f"  Cloned successfully")
        return clone_dir
    except subprocess.CalledProcessError as e:
        print(f"  Clone failed: {e.stderr.strip()}")
        return None
    except Exception as e:
        print(f"  Clone error: {e}")
        return None


# ── Phase 4: Verification Agent (Cerebras tool calling) ──────────

# Tools the Cerebras verification agent can call to inspect the cloned codebase.
# Each tool maps to a function in _execute_verification_tool().
VERIFICATION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "grep_codebase",
            "description": "Search for a pattern (regex) across all source files in the codebase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "A function name, class name, variable, or regex pattern",
                    }
                },
                "required": ["pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the full contents of a source file from the codebase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative path to the file, e.g. 'src/auth.py'",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List all files in the codebase.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

VERIFICATION_SYSTEM_PROMPT = """You are a documentation accuracy verifier. Your job is to check whether \
a documentation page is accurate against the actual source code of the project.

You have access to tools that let you search and read the codebase. Use them to verify every claim \
in the documentation:
- Function signatures (names, parameters, defaults, return types)
- Class constructors and their parameters
- Method names and their existence
- Code examples (do they use the correct API?)
- Endpoint paths and constants
- Data model fields

For each issue you find, report it with:
- type: one of "outdated", "wrong_signature", "removed_function", "missing_parameter", \
"renamed_method", "wrong_endpoint", "missing_function"
- severity: "critical" for removed/renamed APIs, "high" for wrong signatures/params, \
"medium" for other inaccuracies
- description: what is wrong
- suggestion: what the correct version should be (based on source code)
- context: the specific text in the docs that is wrong

Be thorough. Check EVERY function, parameter, code example, and data model mentioned in the docs.
Also check if the codebase has new functions/methods NOT mentioned in the docs.

Use one tool at a time. Return your findings as a JSON object: {"issues": [...]}"""


def _execute_verification_tool(name: str, args: dict, codebase_path: Path) -> str:
    """Execute a verification tool call against the cloned codebase."""
    if name == "grep_codebase":
        pattern = args.get("pattern", "")
        try:
            result = subprocess.run(
                ["grep", "-rn", pattern, str(codebase_path)],
                capture_output=True, text=True, timeout=10,
            )
            output = result.stdout.strip()
            if not output:
                return f"No matches found for pattern: {pattern}"
            output = output.replace(str(codebase_path) + "/", "")
            return output[:4000]
        except Exception as e:
            return f"Error: {e}"

    elif name == "read_file":
        path = args.get("path", "")
        full_path = codebase_path / path
        if not full_path.exists():
            return f"File not found: {path}"
        try:
            return full_path.read_text()[:8000]
        except Exception as e:
            return f"Error reading file: {e}"

    elif name == "list_files":
        files = []
        for p in sorted(codebase_path.rglob("*")):
            if p.is_file() and not any(
                part.startswith(".") for part in p.relative_to(codebase_path).parts
            ):
                files.append(str(p.relative_to(codebase_path)))
        return "\n".join(files)

    return f"Unknown tool: {name}"


def _get_codebase_listing(codebase_path: Path) -> str:
    """Get a file listing for the codebase."""
    files = []
    for p in sorted(codebase_path.rglob("*")):
        if p.is_file() and not any(
            part.startswith(".") for part in p.relative_to(codebase_path).parts
        ):
            files.append(str(p.relative_to(codebase_path)))
    return "\n".join(files)


def verify_page(
    pg: Page,
    llm: OpenAI,
    codebase_path: Path,
    file_listing: str,
    page_num: int,
    total: int,
    max_turns: int = 10,
) -> list[Issue]:
    """Run the Cerebras verification agent on a single page's documentation content.
    The agent uses tool calling to grep and read the source code, then reports inaccuracies."""
    short_url = pg.url.split("/")[-1] or pg.url.split("/")[-2] or "index"

    if pg.title == "[Error]":
        print(f"  [{page_num}/{total}] Skip:  {short_url} (crawl error)")
        return [
            Issue(
                url=pg.url, type="error", severity="high",
                description="Page failed to load during crawl",
                suggestion="Check URL accessibility", context=pg.content[:100],
            )
        ]

    # Build the conversation with system prompt + page content for the agent
    messages = [
        {"role": "system", "content": VERIFICATION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Here are the files in the codebase:\n{file_listing}\n\n"
                f"Now verify this documentation page against the codebase. "
                f"The docs may be outdated — check every function, parameter, and code example. "
                f"Use one tool at a time.\n\n"
                f"Page URL: {pg.url}\nPage title: {pg.title}\n\n"
                f"Page content (aria tree):\n{pg.content[:12000]}"
            ),
        },
    ]

    # Multi-turn tool calling loop: the agent greps/reads code, then returns findings as JSON
    print(f"  [{page_num}/{total}] Verifying {short_url}...", end="", flush=True)
    turns_used = 0

    for turn in range(max_turns):
        try:
            # Ask the model to verify the docs, allowing it to call tools
            resp = llm.chat.completions.create(
                model=CEREBRAS_MODEL, messages=messages,
                tools=VERIFICATION_TOOLS, tool_choice="auto",
            )
        except Exception as e:
            # Some models return tool_use_failed when tool calling isn't supported — retry without tools
            if "tool_use_failed" in str(e):
                resp = llm.chat.completions.create(model=CEREBRAS_MODEL, messages=messages)
            else:
                raise

        msg = resp.choices[0].message
        messages.append(msg)
        turns_used += 1

        # If no tool calls, the agent is done — parse its JSON response
        if not msg.tool_calls:
            content = msg.content or ""
            issues = _parse_verification_response(content, pg.url)
            break
        else:
            # Execute each tool call and feed results back to the agent
            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments)
                print(f" {tc.function.name}", end="", flush=True)
                result = _execute_verification_tool(tc.function.name, args, codebase_path)
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
    else:
        # Force the agent to return its findings if it used all turns without finishing
        messages.append(
            {"role": "user", "content": "Provide your final JSON response now with all issues found."}
        )
        resp = llm.chat.completions.create(model=CEREBRAS_MODEL, messages=messages)
        issues = _parse_verification_response(resp.choices[0].message.content or "", pg.url)

    # Append broken links and anchors detected during crawl (Phase 1)
    for link in pg.broken_links:
        issues.append(
            Issue(
                url=pg.url, type="broken_link", severity="high",
                description=f"Broken link: {link.get('text', '?')} -> status {link.get('status', '?')}",
                suggestion="Fix or remove the link", context=link.get("url", ""),
            )
        )
    for anchor in pg.broken_anchors:
        issues.append(
            Issue(
                url=pg.url, type="broken_anchor", severity="medium",
                description=f"Broken anchor: #{anchor}",
                suggestion="Add missing ID or fix link", context=anchor,
            )
        )

    print(f" {len(issues)} issues ({turns_used} turns)")
    return issues


def _parse_verification_response(content: str, url: str) -> list[Issue]:
    """Parse the verification agent's JSON response into Issue objects."""
    json_match = re.search(r'\{[\s\S]*"issues"[\s\S]*\}', content)
    if not json_match:
        return []

    try:
        data = json.loads(json_match.group())
        issues = []
        for item in data.get("issues", []):
            issues.append(
                Issue(
                    url=url,
                    type=item.get("type", "outdated"),
                    severity=item.get("severity", "medium"),
                    description=item.get("description", ""),
                    suggestion=item.get("suggestion", ""),
                    context=item.get("context", ""),
                )
            )
        return issues
    except json.JSONDecodeError:
        return []


def verify_all(pages: list[Page], codebase_path: Path) -> list[Issue]:
    """Verify all pages against the cloned codebase using Cerebras tool calling.
    Pages are processed sequentially because each verification runs a multi-turn conversation."""
    all_issues = []
    file_listing = _get_codebase_listing(codebase_path)

    print(f"Verifying {len(pages)} pages against {codebase_path}")
    print(f"Codebase files:\n  {file_listing.replace(chr(10), chr(10) + '  ')}\n")

    # Cerebras uses an OpenAI-compatible API, so we use the OpenAI client with a custom base URL
    llm = OpenAI(
        base_url="https://api.cerebras.ai/v1",
        api_key=CEREBRAS_API_KEY,
        timeout=30.0,
    )

    for i, pg in enumerate(pages):
        issues = verify_page(pg, llm, codebase_path, file_listing, i + 1, len(pages))
        all_issues.extend(issues)

    print(f"\nDone: {len(all_issues)} issues across {len(pages)} pages")
    return all_issues


# ── Fallback Analysis (when no source repo is found) ─────────────
# When we can't find or clone the GitHub repo, we fall back to content-only analysis.
# This checks for outdated info, unclear writing, and missing context without source code.

ANALYSIS_PROMPT = """Current date and time: {current_datetime}

You are a documentation quality checker. Analyze the following accessibility tree
from a documentation page and identify content issues.

Look for: outdated information (check copyright years, old version numbers),
unclear writing, grammar errors, missing context.

When checking dates and years, remember that today is {current_datetime}.
A copyright showing the current year is CORRECT, not outdated.

Return your findings as a JSON object with an "issues" array. Each issue has:
- type: one of "outdated", "unclear", "grammar", "missing_context"
- severity: one of "critical", "high", "medium", "low"
- description: what the issue is
- suggestion: how to fix it
- context: the relevant text snippet

If no issues are found, return {{"issues": []}}.

Page URL: {url}
Page title: {title}

Accessibility tree:
{content}"""


async def analyze_page(
    pg: Page, llm: AsyncOpenAI, page_num: int, total: int, current_datetime: str,
) -> list[Issue]:
    """Analyze a single page by sending its aria tree to Cerebras."""
    short_url = pg.url.split("/")[-1] or pg.url.split("/")[-2] or "index"
    start = asyncio.get_event_loop().time()

    if pg.title == "[Error]":
        print(f"  [{page_num}/{total}] Skip:  {short_url} (crawl error)")
        return [
            Issue(
                url=pg.url, type="error", severity="high",
                description="Page failed to load during crawl",
                suggestion="Check URL accessibility", context=pg.content[:100],
            )
        ]

    try:
        prompt = ANALYSIS_PROMPT.format(
            current_datetime=current_datetime, url=pg.url,
            title=pg.title, content=pg.content[:12000],
        )

        resp = await llm.chat.completions.create(
            model=CEREBRAS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        raw = resp.choices[0].message.content
        data = json.loads(raw)
        issues = []
        for item in data.get("issues", []):
            issues.append(
                Issue(
                    url=pg.url,
                    type=item.get("type", "unclear"),
                    severity=item.get("severity", "medium"),
                    description=item.get("description", ""),
                    suggestion=item.get("suggestion", ""),
                    context=item.get("context", ""),
                )
            )
    except Exception as e:
        elapsed = asyncio.get_event_loop().time() - start
        print(f"  [{page_num}/{total}] Error: {short_url} — {e!s:.80} ({elapsed:.1f}s)")
        issues = []

    for link in pg.broken_links:
        issues.append(
            Issue(
                url=pg.url, type="broken_link", severity="high",
                description=f"Broken link: {link.get('text', '?')} -> status {link.get('status', '?')}",
                suggestion="Fix or remove the link", context=link.get("url", ""),
            )
        )
    for anchor in pg.broken_anchors:
        issues.append(
            Issue(
                url=pg.url, type="broken_anchor", severity="medium",
                description=f"Broken anchor: #{anchor}",
                suggestion="Add missing ID or fix link", context=anchor,
            )
        )

    elapsed = asyncio.get_event_loop().time() - start
    print(f"  [{page_num}/{total}] Done:  {short_url} — {len(issues)} issues ({elapsed:.1f}s)")
    return issues


async def analyze_all_parallel(pages: list[Page], max_workers: int = 10) -> list[Issue]:
    """Analyze all pages via direct Cerebras API calls (no browser sessions needed).
    Pages are processed in batches for concurrency without overwhelming the API."""
    all_issues = []
    current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"Current date/time sent to LLM: {current_datetime}")
    print(f"Analyzing {len(pages)} pages (max_workers={max_workers})\n")

    llm = AsyncOpenAI(
        base_url="https://api.cerebras.ai/v1",
        api_key=CEREBRAS_API_KEY,
    )

    for i in range(0, len(pages), max_workers):
        batch = pages[i : i + max_workers]
        batch_end = min(i + max_workers, len(pages))
        print(f"Batch [{i + 1}-{batch_end}/{len(pages)}]")

        tasks = [
            analyze_page(pg, llm, i + j + 1, len(pages), current_datetime)
            for j, pg in enumerate(batch)
        ]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for j, result in enumerate(batch_results):
            if isinstance(result, list):
                all_issues.extend(result)
            elif isinstance(result, Exception):
                page_url = batch[j].url.split("/")[-1] or "index"
                print(f"  Error: {page_url} — {result}")

        print()

    print(f"Done: {len(all_issues)} issues across {len(pages)} pages")
    return all_issues


# ── Display and Export ────────────────────────────────────────────


def print_summary(pages: list[Page], issues: list[Issue], root_url: str):
    """Print summary statistics to the terminal."""
    severity_counts = Counter(i.severity for i in issues)
    type_counts = Counter(i.type for i in issues)

    print(f"\n{'=' * 60}")
    print(f"  Documentation Analysis Summary")
    print(f"{'=' * 60}")
    print(f"  Site:           {root_url}")
    print(f"  Pages crawled:  {len(pages)}")
    print(f"  Total issues:   {len(issues)}")
    print(f"  Critical:       {severity_counts.get('critical', 0)}")
    print(f"  High:           {severity_counts.get('high', 0)}")
    print(f"  Medium:         {severity_counts.get('medium', 0)}")
    print(f"  Low:            {severity_counts.get('low', 0)}")
    print(f"  By type:        {', '.join(f'{t}: {c}' for t, c in type_counts.most_common())}")
    print(f"{'=' * 60}\n")


def print_issues(issues: list[Issue], severity_filter: str = None):
    """Print issues to the terminal."""
    filtered = [i for i in issues if severity_filter is None or i.severity == severity_filter]
    if not filtered:
        print("No issues found.")
        return

    for issue in filtered:
        page_name = issue.url.split("/")[-1] or "index"
        print(f"  [{issue.severity.upper()}] [{issue.type}] {page_name}")
        print(f"    {issue.description}")
        print(f"    Suggestion: {issue.suggestion}")
        if issue.context:
            print(f"    Context: {issue.context[:80]}")
        print()


def export_markdown(pages: list[Page], issues: list[Issue], root_url: str, filename: str = None) -> str:
    """Generate and save a markdown report."""
    if filename is None:
        filename = f"docs_report_{datetime.now().strftime('%Y%m%d_%H%M')}.md"

    severity_counts = Counter(i.severity for i in issues)

    report = f"""# Documentation Analysis Report

**Site:** {root_url}
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Pages:** {len(pages)} | **Issues:** {len(issues)}

## Summary

| Severity | Count |
|----------|-------|
| Critical | {severity_counts.get("critical", 0)} |
| High | {severity_counts.get("high", 0)} |
| Medium | {severity_counts.get("medium", 0)} |
| Low | {severity_counts.get("low", 0)} |

## Issues

"""
    for sev in ["critical", "high", "medium", "low"]:
        sev_issues = [i for i in issues if i.severity == sev]
        if sev_issues:
            report += f"### {sev.title()} ({len(sev_issues)})\n\n"
            for i in sev_issues:
                page_name = i.url.split("/")[-1] or "index"
                report += f"- **[{page_name}]** {i.type}: {i.description}\n"
                report += f"  - *{i.suggestion}*\n"
            report += "\n"

    with open(filename, "w") as f:
        f.write(report)

    print(f"Saved report to: {filename}")
    return report


# ── Main ──────────────────────────────────────────────────────────


async def main():
    """
    4-phase documentation checker:
    1. Crawl docs site via parallel Stagehand BYOB workers
    2. Discover the source GitHub repository from crawled pages
    3. Clone the repo locally
    4. Verify docs accuracy against source code using Cerebras tool-calling agent
    """
    # Accept target URL as CLI argument or use default
    docs_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL

    print(f"Target: {docs_url}")
    print(f"Model:  {CEREBRAS_MODEL}")
    print(f"Max pages: {MAX_PAGES}, Max depth: {MAX_DEPTH}\n")

    # Phase 1: Crawl the docs site using parallel browser sessions
    print("Phase 1: Crawling documentation site...")
    pages = await crawl(docs_url, max_pages=MAX_PAGES, max_depth=MAX_DEPTH, max_workers=MAX_CRAWL_WORKERS)

    # Phase 2: Try to find the source GitHub repo (regex first, then agent fallback)
    print("Phase 2: Discovering source repository...")
    repo_url = discover_repo_from_pages(pages)

    if not repo_url:
        # Regex didn't find a repo — try using a Stagehand agent to click around and find it
        stagehand = Stagehand(
            browserbase_api_key=BROWSERBASE_API_KEY,
            model_api_key=CEREBRAS_API_KEY,
        )
        repo_url = await discover_repo_with_agent(docs_url, stagehand)

    if repo_url:
        # Phase 3: Clone the repo so the verification agent can inspect source code
        print(f"\nPhase 3: Cloning repository...")
        codebase_path = clone_repo(repo_url)

        if codebase_path:
            # Phase 4: Run the Cerebras tool-calling agent to verify docs against source
            print(f"\nPhase 4: Verification agent...")
            issues = verify_all(pages, codebase_path)
        else:
            print("\nClone failed, falling back to basic analysis...")
            issues = await analyze_all_parallel(pages, max_workers=10)
    else:
        # No repo found — fall back to content-only analysis (no source code verification)
        print("\nNo source repo found, falling back to basic analysis...")
        issues = await analyze_all_parallel(pages, max_workers=10)

    # Display results and save markdown report
    print_summary(pages, issues, docs_url)
    print_issues(issues)
    export_markdown(pages, issues, docs_url)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as err:
        print(f"Application error: {err}")
        print("\nCommon issues:")
        print("  - Check .env file has CEREBRAS_API_KEY and BROWSERBASE_API_KEY")
        print("  - Ensure playwright is installed: playwright install chromium")
        print("Docs: https://docs.stagehand.dev/v3/sdk/python")
        exit(1)
