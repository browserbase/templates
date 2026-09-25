# Playwright + Browserbase: Basic reCAPTCHA Solving

## AT A GLANCE

- Goal: Demonstrate automatic reCAPTCHA solving using Playwright with Browserbase's built-in captcha solving capabilities.
- Automated Solving: Browserbase automatically detects and solves CAPTCHAs in the background. CAPTCHA solving is **enabled by default** - you don't need to set `solveCaptchas: true` unless you want to explicitly enable it (or set it to `false` to disable).
- Timeout Handling: Includes 60-second timeout to prevent indefinite waits on captcha solving failures.
- Progress Monitoring: Listen for console messages (`browserbase-solving-started`, `browserbase-solving-finished`) to track captcha solving progress in real-time.
- Docs -> https://docs.browserbase.com/features/stealth-mode#captcha-solving

## GLOSSARY

- Browserbase SDK: JavaScript/TypeScript SDK for creating and managing browser sessions in Browserbase's cloud infrastructure.
  Docs -> https://docs.browserbase.com/
- solveCaptchas: Browserbase browser setting that enables automatic captcha solving for reCAPTCHA, hCaptcha, and other captcha types. Enabled by default for Basic and Advanced Stealth Mode.
  Docs -> https://docs.browserbase.com/features/stealth-mode#captcha-solving
- console messages: Browser console events that indicate captcha solving status:
  - `browserbase-solving-started`: emitted when CAPTCHA detection begins
  - `browserbase-solving-finished`: emitted when CAPTCHA solving completes
- custom CAPTCHA solving: For non-standard or custom captcha providers, you can specify CSS selectors for the captcha image and input field using `captchaImageSelector` and `captchaInputSelector` in browserSettings.

## PLAYWRIGHT VS STAGEHAND

| Feature         | Playwright (this template)    | Stagehand                            |
| --------------- | ----------------------------- | ------------------------------------ |
| Actions         | `page.click()`, `page.goto()` | `stagehand.act("Click the button")`  |
| Data Extraction | Manual DOM queries            | `stagehand.extract("Get the price")` |

## CAPTCHA SOLVING DETAILS

### How CAPTCHA Solving Works

Browserbase provides integrated CAPTCHA solving to handle challenges automatically:

- **Automatic Detection**: When a CAPTCHA is detected on a page, Browserbase attempts to solve it in the background
- **Solving Time**: CAPTCHA solving typically takes between 5-30 seconds, depending on the CAPTCHA type and complexity
- **Default Behavior**: CAPTCHA solving is enabled by default for Basic and Advanced Stealth Mode
- **Proxies**: It's recommended to enable proxies when using CAPTCHA solving for higher success rates

### Custom CAPTCHA Solving

For non-standard or custom captcha providers, you can specify CSS selectors to guide the solution process:

```typescript
browserSettings: {
  solveCaptchas: true,
  captchaImageSelector: "#custom-captcha-image-id",xc
  captchaInputSelector: "#custom-captcha-input-id"
}
```

To find the selectors:

1. Right-click on the captcha image and select "Inspect" to get the image selector
2. Right-click on the input field and select "Inspect" to get the input selector
3. Use the element's `id` or a CSS selector that uniquely identifies it

### Disabling CAPTCHA Solving

If you want to disable automatic captcha solving, set `solveCaptchas: false` in browserSettings:

```typescript
browserSettings: {
  solveCaptchas: false;
}
```

## QUICKSTART

1. cd typescript/playwright/basic-recaptcha
2. pnpm install
3. cp .env.example .env
4. Add your Browserbase API key to .env
5. pnpm start

## EXPECTED OUTPUT

- Validates environment variables for Browserbase credentials
- Creates Browserbase session with captcha solving enabled
- Displays session ID and live view link for monitoring
- Connects to browser via Chrome DevTools Protocol (CDP)
- Navigates to Google reCAPTCHA demo page
- Waits for Browserbase to automatically solve the captcha (with 60s timeout)
- Logs captcha solving progress messages
- Clicks submit button after captcha is solved
- Verifies successful captcha solving by checking for success message
- Closes session cleanly and displays replay link

## COMMON PITFALLS

- Missing credentials: verify .env contains BROWSERBASE_API_KEY
- Captcha solving timeout: the template uses a 60-second timeout; increase if needed for complex CAPTCHAs
- No browser context: ensure the Browserbase session was created successfully before connecting
- Proxies not enabled: enable proxies in browserSettings for higher CAPTCHA solving success rates
- Demo page inaccessible: verify the reCAPTCHA demo page URL is accessible and hasn't changed
- Console message timing: ensure console event listeners are set up before navigating to the page
- Custom captcha selectors: for non-standard CAPTCHAs, verify that `captchaImageSelector` and `captchaInputSelector` are correctly defined

## HELPFUL RESOURCES

- Browserbase Docs: https://docs.browserbase.com
- Playwright Docs: https://playwright.dev/docs/intro
- Browserbase Dashboard: https://www.browserbase.com
- Playground: https://www.browserbase.com/playground
- Templates: https://www.browserbase.com/templates
- Need help? support@browserbase.com
