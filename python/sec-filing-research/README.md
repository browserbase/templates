# Browserbase Fetch API: SEC Filing Research

Resolve a company name, ticker, or CIK through the SEC's official company list, then retrieve its
recent filing metadata from the SEC submissions dataset. No browser UI automation is required.

## Quickstart

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY to .env
uv sync
uv run python main.py
```

Configuration:

- `SEARCH_QUERY`: exact company name, ticker, or CIK; defaults to `Apple Inc`.
- `NUM_FILINGS`: number of recent filings to return; defaults to `5`.

The result includes the official company name, padded CIK, source URL, form type, filing date,
description, accession number, file number, and primary document.

## Resources

- [Browserbase Fetch API](https://docs.browserbase.com/platform/fetch/overview)
- [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
