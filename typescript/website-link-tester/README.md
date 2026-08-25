# Browserbase Fetch API: Website Link Tester

Find broken links without launching one browser session per URL. The template fetches a homepage,
parses its HTTP(S) links, and checks each destination through Browserbase Fetch API.

## Quickstart

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY to .env
npm install
npm start
```

Configuration:

- `TARGET_URL`: homepage to inspect; defaults to `https://www.browserbase.com`.
- `MAX_LINKS`: maximum unique links to check; defaults to `25`.
- `MAX_CONCURRENT_LINKS`: parallel Fetch API calls; defaults to `5`.
- `FETCH_ATTEMPTS`: attempts for transport errors and 5xx responses; defaults to `2`.

The JSON report includes the target status code, content type, HTML title, and any request error for
each link. The process exits nonzero when at least one checked link fails.

Browserbase Fetch retrieves the raw HTTP response with a real-browser User-Agent; it does not create
a browser session or execute page JavaScript. For sites whose links exist only after client-side
rendering, use a Browserbase browser to discover the rendered links and keep Fetch API for the
individual status checks.

## Resources

- [Browserbase Fetch API](https://docs.browserbase.com/platform/fetch/overview)
- [Browserbase SDK for Node](https://github.com/browserbase/sdk-node)
