/**
 * Stagehand + Browserbase: Context Authentication Example
 *
 * AT A GLANCE
 * - Goal: demonstrate persistent authentication using Browserbase **contexts** that survive across sessions.
 * - Flow: create context → log in once → persist cookies/tokens → reuse context in a new session → extract data → clean up.
 * - Benefits: skip re-auth on subsequent runs, reduce MFA prompts, speed up protected flows, and keep state stable across retries.
 *   Docs → https://docs.browserbase.com/features/contexts
 *
 *
 * GLOSSARY
 * - context: a persistent browser state (cookies, localStorage, cache) stored server-side and reusable by new sessions.
 *   Docs → https://docs.browserbase.com/features/contexts
 * - persist: when true, any state changes during a session are written back to the context for future reuse.
 * - act: perform UI actions from a prompt (click, type, navigate).
 *   Docs → https://docs.stagehand.dev/basics/act
 *
 * QUICKSTART
 *  1) pnpm init
 *  2) pnpm add @browserbasehq/stagehand dotenv @types/node axios zod
 *     pnpm add -D typescript && pnpm tsc --init
 *  3) Create .env with:
 *       BROWSERBASE_PROJECT_ID=...
 *       BROWSERBASE_API_KEY=...
 *       SF_REC_PARK_EMAIL=...
 *       SF_REC_PARK_PASSWORD=...
 *  4) Compile + run:
 *       pnpm tsc && node context.js
 *
 * EXPECTED OUTPUT
 * - Creates context, performs login, saves auth state
 * - Reuses context in new session to access authenticated pages
 * - Extracts user data using structured schemas
 * - Cleans up context after completion
 *
 * COMMON PITFALLS
 * - "Cannot find module": ensure all dependencies are installed
 * - Missing credentials: verify .env contains all required variables
 * - Context persistence: ensure persist: true is set to save login state
 */

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { Browserbase } from "@browserbasehq/sdk";
import { z } from "zod";
import axios from "axios";

async function createSessionContextID() {
  console.log("Creating new Browserbase context...");  
  // First create a context using Browserbase SDK to get a context ID.
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });
  const context = await bb.contexts.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });
  
  console.log("Created context ID:", context.id);
  
  // Create a single session using the context ID to perform initial login.
  console.log("Creating session for initial login...");
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      context: {
        id: context.id,
        persist: true, // Save authentication state to context
      },
    },
  });
  console.log("Live view: https://browserbase.com/sessions/" + session.id);
  
  // Connect Stagehand to the existing session (no new session created).
  console.log("Connecting Stagehand to session...");
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    modelName: "gpt-4o",
    browserbaseSessionID: session.id,
  });

  await stagehand.init(); // Connect to existing session for login process.
  
  const page = stagehand.page;
  const email = process.env.SF_REC_PARK_EMAIL;
  const password = process.env.SF_REC_PARK_PASSWORD;
  
  // Navigate to login page with extended timeout for slow-loading sites.
  console.log("Navigating to SF Rec & Park login page...");
  await page.goto("https://www.rec.us/organizations/san-francisco-rec-park", {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Perform login sequence: each step is atomic to handle dynamic page changes.
  console.log("Starting login sequence...");
  await page.act("Click the Login button");
  await page.act(`Fill in the email or username field with "${email}"`);
  await page.act("Click the next, continue, or submit button to proceed");
  await page.act(`Fill in the password field with "${password}"`);
  await page.act("Click the login, sign in, or submit button");
  console.log("Login sequence completed!");
  
 
  await stagehand.close();
  console.log("Authentication state saved to context");
  
  // Return the context ID for reuse in future sessions.
  return { id: context.id };
}

async function deleteContext(contextId: string) {
  try {
    console.log("Cleaning up context:", contextId);
    // Delete context via Browserbase API to clean up stored authentication data.
    // This prevents accumulation of unused contexts and ensures security cleanup.
    const response = await axios.delete(
      `https://api.browserbase.com/v1/contexts/${contextId}`,
      {
        headers: {
          "X-BB-API-Key": process.env.BROWSERBASE_API_KEY,
        },
      },
    );
    console.log("Context deleted successfully (status:", response.status + ")");
  } catch (error: any) {
    console.error("Error deleting context:", error.response?.data || error.message || error);
  }
}

async function main() {
  console.log("Starting Context Authentication Example...");  
  // Create context with login state for reuse in authenticated sessions.
  const contextId = await createSessionContextID();
  
  // Initialize new session using existing context to inherit authentication state.
  // persist: true ensures any new changes (cookies, cache) are saved back to context.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    modelName: "gpt-4o",
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        context: {
          id: contextId.id,
          persist: true,
        },
      },
    },
  });

  await stagehand.init(); // Creates session with inherited login state from context.
  console.log("Authenticated session ready!");
  console.log("Live view: https://browserbase.com/sessions/" + stagehand.browserbaseSessionID);

  const page = stagehand.page;

  // Navigate to authenticated area - should skip login due to persisted cookies.
  console.log("Navigating to authenticated area (should skip login)...");
  await page.goto("https://www.rec.us/organizations/san-francisco-rec-park", {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Navigate to user-specific area to access personal data.
  await page.act("Click on the reservations button");
  
  // Extract structured user data using Zod schema for type safety.
  // Schema ensures consistent data format and validates extracted content.
  console.log("Extracting user profile data...");
  const userData = await page.extract({
    instruction: "Extract the user's full name and address",
    schema: z.object({
      fullName: z.string().describe("the user's full name"),
      address: z.string().describe("the user's address")
    }),
  });
  
  console.log("Extracted user data:", userData);


  // Always close session to release resources and save any context changes.
  await stagehand.close();
  console.log("Session closed successfully");
  
  // Clean up context to prevent accumulation and ensure security.
  await deleteContext(contextId.id);
}

main().catch((err) => {
  console.error("Error in context authentication example:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has SF_REC_PARK_EMAIL and SF_REC_PARK_PASSWORD");
  console.error("  - Verify BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY are set");
  console.error("  - Ensure credentials are valid for SF Rec & Park");
  console.error("Docs: https://docs.browserbase.com/stagehand");
  process.exit(1);
});

/**
 * USE CASES
 *  • 	Persistent login sessions: Automate workflows that require authentication without re-logging in every run.
 *  •	Access to gated content: Crawl or extract data from behind login walls (e.g., booking portals, dashboards, intranets).
 *  •	Multi-step workflows: Maintain cookies/tokens across different automation steps or scheduled jobs.
 * 
 * NEXT STEPS
 *  •	Extend to multiple apps: Reuse the same context across different authenticated websites within one session.
 *  •	Add session validation: Extract and verify account info (e.g., username, profile details) to confirm successful auth.
 *  •	Secure lifecycle: Rotate, refresh, and delete contexts programmatically to enforce security policies. 
 * 
 * HELPFUL RESOURCES
 * 📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
 * 🎮 Browserbase:        https://www.browserbase.com
 * 💡 Try it out:         https://www.browserbase.com/playground
 * 🔧 Templates:          https://github.com/browserbase/stagehand/tree/main/examples
 * 📧 Need help?          support@browserbase.com
 */
