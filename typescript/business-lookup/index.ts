// Browserbase Fetch API: Business Lookup - See README.md for full documentation

import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";
import { z } from "zod/v4";

const BUSINESS_NAME = process.env.BUSINESS_NAME ?? "Jalebi Street";
const DATASET_URL = "https://data.sfgov.org/resource/g8m3-pdis.json";

const RawBusinessSchema = z
  .object({
    dba_name: z.string(),
    ownership_name: z.string().optional(),
    ttxid: z.string(),
    uniqueid: z.string().optional(),
    full_business_address: z.string().optional(),
    dba_start_date: z.string().optional(),
    dba_end_date: z.string().optional(),
    neighborhoods_analysis_boundaries: z.string().optional(),
    self_reported_naics_code: z.string().optional(),
    lic: z.string().optional(),
    lic_code_description: z.string().optional(),
  })
  .passthrough();
const BusinessSchema = z.object({
  dbaName: z.string(),
  ownershipName: z.string().nullable(),
  businessAccountNumber: z.string(),
  locationId: z.string().nullable(),
  streetAddress: z.string().nullable(),
  businessStartDate: z.string().nullable(),
  businessEndDate: z.string().nullable(),
  neighborhood: z.string().nullable(),
  naicsCode: z.string().nullable(),
  licenseCode: z.string().nullable(),
  licenseCodeDescription: z.string().nullable(),
  sourceUrl: z.string().url(),
});

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  const sourceUrl = new URL(DATASET_URL);
  sourceUrl.searchParams.set("$q", BUSINESS_NAME);
  sourceUrl.searchParams.set("$limit", "5");

  console.log(`Fetching official SF Open Data records for ${JSON.stringify(BUSINESS_NAME)}...`);
  const bb = new Browserbase({ apiKey });
  const response = await bb.fetchAPI.create({
    url: sourceUrl.toString(),
    format: "raw",
    allowRedirects: true,
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`SF Open Data returned HTTP ${response.statusCode}`);
  }
  if (typeof response.content !== "string") {
    throw new Error("Expected a raw JSON response from SF Open Data");
  }

  const records = z.array(RawBusinessSchema).parse(JSON.parse(response.content));
  const record = records.find(
    (candidate) =>
      candidate.dba_name.localeCompare(BUSINESS_NAME, undefined, {
        sensitivity: "accent",
      }) === 0,
  );
  if (!record) {
    throw new Error(`No exact DBA record found in ${records.length} returned records`);
  }

  const business = BusinessSchema.parse({
    dbaName: record.dba_name,
    ownershipName: record.ownership_name ?? null,
    businessAccountNumber: record.ttxid,
    locationId: record.uniqueid ?? null,
    streetAddress: record.full_business_address ?? null,
    businessStartDate: record.dba_start_date ?? null,
    businessEndDate: record.dba_end_date ?? null,
    neighborhood: record.neighborhoods_analysis_boundaries ?? null,
    naicsCode: record.self_reported_naics_code ?? null,
    licenseCode: record.lic ?? null,
    licenseCodeDescription: record.lic_code_description ?? null,
    sourceUrl: sourceUrl.toString(),
  });

  console.log(JSON.stringify(business, null, 2));
}

main().catch((error) => {
  console.error("Business lookup failed:", error);
  process.exit(1);
});
