// Stagehand + Browserbase: Job Application Automation - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import Browserbase from "@browserbasehq/sdk";
import { z } from "zod/v3";

// Define Zod schema for structured data extraction
// Using schemas ensures consistent data extraction even if page layout changes
const JobInfoSchema = z.object({
  url: z.string().url(),
  title: z.string(),
});

type JobInfo = z.infer<typeof JobInfoSchema>;

export async function getProjectConcurrency(): Promise<number> {
  // Fetch project concurrency limit from Browserbase SDK
  // Capped at 5 to prevent overwhelming the system with too many parallel requests
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  const project = await bb.projects.retrieve(process.env.BROWSERBASE_PROJECT_ID!);
  return Math.min(project.concurrency, 5);
}

export function generateRandomEmail(): string {
  // Generate a random email address for form submission
  const randomString = Math.random().toString(36).substring(2, 10);
  return `agent-${randomString}@example.com`;
}

export function generateAgentId(): string {
  // Generate a unique agent identifier for job applications
  // Combines timestamp and random string to ensure uniqueness
  return `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createSemaphore(maxConcurrency: number) {
  // Semaphore implementation for concurrency control
  // Ensures we don't exceed Browserbase project limits when applying to multiple jobs
  let activeCount = 0;
  const queue: (() => void)[] = [];

  const semaphore = () =>
    new Promise<void>((resolve) => {
      if (activeCount < maxConcurrency) {
        activeCount++;
        resolve();
      } else {
        queue.push(resolve);
      }
    });

  const release = () => {
    activeCount--;
    if (queue.length > 0) {
      const next = queue.shift()!;
      activeCount++;
      next();
    }
  };

  return { semaphore, release };
}

async function applyToJob(jobInfo: JobInfo, semaphore: () => Promise<void>, release: () => void) {
  // Acquire semaphore slot before starting job application
  await semaphore();

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-2.5-flash", // Routed through Model Gateway
  });

  try {
    // Initialize browser session to start automation
    await stagehand.init();

    console.log(`[${jobInfo.title}] Session Started`);
    console.log(
      `[${jobInfo.title}] Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`,
    );

    const page = stagehand.context.pages()[0];

    // Navigate to job URL
    await page.goto(jobInfo.url);
    console.log(`[${jobInfo.title}] Navigated to job page`);

    // Click on the specific job listing to open application form
    await stagehand.act(`click on ${jobInfo.title}`);
    console.log(`[${jobInfo.title}] Clicked on job`);

    // Generate unique identifiers for this application
    const agentId = generateAgentId();
    const email = generateRandomEmail();

    console.log(`[${jobInfo.title}] Agent ID: ${agentId}`);
    console.log(`[${jobInfo.title}] Email: ${email}`);

    // Fill out application form fields using natural language actions
    // Stagehand's act() method understands natural language instructions
    await stagehand.act(`type '${agentId}' into the agent identifier field`);

    await stagehand.act(`type '${email}' into the contact endpoint field`);

    await stagehand.act(`type 'us-west-2' into the deployment region field`);

    // Upload agent profile/resume file
    // Using observe() to find the upload button, then setting files programmatically
    const [uploadAction] = await stagehand.observe("find the file upload button for agent profile");
    if (uploadAction) {
      const uploadSelector = uploadAction.selector;
      if (uploadSelector) {
        const fileInput = page.locator(uploadSelector);

        // Fetch resume PDF from remote URL
        // Using fetch to download the file before uploading
        const resumeUrl = "https://agent-job-board.vercel.app/Agent%20Resume.pdf";
        const response = await fetch(resumeUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.statusText}`);
        }
        const resumeBuffer = Buffer.from(await response.arrayBuffer());

        // Upload file using Playwright's setInputFiles with buffer
        await fileInput.setInputFiles({
          name: "Agent Resume.pdf",
          mimeType: "application/pdf",
          buffer: resumeBuffer,
        });
        console.log(`[${jobInfo.title}] Uploaded resume from ${resumeUrl}`);
      }
    }

    // Select multi-region deployment option
    await stagehand.act(`select 'Yes' for multi region deployment`);

    // Submit the application form
    await stagehand.act(`click deploy agent button`);

    console.log(`[${jobInfo.title}] Application submitted successfully!`);

    await stagehand.close();
  } catch (error) {
    console.error(`[${jobInfo.title}] Error:`, error);
    await stagehand.close();
    throw error;
  } finally {
    // Always release semaphore slot to allow next job application to proceed
    release();
  }
}

async function main() {
  console.log("Starting Job Application Automation...");

  // Get project concurrency limit to control parallel execution
  const maxConcurrency = await getProjectConcurrency();
  console.log(`Executing with concurrency limit: ${maxConcurrency}`);

  // Initialize Stagehand with Browserbase for cloud-based browser automation
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-2.5-flash", // Routed through Model Gateway
  });

  // Initialize browser session to start automation
  await stagehand.init();

  console.log(`Main Stagehand Session Started`);
  console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);

  const page = stagehand.context.pages()[0];

  // Navigate to agent job board homepage
  await page.goto("https://agent-job-board.vercel.app/");
  console.log("Navigated to agent-job-board.vercel.app");

  // Click on "View Jobs" button to access job listings
  await stagehand.act("click on the view jobs button");
  console.log("Clicked on view jobs button");

  // Extract all job listings with titles and URLs using structured schema
  // Using extract() with Zod schema ensures consistent data extraction
  const jobsData = await stagehand.extract(
    "extract all job listings with their titles and URLs",
    z.array(JobInfoSchema),
  );

  console.log(`Found ${jobsData.length} jobs`);

  await stagehand.close();

  // Create semaphore with concurrency limit to control parallel job applications
  // Semaphore ensures we don't exceed Browserbase project limits
  const { semaphore, release } = createSemaphore(maxConcurrency);

  // Apply to all jobs in parallel with concurrency control
  // Using Promise.all() to run all applications concurrently
  console.log(
    `Starting to apply to ${jobsData.length} jobs with max concurrency of ${maxConcurrency}`,
  );

  const applicationPromises = jobsData.map((job) => applyToJob(job, semaphore, release));

  // Wait for all applications to complete
  await Promise.all(applicationPromises);

  console.log("All applications completed!");
}

main().catch((err) => {
  console.error("Error in job application automation:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
