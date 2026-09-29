# Browserbase Fetch API: Philadelphia Council Events

Fetch the public Philadelphia City Council calendar and return current-year event names, dates, and
times as schema-constrained JSON. The server-rendered calendar does not require browser interaction.

## Quickstart

```bash
cp .env.example .env
# Add BROWSERBASE_API_KEY to .env
npm install
npm start
```

The template automatically uses the current UTC year and prints the official source URL with its
event results.

## Resources

- [Browserbase Fetch API](https://docs.browserbase.com/platform/fetch/overview)
- [Philadelphia City Council calendar](https://phila.legistar.com/Calendar.aspx)
