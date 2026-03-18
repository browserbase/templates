# Stagehand + Browserbase: Image URL Download

## AT A GLANCE

- Goal: extract all image URLs from a page with Stagehand and download each image through the browser's direct connection.
- Browser-context downloads: `fetch()` runs inside the browser via `page.evaluate()` — no special proxy configuration needed. It automatically inherits any active Browserbase proxy and session cookies, so you get the same image the browser sees, even for auth-gated or same-origin-only URLs.
- AI-powered URL extraction: uses `extract()` with a typed Zod schema to reliably pull `<img>` src attributes and background image URLs from any page.
- Format-agnostic: uses `FileReader.readAsDataURL()` inside the browser to encode image bytes and detect the real MIME type — files are saved with the correct extension (`.jpg`, `.png`, `.svg`, `.webp`, etc.).
- Organized output: images are saved to `./images/<hostname>/` so runs against different sites never mix.
  Docs → https://docs.stagehand.dev/basics/extract

## GLOSSARY

- extract: pull structured data from a page using a natural language instruction and a Zod schema.
  Docs → https://docs.stagehand.dev/basics/extract
- page.evaluate: run a JavaScript function directly inside the browser context — inherits proxy, cookies, and headers.
  Docs → https://playwright.dev/docs/evaluating
- MAX_IMAGES: configurable cap (default: 10) on how many images to download per run. Set via the `MAX_IMAGES` env var or the constant at the top of `index.ts`.

## QUICKSTART

1. cd image-url-download
2. npm install
3. cp .env.example .env
4. Add your Browserbase API key, Project ID, and Google API key to .env
5. npm start \<url\> — e.g. `npm start https://www.browserbase.com`

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Navigates to the target URL
- Extracts all image URLs from the page using `extract()`
- Deduplicates URLs and caps at `MAX_IMAGES` (default: 10)
- Downloads each image via `fetch()` inside `page.evaluate()` — runs in the browser context so it automatically picks up any proxy or cookies without extra configuration — encoded via `FileReader.readAsDataURL()`
- Saves images to `./images/<hostname>/`, named `<url-segment>-<timestamp>.<ext>` with the extension derived from the real MIME type
- Logs per-image status (saved / failed) and a final summary count
- Closes session cleanly

## COMMON PITFALLS

- "Cannot find module": ensure all dependencies are installed with `npm install`
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY
- Empty images folder: some pages load images lazily — try scrolling the page before extraction, or increase the page load wait
- Zero images found: the page may use CSS background images not captured by `<img>` tags — adjust the extract instruction to target specific selectors
- CORS / auth-gated images: images behind login walls or strict CORS policies may fail in `page.evaluate()` — ensure you are authenticated before running the script
- MAX_IMAGES cap: if you need more than 10 images, set `MAX_IMAGES=50` in your .env or edit the constant at the top of `index.ts`
- Large pages: pages with hundreds of images may slow down `extract()` — use MAX_IMAGES to limit the download set

## USE CASES

• Asset archiving: bulk-save product images, thumbnails, or media assets from websites you own or have permission to scrape.
• Visual regression testing: download reference images from a staging environment to diff against production.
• Dataset collection: gather labeled image sets from public pages for ML training pipelines.
• Auth-gated media: download images from pages that require login — the browser session handles authentication automatically.

## NEXT STEPS

• Scroll before extracting: call `page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))` before `extract()` to trigger lazy-loaded images.
• Concurrent downloads: fan out the `page.evaluate` fetch calls with `Promise.allSettled` for faster bulk downloads.
• Metadata CSV: write a `manifest.csv` alongside the images recording original URL, filename, MIME type, byte size, and download timestamp.
• Extend MIME support: add entries to the `MIME_TO_EXT` map at the top of `index.ts` for any formats not already covered.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
