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

This template uses **pure Playwright** for browser automation. Stagehand V4 is the SDK for browser agents and adds natural-language **act**, **observe**, and **extract** operations to a browser that your application owns. Here's how they compare:

| Task          | Stagehand V4 — natural language (you describe intent)     | Playwright — specific selectors (you target exact elements) |
| ------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Fill email    | _"Find the email field and type the user's email"_        | `page.locator('input[type="email"]').fill(email)`           |
| Fill password | _"Find the password field and enter the password"_        | `page.locator('input[type="password"]').fill(password)`     |
| Click submit  | _"Click the submit or sign-in button"_                    | `page.locator('input[type="submit"]').click()`              |
| Check result  | _"Did login succeed or fail? Return success and message"_ | `page.locator('text="Login Success"').is_visible()`         |

**Example - Filling the login form:**

```python
# Stagehand V4: launch a browser, then attach Stagehand to it
from stagehand import Stagehand, browserbase

browser = await browserbase.launch(api_key=BROWSERBASE_API_KEY)
stagehand = await Stagehand.create(
    browser=browser,
)
pages = await browser.context.pages()
page = pages[0] if pages else await browser.context.new_page()
await page.goto("https://example.com/login")

await stagehand.act(f"Fill the email field with {email}", page=page)
await stagehand.act(f"Fill the password field with {password}", page=page)
await stagehand.act(f"Fill the TOTP field with {totp_code}", page=page)

# Playwright: Explicit selectors, you specify how to find elements
await page.locator('input[type="email"]').fill(email)
await page.locator('input[type="password"]').fill(password)
await page.locator("form input").nth(2).fill(totp_code)
```

**Example - Checking authentication result:**

```python
# Stagehand V4: extract returns a typed response envelope
extract_response = await stagehand.extract(
    "Check if the login was successful and return its message",
    AuthResult,
    page=page,
)
result = extract_response.data

await stagehand.close()
await browser.close()

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
6. Add required API keys/IDs to .env (BROWSERBASE_API_KEY)
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
- Missing credentials: verify .env contains BROWSERBASE_API_KEY
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
