# Browserbase Fetch API: Value Prop One-Liner Generator

Extract a landing page's value proposition and produce a short personalized opener without launching
a browser. Browserbase Fetch API retrieves the page and returns schema-constrained JSON.

## Quickstart

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY to .env
uv sync
uv run python main.py
```

Set `TARGET_URL` to analyze another public landing page. The JSON output contains the source URL,
the extracted value proposition, and an opener of at most nine words beginning with “Your.”

Fetch API retrieves the raw HTTP response with a real-browser User-Agent; it does not create a browser
session or execute JavaScript. Use a browser fallback when the target's meaningful content is only
available after client-side rendering.

## Resources

- [Browserbase Fetch API](https://docs.browserbase.com/platform/fetch/overview)
- [Structured Fetch responses](https://docs.browserbase.com/platform/fetch/quickstart)
