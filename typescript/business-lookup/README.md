# Browserbase Fetch API: Business Lookup

Retrieve an official San Francisco business record without opening a JSON endpoint in a browser.
The template uses Browserbase Fetch API, selects the exact DBA match, and returns normalized JSON.

## Quickstart

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY to .env
pnpm install
pnpm start
```

Set `BUSINESS_NAME` to query a different DBA. The default is `Jalebi Street`.

The result includes the official source URL, business account and location identifiers, ownership,
address, dates, neighborhood, self-reported NAICS code, and license classification when the dataset
provides them.

## Resources

- [Browserbase Fetch API](https://docs.browserbase.com/platform/fetch/overview)
- [SF Registered Business Locations](https://data.sfgov.org/Businesses-and-Economic-Development/Registered-Business-Locations-San-Francisco/g8m3-pdis)
