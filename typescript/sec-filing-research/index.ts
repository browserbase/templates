// Stagehand + Browserbase: SEC Filing Downloader - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Search query - can be company name, ticker symbol, or CIK number
// Examples: "Apple Inc", "AAPL", "0000320193"
const SEARCH_QUERY = "Apple Inc";

// Number of filings to retrieve
const NUM_FILINGS = 5;

// Schema for extracted filing data
const FilingSchema = z.object({
  filings: z.array(
    z.object({
      type: z.string().describe("Filing type (e.g., 10-K, 10-Q, 8-K)"),
      date: z.string().describe("Filing date in YYYY-MM-DD format"),
      description: z.string().describe("Full description of the filing"),
      accessionNumber: z.string().describe("SEC accession number"),
      fileNumber: z.string().optional().describe("File/Film number"),
    }),
  ),
});

// Schema for company info extraction
const CompanyInfoSchema = z.object({
  companyName: z.string().describe("Official company name"),
  cik: z.string().describe("Central Index Key (CIK) number"),
});

// Result shape returned after extracting company and filing metadata from SEC EDGAR
interface SECFilingResult {
  company: string;
  cik: string;
  searchQuery: string;
  filings: Array<{
    type: string;
    date: string;
    description: string;
    accessionNumber: string;
    fileNumber: string;
  }>;
}

/**
 * Searches SEC EDGAR for a company (by name, ticker, or CIK) and extracts
 * recent filing metadata: type, date, description, accession number, file number.
 * Uses Stagehand + Browserbase for AI-powered browser automation.
 */
async function main(): Promise<void> {
  console.log("Starting SEC Filing Downloader...");
  console.log(`Search query: ${SEARCH_QUERY}`);
  console.log(`Retrieving ${NUM_FILINGS} most recent filings\n`);

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 1,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "google/gemini-2.5-flash",
  });

  try {
    // Initialize browser session
    await stagehand.init();
    console.log("Stagehand initialized successfully!");

    const page = stagehand.context.pages()[0];

    // Provide live session URL for debugging and monitoring
    if (stagehand.browserbaseSessionId) {
      console.log(`Live View: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);
    }

    // Navigate to modern SEC EDGAR company search page
    console.log("\nNavigating to SEC EDGAR...");
    await page.goto("https://www.sec.gov/edgar/searchedgar/companysearch.html", {
      waitUntil: "domcontentloaded",
    });

    // Enter search query in the Company and Person Lookup search box
    console.log(`Searching for: ${SEARCH_QUERY}`);
    await stagehand.act(`Click on the Company and Person Lookup search textbox`);
    await stagehand.act(`Type "${SEARCH_QUERY}" in the search field`);

    // Submit search to load company results
    await stagehand.act("Click the search submit button");

    // Select the matching company from results to view their filings page
    console.log("Selecting the correct company from results...");
    await stagehand.act(`Click on "${SEARCH_QUERY}" in the search results to view their filings`);

    // Extract company information from the filings page
    console.log("Extracting company information...");
    let companyInfo = { companyName: SEARCH_QUERY, cik: "Unknown" };

    try {
      const extractedInfo = await stagehand.extract(
        "Extract the company name and CIK number from the page header or company information section. The CIK should be a numeric identifier.",
        CompanyInfoSchema,
      );
      if (extractedInfo && extractedInfo.companyName) {
        companyInfo = extractedInfo;
      }
    } catch (error) {
      // Fallback to search query if extraction fails (e.g. page layout differs)
      console.log("Could not extract company info, using search query as company name:", error);
    }

    // Extract filing metadata from the filings table using structured schema
    console.log(`Extracting the ${NUM_FILINGS} most recent filings...`);
    const filingsData = await stagehand.extract(
      `Extract the ${NUM_FILINGS} most recent SEC filings from the filings table. For each filing, get: the filing type (column: Filings, like 10-K, 10-Q, 8-K), the filing date (column: Filing Date), description, accession number (from the link or description), and file/film number if shown.`,
      FilingSchema,
    );

    // Build result object with company info and normalized filing list
    const result: SECFilingResult = {
      company: companyInfo.companyName,
      cik: companyInfo.cik,
      searchQuery: SEARCH_QUERY,
      filings: filingsData.filings.slice(0, NUM_FILINGS).map((f) => ({
        ...f,
        fileNumber: f.fileNumber || "",
      })),
    };

    // Log summary and per-filing details to console
    console.log("\n" + "=".repeat(60));
    console.log("SEC FILING METADATA");
    console.log("=".repeat(60));
    console.log(`Company: ${result.company}`);
    console.log(`CIK: ${result.cik}`);
    console.log(`Search Query: ${result.searchQuery}`);
    console.log(`Filings Retrieved: ${result.filings.length}`);
    console.log("=".repeat(60));

    // Display each filing's type, date, description, accession number, file number
    result.filings.forEach((filing, index) => {
      console.log(`\nFiling ${index + 1}:`);
      console.log(`  Type: ${filing.type}`);
      console.log(`  Date: ${filing.date}`);
      console.log(
        `  Description: ${filing.description.substring(0, 80)}${filing.description.length > 80 ? "..." : ""}`,
      );
      console.log(`  Accession Number: ${filing.accessionNumber}`);
      console.log(`  File Number: ${filing.fileNumber}`);
    });

    // Output full result as JSON for piping or integration
    console.log("\n" + "=".repeat(60));
    console.log("JSON OUTPUT:");
    console.log("=".repeat(60));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error during SEC filing extraction:", error);
    throw error;
  } finally {
    // Always close session to release resources and clean up
    await stagehand.close();
    console.log("\nSession closed successfully");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  // Provide helpful troubleshooting information
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify internet connection and SEC website accessibility");
  console.error("  - Ensure the search query is valid (company name, ticker, or CIK)");
  console.error("\nDocs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
