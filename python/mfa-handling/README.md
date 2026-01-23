# Stagehand + Browserbase: MFA Handling - TOTP Automation

## AT A GLANCE

- Goal: Automate MFA (Multi-Factor Authentication) completion using TOTP (Time-based One-Time Password) code generation.
- TOTP Generation: Implements RFC 6238 compliant algorithm to generate time-based authentication codes programmatically.
- Automatic Form Filling: Extracts TOTP secrets from pages and automatically fills MFA forms without user interaction.
- Retry Logic: Handles time window edge cases by regenerating codes and retrying authentication when needed.
- Docs → https://docs.stagehand.dev/basics/act

## GLOSSARY

- act: perform UI actions from a prompt (type, click, fill forms)
  Docs → https://docs.stagehand.dev/basics/act
- extract: extract structured data from web pages using natural language instructions
  Docs → https://docs.stagehand.dev/basics/extract
- TOTP: Time-based One-Time Password - a 6-digit code that changes every 30 seconds, generated using HMAC-SHA1 algorithm
- RFC 6238: Standard specification for TOTP authentication codes used by Google Authenticator, Authy, and other authenticator apps

## QUICKSTART

1. python -m venv venv
2. source venv/bin/activate # On Windows: venv\Scripts\activate
3. pip install stagehand python-dotenv pydantic
4. cp .env.example .env
5. Add required API keys/IDs to .env (BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
6. python main.py

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Displays live session link for monitoring
- Navigates to TOTP challenge demo page (authenticationtest.com/totpChallenge/)
- Extracts test credentials (email, password) and TOTP secret from the page
- Generates TOTP code using RFC 6238 algorithm
- Fills in email and password fields
- Fills in TOTP code field with generated code
- Submits authentication form
- Checks authentication result
- Retries with fresh code if initial attempt fails (handles time window edge cases)
- Closes session cleanly

## COMMON PITFALLS

- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_GENERATIVE_AI_API_KEY
- Google API access: ensure you have access to Google's gemini-2.5-flash model
- TOTP code expiration: codes are valid for 30 seconds - if authentication fails, the script automatically retries with a fresh code
- Page structure changes: if the demo site structure changes, extraction may fail
- Network timeouts: ensure stable internet connection for reliable page loading
- Import errors: activate your virtual environment if you created one
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Automated authentication: Complete MFA challenges automatically when session persistence isn't enough (session expired, new device, etc.)
• TOTP integration: Store encrypted TOTP secrets during user onboarding and generate codes programmatically when needed
• Zero-touch MFA: Eliminate user interaction for MFA completion in automated workflows
• Session recovery: Automatically handle MFA prompts when re-authenticating expired sessions

## NEXT STEPS

• Secure storage: Implement encrypted TOTP secret storage (AES-256) in your database during user onboarding
• Multiple time windows: Add support for trying ±1 time window (60s range) if current code fails
• SMS/Email MFA: Extend to support SMS codes (via Twilio/Bandwidth API) or email codes (via Gmail API/IMAP)
• Backup codes: Implement fallback to backup codes stored during initial MFA setup
• Context integration: Combine with Browserbase Contexts to minimize MFA prompts (95% context reuse, 4% auto TOTP, 1% user-mediated)
• Error handling: Add graceful fallback to user prompts when automation fails

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v2/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord

