# Stagehand + Browserbase: Image URL Download

## AT A GLANCE

- Goal: extract all image URLs from a page with Stagehand and download each image through the browser's direct connection.
- Browser-context downloads: `context.request.get()` sends requests through the Playwright browser context — no special proxy configuration needed. It automatically inherits any active Browserbase proxy and session cookies, so you get the same image the browser sees, even for auth-gated or same-origin-only URLs (e.g. Next.js `/_next/image`).
- AI-powered URL extraction: uses `extract()` with a JSON schema to reliably pull `<img>` src attributes and background image URLs from any page.
- Format-agnostic: uses the `Content-Type` response header to detect the real MIME type — files are saved with the correct extension (`.jpg`, `.png`, `.svg`, `.webp`, etc.).
- Organized output: images are saved to `./images/<hostname>/` so runs against different sites never mix.
- Why Playwright is used alongside Stagehand: this template connects both Stagehand and Playwright to the **same** Browserbase session via CDP. The TypeScript SDK exposes `stagehand.context.pages()[0]` for direct Playwright access, but the Python SDK does not. Playwright is added here for reliable navigation waits (`page.goto(wait_until="networkidle")` blocks until the page is fully rendered, unlike the Python SDK's non-blocking `sessions.navigate()`) and proxy-aware downloads (`context.request.get()` inherits the browser context's proxy and cookies, avoiding 403s that a plain `httpx` call would get on auth-gated URLs).
  Docs → https://docs.stagehand.dev/basics/extract

## GLOSSARY

- extract: pull structured data from a page using a natural language instruction and a JSON schema.
  Docs → https://docs.stagehand.dev/basics/extract
- context.request.get: make an HTTP request through the Playwright browser context — inherits the Browserbase proxy, cookies, and session headers. Used here instead of in-browser `fetch()` because the Python Stagehand SDK does not expose `page.evaluate()` directly.
  Docs → https://playwright.dev/python/docs/api/class-apirequestcontext
- IMAGE_URL_SCHEMA: plain dict JSON schema passed to `extract()`. Uses `"format": "uri"` on array items — the Python equivalent of `z.string().url()` in the TypeScript template — which signals to the model to return actual URL strings.
- MAX_IMAGES: configurable cap (default: 10) on how many images to download per run. Set via the `MAX_IMAGES` env var or the constant at the top of `main.py`.

## QUICKSTART

1. cd image-url-download
2. cp .env.example .env
3. Add BROWSERBASE_API_KEY to .env
4. uv run main.py \<url\> — e.g. `uv run main.py https://www.browserbase.com`

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Connects Playwright to the same session via CDP
- Navigates to the target URL and waits for the page to fully render
- Extracts all image URLs from the page using `extract()`
- Deduplicates URLs and caps at `MAX_IMAGES` (default: 10)
- Downloads each image via `context.request.get()` — runs through the browser context so it automatically picks up any proxy or cookies without extra configuration
- Saves images to `./images/<hostname>/`, named `<url-segment>-<timestamp>.<ext>` with the extension derived from the `Content-Type` header
- Logs per-image status (saved / failed) and a final summary count
- Closes session cleanly

## COMMON PITFALLS

- `ModuleNotFoundError`: ensure all dependencies are installed — `uv run` handles this automatically via `pyproject.toml`
- Missing credentials: verify .env contains BROWSERBASE_API_KEY
- Zero images found: the page may load images lazily or use CSS background images — try scrolling before extraction with `sessions.act()`, or refine the extract instruction
- Download failures (403): some images require the full browser session context — ensure the Playwright CDP connection is established before downloading
- MAX_IMAGES cap: if you need more than 10 images, set `MAX_IMAGES=50` in your .env or edit the constant at the top of `main.py`
- Large pages: pages with hundreds of images may slow down `extract()` — use MAX_IMAGES to limit the download set

## USE CASES

• Asset archiving: bulk-save product images, thumbnails, or media assets from websites you own or have permission to scrape.
• Visual regression testing: download reference images from a staging environment to diff against production.
• Dataset collection: gather labeled image sets from public pages for ML training pipelines.
• Auth-gated media: download images from pages that require login — the browser session handles authentication automatically.

## NEXT STEPS

• Scroll before extracting: use `sessions.act()` to scroll the page before `extract()` to trigger lazy-loaded images.
• Concurrent downloads: fan out the `context.request.get()` calls with `asyncio.gather()` for faster bulk downloads.
• Metadata CSV: write a `manifest.csv` alongside the images recording original URL, filename, MIME type, byte size, and download timestamp.
• Extend MIME support: add entries to the `MIME_TO_EXT` dict at the top of `main.py` for any formats not already covered.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
