# Stagehand + Browserbase: Business Lookup

Look up a business in San Francisco's Registered Business Lookup and read its published registration details using Stagehand V3 browser locators.

## How it works

1. Open the registry in a Browserbase session.
2. Find the business in the DBA Name filter, select its checkbox, and apply the filter.
3. Wait for the filtered row and require exactly one matching location.
4. Read the labeled grid cells and require the requested DBA name, a business account number, and a location ID.
5. Scroll the registry's virtualized columns and read the dates, neighborhood, license description, and self-reported NAICS code directly from their cells.
6. Print the record as JSON and close the session.

Filtering and record retrieval use the registry's DOM controls and labeled grid cells. The template makes no model calls; `BROWSERBASE_API_KEY` is the only credential required.

## Running the template

Use a TypeScript environment with Stagehand V3 (`@browserbasehq/stagehand@3.6.0`), `dotenv`, and a TypeScript runner such as `tsx`. Provide `BROWSERBASE_API_KEY` through your environment or secret manager, then run `index.ts` with your TypeScript runner.

Set `businessName` near the top of `index.ts` to the business's DBA name. The default is `Jalebi Street`.

In Playground, choose **Search business registries for KYC** and run the template. Playground supplies the session and Browserbase credentials.

## Expected output

The JSON record includes the DBA and ownership names, business account number, location ID, street address, business start/end dates, neighborhood, license code description, and self-reported NAICS code.

Blank registry cells are returned as `null`. For example, a business can have a license description but no self-reported NAICS code. The template reports those fields separately and does not infer an industry code from the license description.

## Troubleshooting

- If the business is not available in the DBA filter or the results do not update, the template times out with a description of the missing control or result.
- If several locations share the DBA name, narrow the registry filters before extracting one record. This template deliberately rejects multiple matches.
- If the row does not match the requested DBA name or lacks an account number or location ID, the template reports an error. A missing column also causes an error; only rendered blank cells become `null`.
- Browser and lookup failures include their error message. Check that your Browserbase credentials are valid and the registry is available.

## Resources

- [Stagehand V3 documentation](https://docs.stagehand.dev/v3/first-steps/introduction)
- [San Francisco Registered Business Lookup](https://data.sf.gov/stories/s/Registered-Business-Lookup/k6sk-2y6w/)
- [Browserbase Playground](https://www.browserbase.com/playground)
