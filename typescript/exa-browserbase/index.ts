// Stagehand + Browserbase + Exa: AI-Powered Job Search and Application - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import Exa from "exa-js";
import { z } from "zod";
import { chromium } from "playwright-core";

// Candidate application details - customize these for your job search
const applicationDetails = {
  name: "John Doe",
  email: "john.doe@example.com",
  linkedInUrl: "https://linkedin.com/in/johndoe",
  resumePath: "./Dummy_CV.pdf",
  currentLocation: "San Francisco, CA",
  willingToRelocate: true,
  requiresSponsorship: false,
  visaStatus: "",
  phone: "+1-555-123-4567",
  portfolioUrl: "https://johndoe.dev",
  coverLetter: "I am excited to apply for this position...",
};

// Search configuration - modify to target different companies
const searchConfig = {
  companyQuery: "AI startups in SF",
  numCompanies: 5,
  // Concurrency: set to false for sequential (works on all plans); true = concurrent (requires Startup or Developer plan or higher)
  concurrent: true,
  maxConcurrentBrowsers: 5, // Max browsers when concurrent
  // Proxies: requires Developer plan or higher; residential proxies help avoid bot detection (https://docs.browserbase.com/features/proxies)
  useProxy: true,
};

// Zod schema for extracting structured job description data
const jobDescriptionSchema = z.object({
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  location: z.string().optional(),
  workType: z.string().optional(),
  fullDescription: z.string().optional(),
});

// Careers page data structure for tracking discovered job pages
interface CareersPage {
  company: string;
  url: string;
  careersUrl: string;
}

// System prompt for the job application agent
const agentSystemPrompt = `You are an intelligent job application assistant with decision-making power.

Your responsibilities:
- First, navigate to find a job posting and click through to its application page before filling out the form
- Analyze the job description to understand what the company is looking for
- Tailor responses to align with job requirements when available
- Craft thoughtful responses that highlight relevant experience/skills
- For cover letter or "why interested" fields, reference specific aspects of the job/company
- For location/relocation questions, use the willingToRelocate flag to guide your answer
- For visa/sponsorship questions, answer honestly based on requiresSponsorship
- Skip resume/file upload fields - the resume will be uploaded automatically
- Use the provided application details as the source of truth for factual information
- IMPORTANT: Do NOT click the submit button - this is for testing purposes only

Think critically about each field and present the candidate in the best professional light.`;

// Builds the instruction prompt for the agent based on available job description
function buildAgentInstruction(
  jobDescription: z.infer<typeof jobDescriptionSchema>,
): string {
  const hasJobDescription = jobDescription.jobTitle || jobDescription.fullDescription;

  if (hasJobDescription) {
    return `You are filling out a job application. Here is the job description that was found:

JOB DESCRIPTION:
${JSON.stringify(jobDescription, null, 2)}

CANDIDATE INFORMATION:
${JSON.stringify(applicationDetails, null, 2)}

YOUR TASK:
- Fill out all text fields in the application form
- Reference specific aspects of the job description
- Highlight relevant skills/experience from the candidate's background
- Show alignment between candidate and role
- Skip file upload fields (resume will be handled separately)

Remember: Your goal is to fill out this application in a way that maximizes the candidate's chances by showing strong alignment with this specific role.`;
  }

  return `You are filling out a job application. No detailed job description was found on this page.

CANDIDATE INFORMATION:
${JSON.stringify(applicationDetails, null, 2)}

YOUR TASK:
- Fill out all text fields in the application form
- Write professional, thoughtful responses
- Highlight the candidate's general strengths and qualifications
- Express genuine interest and enthusiasm
- Skip file upload fields (resume will be handled separately)

Remember: Even without a job description, present the candidate professionally and enthusiastically.`;
}

// Uploads resume file using Playwright, checking main page and iframes
async function uploadResume(stagehand: Stagehand, logPrefix: string = ""): Promise<void> {
  console.log(`${logPrefix}Attempting to upload resume...`);

  const browser = await chromium.connectOverCDP(stagehand.connectURL());
  const pwContext = browser.contexts()[0];
  const pwPage = pwContext.pages()[0];

  // Check main page for file input
  const mainPageInputs = await pwPage.locator('input[type="file"]').count();

  if (mainPageInputs > 0) {
    await pwPage
      .locator('input[type="file"]')
      .first()
      .setInputFiles(applicationDetails.resumePath);
    console.log(`${logPrefix}Resume uploaded successfully from main page!`);
    return;
  }

  // Check inside iframes for file input
  const frames = pwPage.frames();
  for (const frame of frames) {
    try {
      const frameInputCount = await frame.locator('input[type="file"]').count();
      if (frameInputCount > 0) {
        await frame
          .locator('input[type="file"]')
          .first()
          .setInputFiles(applicationDetails.resumePath);
        console.log(`${logPrefix}Resume uploaded successfully from iframe!`);
        return;
      }
    } catch {
      // Frame not accessible, continue to next
    }
  }

  console.log(`${logPrefix}No file upload field found on page`);
}

// Result of a single job application attempt
interface ApplicationResult {
  company: string;
  careersUrl: string;
  success: boolean;
  message: string;
  sessionUrl?: string;
}

