// Stagehand + Browserbase: Company Address Finder - See README.md for full documentation
import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Companies to process (modify this array to add/remove companies)
const COMPANY_NAMES: string[] = ["Browserbase", "Mintlify", "Wordware", "Reducto"];

// Maximum number of companies to process concurrently.
// Default: 1 (sequential processing - works on all plans)
// Set to > 1 for concurrent processing (requires Startup or Developer plan or higher)
const MAX_CONCURRENT = 1;

interface CompanyData {
  companyName: string;
  homepageUrl: string;
  termsOfServiceLink: string;
  privacyPolicyLink: string;
  address: string;
}

// Retries an async function with exponential backoff
// Handles transient network/page load failures for reliability
async function withRetry<T>(
  fn: () => Promise<T>,
  description: string,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.log(`${description} - Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`${description} - Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

// Processes a single company: finds homepage, extracts ToS/Privacy links, and extracts physical address
// Uses CUA agent to navigate and Stagehand extract() for structured data extraction
// Falls back to Privacy Policy if address not found in Terms of Service
async function processCompany(companyName: string): Promise<CompanyData> {
  console.log(`\nProcessing: ${companyName}`);
  
  let stagehand: Stagehand | null = null;
  
  try {
    // Initialize Stagehand with Browserbase
    stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 0,
      // 0 = errors only, 1 = info, 2 = debug
      // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
      // https://docs.stagehand.dev/configuration/logging
      browserbaseSessionCreateParams: {
        region: "us-east-1",
        timeout: 900,
        browserSettings: {
          viewport: {
            width: 1920,
            height: 1080,
          },
        },
      },
    });

    console.log(`[${companyName}] Initializing browser session...`);
    await stagehand.init();
    const sessionId = stagehand.browserbaseSessionId;
    
    if (!sessionId) {
      throw new Error(`Failed to initialize browser session for ${companyName}`);
    }
    
    console.log(`[${companyName}] Live View Link: https://browserbase.com/sessions/${sessionId}`);

    const page = stagehand.context.pages()[0];

    // Navigate to Google as starting point for CUA agent to search and find company homepage
    console.log(`[${companyName}] Navigating to Google...`);
    await withRetry(
      async () => {
        await page.goto("https://www.google.com/", {
          waitUntil: "domcontentloaded",
        });
      },
      `[${companyName}] Initial navigation to Google`
    );

    // Create CUA agent for autonomous navigation
    // Agent can interact with the browser like a human: search, click, scroll, and navigate
    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "google/gemini-2.5-computer-use-preview-10-2025",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      systemPrompt: `You are a helpful assistant that can use a web browser.
      You are currently on the following page: ${page.url()}.
      Do not ask follow up questions, the user will trust your judgement.`,
    });

    console.log(`[${companyName}] Finding company homepage using CUA agent...`);
    await withRetry(
      async () => {
        await agent.execute({
          instruction: `Navigate to the ${companyName} website`,
          maxSteps: 5,
          highlightCursor: true,
        });
      },
      `[${companyName}] Navigation to website`
    );

    const homepageUrl = page.url();
    console.log(`[${companyName}] Homepage found: ${homepageUrl}`);

    // Extract both legal document links in parallel for speed (independent operations)
    console.log(`[${companyName}] Finding Terms of Service & Privacy Policy links...`);
    const [termsResult, privacyResult] = await Promise.allSettled([
      stagehand.extract(
        "extract the link to the Terms of Service page (may also be labeled as Terms of Use, Terms and Conditions, or similar equivalent names)",
        z.object({
          termsOfServiceLink: z.string().url(),
        })
      ),
      stagehand.extract(
        "extract the link to the Privacy Policy page (may also be labeled as Privacy Notice, Privacy Statement, or similar equivalent names)",
        z.object({
          privacyPolicyLink: z.string().url(),
        })
      ),
    ]);

    let termsOfServiceLink = "";
    let privacyPolicyLink = "";

    if (termsResult.status === "fulfilled" && termsResult.value) {
      termsOfServiceLink = termsResult.value.termsOfServiceLink || "";
      console.log(`[${companyName}] Terms of Service: ${termsOfServiceLink}`);
    }

    if (privacyResult.status === "fulfilled" && privacyResult.value) {
      privacyPolicyLink = privacyResult.value.privacyPolicyLink || "";
      console.log(`[${companyName}] Privacy Policy: ${privacyPolicyLink}`);
    }

    let address = "";

    // Try Terms of Service first - most likely to contain physical address for legal/contact purposes
    if (termsOfServiceLink) {
      console.log(`[${companyName}] Extracting address from Terms of Service...`);
      await withRetry(
        async () => {
          await page.goto(termsOfServiceLink);
        },
        `[${companyName}] Navigate to Terms of Service`
      );

      try {
        const addressResult = await stagehand.extract(
          "Extract the physical company mailing address (street, city, state, postal code, and country if present) from the Terms of Service page. Ignore phone numbers or email addresses.",
          z.object({
            companyAddress: z.string(),
          })
        );

        const companyAddress = addressResult.companyAddress || "";
        if (companyAddress && companyAddress.trim().length > 0) {
          address = companyAddress.trim();
          console.log(`[${companyName}] Address found in Terms of Service: ${address}`);
        }
      } catch (error) {
        console.log(`[${companyName}] Could not extract address from Terms of Service page`);
      }
    }

    // Fallback: check Privacy Policy if address not found in Terms of Service
    if (!address && privacyPolicyLink) {
      console.log(`[${companyName}] Address not found in Terms of Service, trying Privacy Policy...`);
      await withRetry(
        async () => {
          await page.goto(privacyPolicyLink);
        },
        `[${companyName}] Navigate to Privacy Policy`
      );

      try {
        const addressResult = await stagehand.extract(
          "Extract the physical company mailing  address(street, city, state, postal code, and country if present) from the Privacy Policy page. Ignore phone numbers or email addresses.",
          z.object({
            companyAddress: z.string(),
          })
        );

        const companyAddress = addressResult.companyAddress || "";
        if (companyAddress && companyAddress.trim().length > 0) {
          address = companyAddress.trim();
          console.log(`[${companyName}] Address found in Privacy Policy: ${address}`);
        }
      } catch (error) {
        console.log(`[${companyName}] Could not extract address from Privacy Policy page`);
      }
    }

    if (!address) {
      address = "Address not found in Terms of Service or Privacy Policy pages";
      console.log(`[${companyName}] ${address}`);
    }

    const result: CompanyData = {
      companyName,
      homepageUrl,
      termsOfServiceLink,
      privacyPolicyLink,
      address,
    };

    console.log(`[${companyName}] Successfully processed`);
    return result;

  } catch (error) {
    console.error(`[${companyName}] Error:`, error);
    
    return {
      companyName,
      homepageUrl: "",
      termsOfServiceLink: "",
      privacyPolicyLink: "",
      address: `Error: ${error instanceof Error ? error.message : "Failed to process"}`,
    };
  } finally {
    if (stagehand) {
      try {
        await stagehand.close();
        console.log(`[${companyName}] Session closed successfully`);
      } catch (closeError) {
        console.error(`[${companyName}] Error closing browser:`, closeError);
      }
    }
  }
}

