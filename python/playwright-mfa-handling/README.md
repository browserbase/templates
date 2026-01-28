# Playwright + Browserbase: MFA Handling - TOTP Automation

## AT A GLANCE

- Goal: Automate MFA (Multi-Factor Authentication) completion using TOTP (Time-based One-Time Password) code generation with Playwright.
- Pure Playwright: Uses Playwright directly with Browserbase's cloud browser infrastructure (no Stagehand abstraction).
- TOTP Generation: Implements RFC 6238 compliant algorithm to generate time-based authentication codes programmatically.
- Automatic Form Filling: Uses Playwright selectors to fill MFA forms without user interaction.
- Retry Logic: Handles time window edge cases by regenerating codes and retrying authentication when needed.
- Docs -> https://playwright.dev/python/docs/intro

## GLOSSARY

- Playwright: Microsoft's browser automation library for reliable end-to-end testing
  Docs -> https://playwright.dev/python/docs/intro
- CDP: Chrome DevTools Protocol - used to connect Playwright to Browserbase cloud browsers
- TOTP: Time-based One-Time Password - a 6-digit code that changes every 30 seconds, generated using HMAC-SHA1 algorithm
- RFC 6238: Standard specification for TOTP authentication codes used by Google Authenticator, Authy, and other authenticator apps

## STAGEHAND VS PLAYWRIGHT

This template uses **pure Playwright** for browser automation. The Stagehand v3 Python SDK uses a session-based API with **observe** (find actions) and **act** (execute an action) instead. Here's how they compare:

| Task          | Stagehand v3 — natural language (you describe intent) | Playwright — specific selectors (you target exact elements)   |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Fill email    | *"Find the email field and type the user's email"*       | `page.locator('input[type="email"]').fill(email)`              |
| Fill password | *"Find the password field and enter the password"*      | `page.locator('input[type="password"]').fill(password)`       |
| Click submit  | *"Click the submit or sign-in button"*                   | `page.locator('input[type="submit"]').click()`                |
| Check result  | *"Did login succeed or fail? Return success and message"* | `page.locator('text="Login Success"').is_visible()`          |

**Example - Filling the login form:**

```python
# Stagehand v3: session-based; observe finds actions, act executes one
from stagehand import AsyncStagehand

client = AsyncStagehand()
session = await client.sessions.create(model_name="openai/gpt-5-nano")
await session.navigate(url="https://example.com/login")

observe_resp = await session.observe(instruction="find the email input and fill it")
action = observe_resp.data.result[0].to_dict(exclude_none=True)
await session.act(input=action)
# repeat observe/act for password and TOTP field

# Playwright: Explicit selectors, you specify how to find elements
await page.locator('input[type="email"]').fill(email)
await page.locator('input[type="password"]').fill(password)
await page.locator("form input").nth(2).fill(totp_code)
```

**Example - Checking authentication result:**

```python
# Stagehand v3: extract returns structured data via response.data.result
extract_response = await session.extract(
    instruction="Check if the login was successful or if there's an error message",
    schema={
        "type": "object",
        "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}},
        "required": ["success"],
    },
)
result = extract_response.data.result

# Playwright: Must check for specific elements/text on the page
has_success = await page.locator('text="Login Success"').is_visible()
has_failure = await page.locator('text="Login Failure"').is_visible()
```

## QUICKSTART

1. cd playwright-mfa-handling
2. python -m venv venv && source venv/bin/activate
3. pip install .
4. playwright install chromium
5. cp .env.example .env
6. Add required API keys/IDs to .env (BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY)
7. python main.py

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

- Dependency install errors: ensure pip install . completed
- Missing Playwright browsers: run `playwright install chromium` after installing dependencies
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

- Playwright Python Docs: https://playwright.dev/python/docs/intro
- Browserbase: https://www.browserbase.com
- Try it out: https://www.browserbase.com/playground
- Templates: https://www.browserbase.com/templates
- Need help? support@browserbase.com
