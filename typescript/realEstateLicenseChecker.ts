/**
 * Stagehand + Browserbase: Data Extraction with Structured Schemas
 *
 * AT A GLANCE
 * - Goal: show how to extract structured, validated data from websites using Stagehand + Zod.
 * - Data Extraction: automate navigation, form submission, and structured scraping in one flow.
 * - Schema Validation: enforce type safety and consistency with Zod schemas.
 * - Practical Example: verify California real estate license details with a typed output object.
 *
 * GLOSSARY
 * - act: perform UI actions from a prompt (type, click, navigate).
 *   Docs → https://docs.stagehand.dev/basics/act
 * - extract: pull structured data from web pages into validated objects.
 *   Docs → https://docs.stagehand.dev/basics/extract
 * - schema: a Zod definition that enforces data types, optional fields, and validation rules.
 *   Docs → https://zod.dev/
 * - form automation: filling and submitting inputs to trigger results before extraction.
 * - structured scraping: extracting consistent, typed data that can flow into apps, CRMs, or compliance systems.
 *
 *
 * QUICKSTART
 *  1) pnpm init
 *  2) pnpm add @browserbasehq/stagehand dotenv @types/node zod
 *     pnpm add -D typescript && pnpm tsc --init
 *  3) Create .env with:
 *       BROWSERBASE_PROJECT_ID=...
 *       BROWSERBASE_API_KEY=...
 *  4) Compile + run:
 *       pnpm tsc && node product.js
 *
 * EXPECTED OUTPUT
 * - Navigates to California DRE license verification website
 * - Fills in license ID and submits form
 * - Extracts structured license data using Zod schema
 * - Returns typed object with license verification details
 *
 * COMMON PITFALLS
 * - "Cannot find module 'dotenv'": ensure pnpm install ran successfully
 * - Missing API key: verify .env is loaded and file is not committed
 * - Schema validation errors: ensure extracted data matches Zod schema structure
 * - Form submission failures: check if website structure has changed
 */

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// License verification variables
const variables = {
  input1: "02237476" // DRE License ID to search for
};

async function main() {
  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE", // Use Browserbase cloud browsers for reliable automation.
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug 
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
    // https://docs.stagehand.dev/configuration/logging
  });

  // Initialize browser session to start data extraction process.
  await stagehand.init();
  console.log(`Stagehand Session Started`);
  
  // Provide live session URL for debugging and monitoring extraction process.
  console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

  const page = stagehand.page;

  // Navigate to California DRE license verification website for data extraction.
  console.log('Navigating to: https://www2.dre.ca.gov/publicasp/pplinfo.asp');
  await page.goto('https://www2.dre.ca.gov/publicasp/pplinfo.asp'); 
  
  // Fill in license ID to search for specific real estate professional.
  console.log(
    `Performing action: type ${variables.input1} into the License ID input field`,
  );
  await page.act(`type ${variables.input1} into the License ID input field`); 
  
  // Submit search form to retrieve license verification data.
  console.log(`Performing action: click the Find button`);
  await page.act(`click the Find button`); 
  
  // Extract structured license data using Zod schema for type safety and validation.
  console.log(
    `Extracting: extract all the license verification details for DRE#02237476`,
  );
  const extractedData4 = await page.extract({
    instruction: `extract all the license verification details for DRE#02237476`,
    schema: z.object({
      licenseType: z.string().optional(), // Type of real estate license
      name: z.string().optional(), // License holder's full name
      mailingAddress: z.string().optional(), // Current mailing address
      licenseId: z.string().optional(), // Unique license identifier
      expirationDate: z.string().optional(), // License expiration date
      licenseStatus: z.string().optional(), // Current status (active, expired, etc.)
      salespersonLicenseIssued: z.string().optional(), // Date salesperson license was issued
      formerNames: z.string().optional(), // Any previous names used
      responsibleBroker: z.string().optional(), // Associated broker name
      brokerLicenseId: z.string().optional(), // Broker's license ID
      brokerAddress: z.string().optional(), // Broker's business address
      disciplinaryAction: z.string().optional(), // Any disciplinary actions taken
      otherComments: z.string().optional(), // Additional relevant information
    }),
  });
  console.log('Extracted:', extractedData4); 

  // Always close session to release resources and clean up.
  await stagehand.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * USE CASES
 *  •	License & credential verification: Extract and validate professional license data from regulatory portals.
 *  •	Compliance automation: Monitor status changes (active, expired, disciplinary) for risk and regulatory workflows.
 *  •	Structured research: Collect validated datasets from government or industry registries for BI or due diligence.
 * 
 * NEXT STEPS
 *  •	Expand schema coverage: Add more fields (disciplinary actions, broker info, historical data) for richer records.
 *  •	Scale across sources: Point the same flow at other jurisdictions, databases, or professional directories.
 *  •	Persist & integrate: Store structured results in a database or push directly into CRM/compliance systems.
 * 
 * HELPFUL RESOURCES
 * 📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
 * 🎮 Browserbase:        https://www.browserbase.com
 * 📧 Need help?          support@browserbase.com
 */
