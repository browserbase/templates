# Stagehand + Browserbase: Manual MFA with Contexts

## AT A GLANCE

- Goal: demonstrate how to persist authentication across sessions using Browserbase Contexts, eliminating MFA friction after the first login.
- Flow: first session creates context and completes MFA manually → context saves auth state → second session reuses context with no MFA required.

## GLOSSARY

- context: a Browserbase feature that persists browser state (cookies, localStorage, sessionStorage) across sessions.
  Docs → https://docs.browserbase.com/features/contexts
- persist: setting that saves authentication state including MFA trust/remember device state to the context.
- MFA (Multi-Factor Authentication): two-factor authentication requiring a code from an authenticator app.
- session persistence: maintaining logged-in state across multiple browser sessions without re-authentication.

## QUICKSTART

1. cd manual-MFA-with-contexts
2. uv venv venv
3. source venv/bin/activate # On Windows: venv\Scripts\activate
4. uvx install stagehand browserbase python-dotenv pydantic requests
5. cp .env.example .env
6. Add your Browserbase API key, Project ID, GitHub username, and password to .env
7. Ensure 2FA is enabled on your GitHub test account (Settings → Password and authentication → Enable two-factor authentication)
8. python main.py

## EXPECTED OUTPUT

- Creates a new Browserbase context
- First session: navigates to GitHub login, fills credentials, detects MFA prompt
- Pauses and displays Browserbase session link for manual MFA completion
- Waits for MFA completion (2 minute timeout)
- Saves authentication state to context
- Second session: reuses context, navigates to GitHub (already logged in, no MFA)
- Extracts logged-in username to verify authentication
- Cleans up context

## COMMON PITFALLS

- "ModuleNotFoundError": ensure all dependencies are installed via uvx install
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, GITHUB_USERNAME, and GITHUB_PASSWORD
- MFA timeout: ensure you complete MFA within 2 minutes, or increase timeout value
- 2FA not enabled: GitHub account must have 2FA enabled for this demo to work
- Context not persisting: verify context.persist is set to true in browser_settings

## USE CASES

• Payment automation: Complete MFA once for utility portals, then automate future payments without MFA prompts.
• Account management: Persist authentication for services requiring MFA, enabling automated account management workflows.
• Compliance automation: Store trusted device state for regulatory portals, reducing friction for recurring compliance tasks.

## NEXT STEPS

• Store context IDs: Save context_id per customer in your database to reuse across sessions.
• Multi-portal support: Extend to multiple portals/services, each with their own context.
• Context management: Implement context cleanup, rotation, and expiration policies.
• Error handling: Add retry logic and better error messages for MFA timeouts.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
📚 Contexts Docs: https://docs.browserbase.com/features/contexts
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
