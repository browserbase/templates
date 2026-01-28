// Playwright + Browserbase: MFA Handling - TOTP Automation
// See README.md for full documentation

import "dotenv/config";
import { chromium, Browser, BrowserContext, Page } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import crypto from "crypto";

// Demo site URL for TOTP challenge testing
const DEMO_URL = "https://authenticationtest.com/totpChallenge/";

// Test credentials (displayed on the demo page)
const TEST_CREDENTIALS = {
  email: "totp@authenticationtest.com",
  password: "pa$$w0rd",
  totpSecret: "I65VU7K5ZQL7WB4E",
};

// Type for browser session result
interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionId: string;
}

// Generate TOTP code (Time-based One-Time Password) using RFC 6238 compliant algorithm
// Same algorithm used by Google Authenticator, Authy, and other authenticator apps
function generateTOTP(secret: string, window = 0): string {
  // Convert base32 secret to buffer
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";

  secret = secret.toUpperCase().replace(/=+$/, "");

  for (let i = 0; i < secret.length; i++) {
    const val = base32chars.indexOf(secret.charAt(i));
    if (val === -1) throw new Error("Invalid base32 character in secret");
    bits += val.toString(2).padStart(5, "0");
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }

  const secretBuffer = Buffer.from(hex, "hex");

  // Get current time window (30 second intervals)
  const time = Math.floor(Date.now() / 1000 / 30) + window;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  // Generate HMAC-SHA1 hash
  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation to extract 6-digit code
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // Return 6-digit code with leading zeros
  return (code % 1000000).toString().padStart(6, "0");
}

async function createBrowserbaseSession(): Promise<BrowserSession> {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error("BROWSERBASE_API_KEY environment variable is required");
  }
  if (!process.env.BROWSERBASE_PROJECT_ID) {
    throw new Error("BROWSERBASE_PROJECT_ID environment variable is required");
  }

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });

  console.log(`Session created: https://browserbase.com/sessions/${session.id}`);

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No default context found");
  }
  const page = context.pages()[0];
  if (!page) {
    throw new Error("No page found in default context");
  }

  return { browser, context, page, sessionId: session.id };
}

async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
  totpCode: string,
): Promise<void> {
  // Fill email field
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);
  console.log("Filled email field");

  // Fill password field
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);
  console.log("Filled password field");

  // Fill TOTP code field (third input in the form)
  const totpInput = page.locator("form input").nth(2);
  await totpInput.fill(totpCode);
  console.log("Filled TOTP code field");
}

async function submitForm(page: Page): Promise<void> {
  const submitButton = page
    .locator('input[type="submit"], button[type="submit"], form button')
    .first();
  await submitButton.click();
  console.log("Clicked submit button");

  await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
}

async function checkLoginResult(page: Page): Promise<{ success: boolean; message: string }> {
  // Check for failure indicator
  const failureHeading = page.locator('text="Login Failure"');
  const hasFailure = await failureHeading.isVisible().catch(() => false);

  if (hasFailure) {
    const errorMessage = (await page.locator("body").textContent()) ?? "";
    const message = errorMessage.includes("not successfully logged in")
      ? "Sorry -- You have not successfully logged in"
      : "Login failed";
    return { success: false, message };
  }

  // Check for success indicator
  const successHeading = page.locator('text="Login Success"');
  const hasSuccess = await successHeading.isVisible().catch(() => false);

  if (hasSuccess) {
    return { success: true, message: "Successfully logged in with TOTP" };
  }

  // Fallback: check page content
  const pageContent = (await page.locator("body").textContent()) ?? "";
  if (pageContent.toLowerCase().includes("success")) {
    return { success: true, message: "Login appears successful" };
  }

  return { success: false, message: "Unable to determine login result" };
}

async function main() {
  console.log("Starting MFA Handling - TOTP Automation (Playwright + Browserbase)...\n");

  let browser: Browser | null = null;

  try {
    // Create browser session
    const { browser: b, page, sessionId } = await createBrowserbaseSession();
    browser = b;

    console.log(`Live View: https://browserbase.com/sessions/${sessionId}\n`);

    // Navigate to TOTP challenge demo page
    console.log("Navigating to TOTP Challenge page...");
    await page.goto(DEMO_URL, { waitUntil: "domcontentloaded" });

    // Generate TOTP code using RFC 6238 algorithm
    const totpCode = generateTOTP(TEST_CREDENTIALS.totpSecret);
    const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    console.log(`Generated TOTP code: ${totpCode} (valid for ${secondsLeft}s)`);

    // Fill in login form
    console.log("\nFilling login form...");
    await fillLoginForm(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password, totpCode);

    // Submit the form
    console.log("\nSubmitting form...");
    await submitForm(page);

    // Check if login succeeded
    console.log("\nChecking authentication result...");
    const result = await checkLoginResult(page);

    if (result.success) {
      console.log("\nSUCCESS! TOTP authentication completed automatically!");
      console.log(`Result: ${result.message}`);
    } else {
      console.log(`\nInitial attempt may have failed: ${result.message}`);
      console.log("Retrying with a fresh TOTP code...\n");

      // Navigate back and retry with new code
      await page.goto(DEMO_URL, { waitUntil: "domcontentloaded" });

      const newCode = generateTOTP(TEST_CREDENTIALS.totpSecret);
      console.log(`New TOTP code: ${newCode}`);

      await fillLoginForm(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password, newCode);
      await submitForm(page);

      const retryResult = await checkLoginResult(page);

      if (retryResult.success) {
        console.log("\nSuccess on retry!");
        console.log(`Result: ${retryResult.message}`);
      } else {
        console.log("\nAuthentication failed after retry");
        console.log(`Result: ${retryResult.message}`);
      }
    }

    console.log("\nMFA handling completed");
  } catch (error) {
    console.error("Error during MFA handling:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed successfully");
    }
  }
}

main().catch((err) => {
  console.error("\nError in MFA handling:", err);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - TOTP code may have expired (try running again)");
  console.error("  - Page structure may have changed");
  process.exit(1);
});