// Main orchestration function: processes companies sequentially or in batches based on MAX_CONCURRENT
// Collects results and outputs final JSON summary
async function main(): Promise<void> {
  console.log("Starting Company Address Finder...");

  const companyNames: string[] = COMPANY_NAMES;

  const maxConcurrent = Math.max(1, MAX_CONCURRENT || 1);

  const companyCount = companyNames.length;
  const isSequential = maxConcurrent === 1;
  console.log(`\nProcessing ${companyCount} ${companyCount === 1 ? 'company' : 'companies'} ${isSequential ? 'sequentially' : `concurrently (batch size: ${maxConcurrent})`}...`);

  const allResults: CompanyData[] = [];

  if (isSequential) {
    for (let i = 0; i < companyNames.length; i++) {
      const companyName = companyNames[i];
      console.log(`[${i + 1}/${companyNames.length}] ${companyName}`);
      const result = await processCompany(companyName);
      allResults.push(result);
    }
  } else {
    for (let i = 0; i < companyNames.length; i += maxConcurrent) {
      const batch = companyNames.slice(i, i + maxConcurrent);
      const batchNumber = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(companyNames.length / maxConcurrent);

      console.log(`\nBatch ${batchNumber}/${totalBatches}: ${batch.join(", ")}`);

      const batchPromises = batch.map((companyName) => processCompany(companyName));
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      
      console.log(`Batch ${batchNumber}/${totalBatches} completed: ${batchResults.length} companies processed`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("RESULTS (JSON):");
  console.log("=".repeat(80));
  console.log(JSON.stringify(allResults, null, 2));
  console.log("=".repeat(80));

  console.log(`\nComplete: processed ${allResults.length}/${companyNames.length} companies`);
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_GENERATIVE_AI_API_KEY is set");
  console.error("  - Ensure COMPANY_NAMES is configured in the config section");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});