// Applies to a single job posting
async function applyToJob(
  careersPage: CareersPage,
  index: number,
): Promise<ApplicationResult> {
  const logPrefix = `[${index + 1}/${searchConfig.numCompanies}] ${careersPage.company}: `;
  console.log(`\n${logPrefix}Starting application...`);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    experimental: true,
    model: "google/gemini-2.5-pro",
    // Browserbase session configuration (proxies require Developer plan or higher)
    browserbaseSessionCreateParams: {
      proxies: searchConfig.useProxy,
    },
  });

  try {
    await stagehand.init();
    const sessionUrl = `https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`;
    console.log(`${logPrefix}Session started: ${sessionUrl}`);

    const page = stagehand.context.pages()[0];
    await page.goto(careersPage.careersUrl);

    // Extract job description
    const jobDescription = await stagehand.extract(
      "extract the full job description including title, requirements, responsibilities, and any important details about the role",
      jobDescriptionSchema,
    );

    // Initialize and run agent
    const agent = stagehand.agent({
      mode: "hybrid",
      model: "google/gemini-3-flash-preview",
      systemPrompt: agentSystemPrompt,
    });

    const instruction = buildAgentInstruction(jobDescription);
    const result = await agent.execute({
      instruction,
      maxSteps: 50,
    });

    // Upload resume after form filling
    try {
      await uploadResume(stagehand, logPrefix);
    } catch (uploadError) {
      console.log(`${logPrefix}Could not upload resume:`, uploadError);
    }

    if (result.success) {
      console.log(`${logPrefix}Form filled successfully!`);
    } else {
      console.log(`${logPrefix}Form filling may be incomplete`);
    }

    return {
      company: careersPage.company,
      careersUrl: careersPage.careersUrl,
      success: result.success,
      message: result.message,
      sessionUrl,
    };
  } catch (error) {
    console.error(`${logPrefix}Error:`, error);
    return {
      company: careersPage.company,
      careersUrl: careersPage.careersUrl,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await stagehand.close();
    console.log(`${logPrefix}Session closed`);
  }
}

async function main() {
  console.log("Starting Exa + Browserbase Job Search and Application...");

  // Initialize Exa client for AI-powered company search
  const exa = new Exa(process.env.EXA_API_KEY);

  // Search for companies matching the criteria using Exa
  console.log(`Searching for companies: "${searchConfig.companyQuery}"...`);

  const companyResults = await exa.searchAndContents(searchConfig.companyQuery, {
    category: "company",
    text: true,
    type: "auto",
    livecrawl: "fallback",
    numResults: searchConfig.numCompanies,
  });

  console.log(`Found ${companyResults.results.length} companies:`);
  companyResults.results.forEach((company, i) => {
    console.log(`  ${i + 1}. ${company.title} - ${company.url}`);
  });

  if (companyResults.results.length === 0) {
    console.log("No companies found. Exiting.");
    return;
  }

  // Find careers pages for each discovered company
  console.log("\nSearching for careers pages...");
  const careersPages: CareersPage[] = [];

  for (const company of companyResults.results) {
    const companyDomain = new URL(company.url).hostname.replace("www.", "");
    console.log(`  Looking for careers page: ${companyDomain}...`);

    const careersResult = await exa.searchAndContents(`${companyDomain} careers page`, {
      context: true,
      excludeDomains: ["linkedin.com"],
      numResults: 5,
      text: true,
      type: "deep",
      livecrawl: "fallback",
    });

    if (careersResult.results.length > 0) {
      const careersUrl = careersResult.results[0].url;
      console.log(`    Found: ${careersUrl}`);
      careersPages.push({
        company: company.title || companyDomain,
        url: company.url,
        careersUrl: careersUrl,
      });
    } else {
      console.log(`    No careers page found for ${companyDomain}`);
    }
  }

  console.log(`\nFound ${careersPages.length} careers pages total.`);

  if (careersPages.length === 0) {
    console.log("No careers pages found. Exiting.");
    return;
  }

  // Apply to jobs either concurrently or sequentially based on config
  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `Starting applications (${searchConfig.concurrent ? `concurrent, max ${searchConfig.maxConcurrentBrowsers} browsers` : "sequential"})...`,
  );
  console.log(`${"=".repeat(50)}`);

  let results: ApplicationResult[];

  if (searchConfig.concurrent) {
    // Run applications concurrently with limited parallelism
    const chunks: CareersPage[][] = [];
    for (let i = 0; i < careersPages.length; i += searchConfig.maxConcurrentBrowsers) {
      chunks.push(careersPages.slice(i, i + searchConfig.maxConcurrentBrowsers));
    }

    results = [];
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((page, idx) => applyToJob(page, results.length + idx)),
      );
      results.push(...chunkResults);
    }
  } else {
    // Run applications sequentially
    results = [];
    for (let i = 0; i < careersPages.length; i++) {
      const result = await applyToJob(careersPages[i], i);
      results.push(result);
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("APPLICATION SUMMARY");
  console.log(`${"=".repeat(50)}`);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\nTotal: ${results.length} | Success: ${successful.length} | Failed: ${failed.length}\n`);

  results.forEach((r, i) => {
    const status = r.success ? "[SUCCESS]" : "[FAILED]";
    console.log(`${i + 1}. ${status} ${r.company}`);
    console.log(`   URL: ${r.careersUrl}`);
    if (r.sessionUrl) {
      console.log(`   Session: ${r.sessionUrl}`);
    }
  });
}

main().catch((err) => {
  console.error("Error in Exa + Browserbase job application:", err);
  console.error("Common issues:");
  console.error(
    "  - Check .env file has BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, MODEL_API_KEY, and EXA_API_KEY",
  );
  console.error("  - Verify companies exist for the search query");
  console.error("  - Ensure careers pages are accessible");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});