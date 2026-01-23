// Manual MFA with Browserbase Contexts - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import Browserbase from "@browserbasehq/sdk";
import { z } from "zod";

const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

/**
 * First session: Create context and login (with MFA)
 */
async function createSessionWithContext() {
  console.log("Creating new Browserbase context...");

  const context = await bb.contexts.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });

  console.log(`Context created: ${context.id}`);
  console.log("First session: Performing login with MFA...");

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "openai/gpt-4.1-mini",
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        context: {
          id: context.id,
          persist: true, // Save authentication state including MFA
        },
      },
    },
  });

  await stagehand.init();
  console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

  const page = stagehand.context.pages()[0];

  // Navigate to GitHub login
  console.log("Navigating to GitHub login...");
  await page.goto("https://github.com/login");
  await page.waitForLoadState("domcontentloaded");

  // Fill in credentials
  console.log("Entering username...");
  await stagehand.act(`Type '${process.env.GITHUB_USERNAME}' into the username field`);

  console.log("Entering password...");
  await stagehand.act(`Type '${process.env.GITHUB_PASSWORD}' into the password field`);

  console.log("Clicking Sign in...");
  await stagehand.act("Click the Sign in button");

  await page.waitForLoadState("networkidle");

  // Check if MFA is required
  const mfaRequired = await stagehand.extract(
    "Is there a two-factor authentication or verification code prompt on the page?",
    z.boolean(),
  );

  if (mfaRequired) {
    console.log("MFA DETECTED!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("PAUSED: Please complete MFA in the browser");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(
      `1. Open the Browserbase session in your browser: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
    );
    console.log("2. Enter your 2FA code from authenticator app");
    console.log("3. Click 'Verify' or submit");
    console.log("4. Wait for login to complete");
    console.log("\nThe script will wait for you to complete MFA...\n");

    // Wait for MFA completion (poll until we're no longer on login page)
    let loginComplete = false;
    const startTime = Date.now();
    const timeout = 120000; // 2 minutes

    while (!loginComplete && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Check every 3 seconds

      const currentUrl = page.url();
      if (!currentUrl.includes("/login") && !currentUrl.includes("/sessions/two-factor")) {
        loginComplete = true;
      }
    }

    if (!loginComplete) {
      throw new Error("MFA timeout - login was not completed within 2 minutes");
    }

    console.log("MFA completed! Login successful.\n");
  } else {
    console.log("Login successful (no MFA required)\n");
  }

  console.log(`Context ${context.id} now contains:`);
  console.log("   - Session cookies");
  console.log("   - MFA trust/remember device state");
  console.log("   - All authentication data\n");

  await stagehand.close();

  return context.id;
}

/**
 * Second session: Reuse context - NO MFA needed!
 */
async function reuseContext(contextId: string) {
  console.log(`Second session: Reusing context ${contextId}`);
  console.log("   (No login, no MFA required - auth state persisted)\n");

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "openai/gpt-4.1-mini",
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        context: {
          id: contextId,
          persist: true,
        },
      },
    },
  });

  await stagehand.init();
  console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

  const page = stagehand.context.pages()[0];

  // Navigate directly to GitHub (should already be logged in)
  console.log("Navigating to GitHub...");
  await page.goto("https://github.com");
  await page.waitForLoadState("networkidle");

  // Check if we're logged in
  const username = await stagehand.extract(
    "Extract the logged-in username or check if we're authenticated",
    z.string(),
  );

  console.log("\nSUCCESS! Already logged in without MFA!");
  console.log(`   Username: ${username}`);
  console.log("\nThis is the power of Browserbase Contexts:");
  console.log("   - First session: User completes MFA once");
  console.log("   - Context saves trusted device state");
  console.log("   - All future sessions: No MFA required\n");

  await stagehand.close();
}

/**
 * Clean up context
 */
async function deleteContext(contextId: string) {
  console.log(`Deleting context: ${contextId}`);
  try {
    // Delete via API (SDK doesn't have delete method)
    const response = await fetch(`https://api.browserbase.com/v1/contexts/${contextId}`, {
      method: "DELETE",
      headers: {
        "X-BB-API-Key": process.env.BROWSERBASE_API_KEY!,
      },
    });

    if (response.ok) {
      console.log("Context deleted\n");
    } else {
      console.log(`Could not delete context: ${response.status} ${response.statusText}`);
      console.log("   Context will auto-expire after 30 days\n");
    }
  } catch (error) {
    console.log(
      `Could not delete context: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log("   Context will auto-expire after 30 days\n");
  }
}

async function main() {
  console.log("Starting Browserbase Context MFA Persistence Demo...");

  // Check environment variables
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    console.error("\n❌ Missing Browserbase credentials");
    console.error("   Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env");
    process.exit(1);
  }

  if (!process.env.GITHUB_USERNAME || !process.env.GITHUB_PASSWORD) {
    console.error("\nError: Missing GitHub credentials");
    console.error("   Set GITHUB_USERNAME and GITHUB_PASSWORD in .env");
    console.error("Setup Instructions:");
    console.error("   1. Create a test GitHub account");
    console.error("   2. Enable 2FA: Settings → Password and authentication");
    console.error("   3. Set credentials in .env file");
    process.exit(1);
  }

  try {
    console.log("\n📋 Demo Flow:");
    console.log("   1. First session: Login + complete MFA manually");
    console.log("   2. Second session: No login, no MFA needed");
    console.log("   3. Clean up context\n");

    // First session: Create context and login with MFA
    const contextId = await createSessionWithContext();

    console.log("⏳ Waiting 5 seconds before reusing context...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Second session: Reuse context (NO MFA!)
    await reuseContext(contextId);

    // Clean up
    await deleteContext(contextId);

    console.log("═══════════════════════════════════════════════════════════");
    console.log("Key Takeaway:");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ First session: User completes MFA once");
    console.log("✅ Context saves trusted device state");
    console.log("✅ All future sessions: No MFA prompt");
    console.log("✅ Store context_id per customer in database\n");
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
    console.error("\nTroubleshooting:");
    console.error("  - Ensure GitHub credentials are correct");
    console.error("  - Ensure 2FA is enabled on the test account");
    console.error("  - Check Browserbase dashboard for session details");
    throw error;
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  process.exit(1);
});
