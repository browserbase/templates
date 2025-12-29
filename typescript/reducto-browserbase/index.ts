// Stagehand + Browserbase: Download Apple's Q4 Financial Statement and Parse with Reducto - See README.md for full documentation

import "dotenv/config";
import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import fs from "fs";
import path from "path";
import reductoai from "reductoai";
import AdmZip from "adm-zip";

interface IPhoneNetSales {
  current_quarter: number;
  previous_quarter: number;
  current_year: number;
  previous_year: number;
  current_quarter_date?: string;
  previous_quarter_date?: string;
}

interface ExtractedFinancialData {
  iphone_net_sales: IPhoneNetSales;
}

interface ReductoExtractResult {
  result?: ExtractedFinancialData;
  data?: ExtractedFinancialData;
}

function saveDownloadsWithRetry(
  bb: Browserbase,
  sessionId: string,
  retryForSeconds: number = 30,
): { promise: Promise<number>; stopPolling: () => void } {
  const intervals = {
    poller: undefined as NodeJS.Timeout | undefined,
    timeout: undefined as NodeJS.Timeout | undefined,
    isStopped: false,
  };

  const stopPolling = (): void => {
    if (intervals.isStopped) return;
    intervals.isStopped = true;
    if (intervals.poller) {
      clearInterval(intervals.poller);
      intervals.poller = undefined;
    }
    if (intervals.timeout) {
      clearTimeout(intervals.timeout);
      intervals.timeout = undefined;
    }
  };

  const promise = new Promise<number>((resolve, reject) => {
    console.log(`Waiting up to ${retryForSeconds} seconds for downloads to complete...`);

    async function fetchDownloads(): Promise<void> {
      if (intervals.isStopped) {
        return;
      }

      try {
        console.log("Checking for downloads...");
        const response = await bb.sessions.downloads.list(sessionId);
        const downloadBuffer: ArrayBuffer = await response.arrayBuffer();

        if (downloadBuffer.byteLength > 0) {
          console.log(`Downloads ready! File size: ${downloadBuffer.byteLength} bytes`);
          fs.writeFileSync("downloaded_files.zip", Buffer.from(downloadBuffer));
          console.log("Files saved as: downloaded_files.zip");

          stopPolling();
          resolve(downloadBuffer.byteLength);
        } else {
          console.log("Downloads not ready yet, retrying...");
        }
      } catch (e: unknown) {
        if (intervals.isStopped) {
          return;
        }
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("Session with given id not found") || 
            errorMessage.includes("-32001")) {
          stopPolling();
          resolve(0);
          return;
        }
        console.error("Error fetching downloads:", e);
        stopPolling();
        reject(e);
      }
    }

    intervals.timeout = setTimeout(() => {
      if (!intervals.isStopped) {
        stopPolling();
        reject(new Error("Download timeout exceeded"));
      }
    }, retryForSeconds * 1000);

    // Poll every 2 seconds to check if downloads are ready
    intervals.poller = setInterval(fetchDownloads, 2000);
  });

  return { promise, stopPolling };
}

