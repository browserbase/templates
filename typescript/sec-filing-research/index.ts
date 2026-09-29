// Browserbase Fetch API: SEC Filing Research

import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";

const SEARCH_QUERY = process.env.SEARCH_QUERY ?? "Apple Inc";
const NUM_FILINGS = positiveInteger("NUM_FILINGS", 5);
const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

type CompanyTicker = {
  cik_str: number;
  ticker: string;
  title: string;
};

type Submissions = {
  name: string;
  cik: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      primaryDocDescription: string[];
      accessionNumber: string[];
      fileNumber: string[];
      primaryDocument: string[];
    };
  };
};

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rawJson(response: { statusCode: number; content: string | Record<string, unknown> }) {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`SEC returned HTTP ${response.statusCode}`);
  }
  if (typeof response.content !== "string") {
    throw new Error("Expected SEC to return raw JSON content");
  }
  return JSON.parse(response.content) as unknown;
}

async function resolveCik(bb: Browserbase, query: string): Promise<string> {
  if (/^\d+$/.test(query.trim())) return query.trim().padStart(10, "0");

  const response = await bb.fetchAPI.create({
    url: COMPANY_TICKERS_URL,
    format: "raw",
    allowRedirects: true,
  });
  const tickerFile = rawJson(response) as Record<string, CompanyTicker>;
  const target = normalized(query);
  const company = Object.values(tickerFile).find(
    (candidate) =>
      normalized(candidate.ticker) === target || normalized(candidate.title) === target,
  );
  if (!company)
    throw new Error(`No exact SEC company or ticker match for ${JSON.stringify(query)}`);
  return String(company.cik_str).padStart(10, "0");
}

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  const bb = new Browserbase({ apiKey });
  console.log(`Resolving ${JSON.stringify(SEARCH_QUERY)} through the official SEC company list...`);
  const cik = await resolveCik(bb, SEARCH_QUERY);
  const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;

  console.log(`Fetching recent filings for CIK ${cik}...`);
  const response = await bb.fetchAPI.create({
    url: submissionsUrl,
    format: "raw",
    allowRedirects: true,
  });
  const submissions = rawJson(response) as Submissions;
  const recent = submissions.filings?.recent;
  if (!submissions.name || !recent?.form?.length) {
    throw new Error("SEC submissions response did not contain recent filings");
  }

  const filings = recent.form.slice(0, NUM_FILINGS).map((form, index) => ({
    type: form,
    date: recent.filingDate[index] ?? "",
    description: recent.primaryDocDescription[index] ?? "",
    accessionNumber: recent.accessionNumber[index] ?? "",
    fileNumber: recent.fileNumber[index] ?? "",
    primaryDocument: recent.primaryDocument[index] ?? "",
  }));
  const result = {
    company: submissions.name,
    cik,
    searchQuery: SEARCH_QUERY,
    sourceUrl: submissionsUrl,
    filings,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("SEC filing research failed:", error);
  process.exit(1);
});
