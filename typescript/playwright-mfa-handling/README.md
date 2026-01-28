# Playwright + Browserbase: MFA Handling - TOTP Automation

## AT A GLANCE

- Goal: Automate MFA (Multi-Factor Authentication) completion using TOTP (Time-based One-Time Password) code generation with Playwright.
- Pure Playwright: Uses Playwright directly with Browserbase's cloud browser infrastructure (no Stagehand abstraction).
- TOTP Generation: Implements RFC 6238 compliant algorithm to generate time-based authentication codes programmatically.
- Automatic Form Filling: Uses Playwright selectors to fill MFA forms without user interaction.
- Retry Logic: Handles time window edge cases by regenerating codes and retrying authentication when needed.
- Docs -> https://playwright.dev/docs/intro

## GLOSSARY

- Playwright: Microsoft's browser automation library for reliable end-to-end testing
  Docs -> https://playwright.dev/docs/intro
- CDP: Chrome DevTools Protocol - used to connect Playwright to Browserbase cloud browsers
- TOTP: Time-based One-Time Password - a 6-digit code that changes every 30 seconds, generated using HMAC-SHA1 algorithm
- RFC 6238: Standard specification for TOTP authentication codes used by Google Authenticator, Authy, and other authenticator apps

## STAGEHAND VS PLAYWRIGHT

This template uses **pure Playwright** for browser automation. The Stagehand version of this template uses AI-powered natural language commands instead. Here's how they compare:

| Task          | Stagehand (AI)                                            | Playwright (Selectors)                                        |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Fill email    | `await page.act("Type email into the email field")`       | `await page.locator('input[type="email"]').fill(email)`       |
| Fill password | `await page.act("Type password into the password field")` | `await page.locator('input[type="password"]').fill(password)` |
| Click submit  | `await page.act("Click the submit button")`               | `await page.locator('input[type="submit"]').click()`          |
| Check result  | AI interprets page content                                | Explicit selectors required                                   |

**Example - Filling the login form:**

```typescript
// Stagehand: Natural language, AI finds the elements
await page.act(`Type '${email}' into the email field`);
await page.act(`Type '${password}' into the password field`);
await page.act(`Type '${totpCode}' into the TOTP code field`);

// Playwright: Explicit selectors, you specify how to find elements
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.locator("form input").nth(2).fill(totpCode);
```

**Example - Checking authentication result:**

```typescript
// Stagehand: AI understands context and extracts structured data
const result = await page.extract({
  instruction: "Check if the login was successful or if there's an error message",
  schema: AuthResultSchema,
});

// Playwright: Must check for specific elements/text on the page
const hasSuccess = await page.locator('text="Login Success"').isVisible();
const hasFailure = await page.locator('text="Login Failure"').isVisible();
```

## QUICKSTART

1. cd playwright-mfa-handling
2. pnpm install
3. cp .env.example .env
4. Add required API keys/IDs to .env (BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY)
5. pnpm start

## EXPECTED OUTPUT

- Creates Browserbase session and connects via CDP
- Displays live session link for monitoring
- Navigates to TOTP challenge demo page (authenticationtest.com/totpChallenge/)
- Generates TOTP code using RFC 6238 algorithm
- Fills in email, password, and TOTP code fields using Playwright selectors
- Submits authentication form
- Checks authentication result
- Retries with fresh code if initial attempt fails (handles time window edge cases)
- Closes browser session cleanly

## COMMON PITFALLS

- Dependency install errors: ensure pnpm install completed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- TOTP code expiration: codes are valid for 30 seconds - if authentication fails, the script automatically retries with a fresh code
- CDP connection issues: ensure stable internet connection for reliable Browserbase connection
- Selector changes: if the demo site structure changes, Playwright selectors may need updating
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

- Automated authentication: Complete MFA challenges automatically when session persistence isn't enough
- TOTP integration: Store encrypted TOTP secrets during user onboarding and generate codes programmatically
- Zero-touch MFA: Eliminate user interaction for MFA completion in automated workflows
- Session recovery: Automatically handle MFA prompts when re-authenticating expired sessions
- E2E testing: Test MFA flows in your application's test suite

## NEXT STEPS

- Secure storage: Implement encrypted TOTP secret storage (AES-256) in your database
- Multiple time windows: Add support for trying +/-1 time window (60s range) if current code fails
- SMS/Email MFA: Extend to support SMS codes (via Twilio/Bandwidth API) or email codes (via Gmail API/IMAP)
- Backup codes: Implement fallback to backup codes stored during initial MFA setup
- Context integration: Combine with Browserbase Contexts to minimize MFA prompts
- Page Object Model: Refactor selectors into reusable page objects for maintainability

## HELPFUL RESOURCES

- Playwright Docs: https://playwright.dev/docs/intro
- Browserbase: https://www.browserbase.com
- Try it out: https://www.browserbase.com/playground
- Templates: https://www.browserbase.com/templates
- Need help? support@browserbase.com