function extractPdfFromZip(
  zipPath: string,
  outputDir: string = "downloaded_files",
): string {
  console.log(`Extracting PDF from ${zipPath}...`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zip = new AdmZip(zipPath);
  const pdfEntries = zip.getEntries().filter((entry: AdmZip.IZipEntry) =>
    entry.entryName.toLowerCase().endsWith(".pdf"),
  );

  if (pdfEntries.length === 0) {
    throw new Error("No PDF files found in the downloaded zip");
  }

  let pdfPath: string | null = null;
  for (const entry of pdfEntries) {
    const outputPath = path.join(outputDir, entry.entryName);
    zip.extractEntryTo(entry, outputDir, false, true);
    console.log(`Extracted: ${outputPath}`);

    if (!pdfPath) {
      pdfPath = outputPath;
    }
  }

  if (!pdfPath) {
    throw new Error("Failed to extract PDF file");
  }

  return pdfPath;
}

async function extractPDFWithReducto(
  pdfPath: string,
  reductoaiClient: reductoai,
): Promise<void> {
  console.log(`\nExtracting financial data with Reducto: ${pdfPath}...`);

  // Upload PDF to Reducto for processing
  const upload = await reductoaiClient.upload({
    file: fs.createReadStream(pdfPath),
  });
  console.log(`Uploaded to Reducto: ${upload.file_id}`);

  // Define schema to extract iPhone net sales
  const schema = {
    type: "object",
    properties: {
      iphone_net_sales: {
        type: "object",
        properties: {
          current_quarter: {
            type: "number",
            description: "iPhone net sales for the current quarter (in millions)"
          },
          previous_quarter: {
            type: "number",
            description: "iPhone net sales for the previous quarter (in millions)"
          },
          current_year: {
            type: "number",
            description: "iPhone net sales for the current year (in millions)"
          },
          previous_year: {
            type: "number",
            description: "iPhone net sales for the previous year (in millions)"
          },
          current_quarter_date: {
            type: "string",
            description: "Date or period label for the current quarter"
          },
          previous_quarter_date: {
            type: "string",
            description: "Date or period label for the previous quarter"
          }
        },
        required: ["current_quarter", "previous_quarter", "current_year", "previous_year"],
        description: "iPhone net sales values from the financial statements"
      }
    },
    required: ["iphone_net_sales"]
  };

  // Extract structured data
  const result = (await reductoaiClient.extract.run({
    input: upload.file_id,
    instructions: {
      schema: schema,
      system_prompt: "Extract the iPhone net sales values from the financial statements. Find the iPhone line item in the net sales by category table and extract the values for current quarter, previous quarter, current year, and previous year (typically shown in columns in the income statement or operations statement)."
    },
    settings: {
      citations: { enabled: true },
      array_extract: false
    }
  })) as ReductoExtractResult;

  console.log("\n=== Extracted Financial Data ===\n");
  const extractedData = result?.result || result?.data;
  console.log(JSON.stringify(extractedData, null, 2));
}

async function main(): Promise<void> {
  console.log("Starting Apple Q4 Financial Statement Download and Parse Automation...");

  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY as string,
  });

  const reductoaiClient = new reductoai({
    apiKey: process.env.REDUCTOAI_API_KEY,
  });

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    logger: console.log,
    disablePino: true,
  });

  try {
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    const page = stagehand.context.pages()[0];

    const liveViewLinks = await bb.sessions.debug(stagehand.browserbaseSessionId!);
    console.log(`Live View Link: ${liveViewLinks.debuggerFullscreenUrl}`);

    // Navigate to Apple homepage with extended timeout for slow-loading sites.
    console.log("Navigating to Apple.com...");
    await page.goto("https://www.apple.com/", { timeoutMs: 60000 });

    // Navigate to investor relations section using Stagehand actions.
    console.log("Navigating to Investors section...");
    await stagehand.act("Click the 'Investors' button at the bottom of the page'");
    await stagehand.act("Scroll down to the Financial Data section of the page");
    await stagehand.act("Under Quarterly Earnings Reports, click on '2025'");

    // Download Q4 quarterly financial statement only.
    // When a URL of a PDF is opened, Browserbase automatically downloads and stores the PDF.
    // See https://docs.browserbase.com/features/screenshots#pdfs for more info
    console.log("Downloading Q4 financial statement...");
    await stagehand.act("Click the 'Financial Statements' link under Q4");

    // Retrieve all downloads triggered during this session from Browserbase API.
    // Polls with retry logic to handle download delays.
    console.log("Retrieving downloads from Browserbase...");
    const { promise: downloadPromise, stopPolling } = saveDownloadsWithRetry(
      bb,
      stagehand.browserbaseSessionId!,
      45,
    );

    try {
      await downloadPromise;
      console.log("Download completed successfully!");
      stopPolling();

      const pdfPath = extractPdfFromZip("downloaded_files.zip");
      console.log(`PDF extracted to: ${pdfPath}`);

      await extractPDFWithReducto(pdfPath, reductoaiClient);
    } catch (error) {
      stopPolling();
      throw error;
    } finally {
      await stagehand.close();
      console.log("Session closed successfully");
    }
  } catch (error) {
    console.error("Error during automation:", error);
    throw error;
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("Common issues:");
  console.error(
    "  - Check .env file has BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and REDUCTOAI_API_KEY",
  );
  console.error("  - Verify internet connection and Apple website accessibility");
  console.error("  - Ensure sufficient timeout for slow-loading pages");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
