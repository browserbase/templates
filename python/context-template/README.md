# Stagehand + Browserbase: Context Authentication Example

## AT A GLANCE
- Goal: demonstrate persistent authentication using Browserbase **contexts** that survive across sessions.
- Flow: create context → log in once → persist cookies/tokens → reuse context in a new session → extract data → clean up.
- Benefits: skip re-auth on subsequent runs, reduce MFA prompts, speed up protected flows, and keep state stable across retries.
  Docs → https://docs.browserbase.com/features/contexts

## GLOSSARY
- context: a persistent browser state (cookies, localStorage, cache) stored server-side and reusable by new sessions.
  Docs → https://docs.browserbase.com/features/contexts
- persist: when true, any state changes during a session are written back to the context for future reuse.
- act: perform UI actions from a prompt (click, type, navigate).
  Docs → https://docs.stagehand.dev/basics/act

## QUICKSTART
 1) cd context-template
 2) python -m venv venv
 3) source venv/bin/activate  # On Windows: venv\Scripts\activate
 4) pip install -r requirements.txt
 5) pip install browserbase pydantic requests
 6) cp .env.example .env
 7) Add your Browserbase API key, Project ID, and SF Rec Park credentials to .env
 8) python main.py

## EXPECTED OUTPUT
- Creates context, performs login, saves auth state
- Reuses context in new session to access authenticated pages
- Extracts user data using structured schemas
- Cleans up context after completion

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains all required variables
- Context persistence: ensure persist=True is set to save login state
- Import errors: activate your virtual environment if you created one

## USE CASES
• Persistent login sessions: Automate workflows that require authentication without re-logging in every run.
• Access to gated content: Crawl or extract data from behind login walls (e.g., booking portals, dashboards, intranets).
• Multi-step workflows: Maintain cookies/tokens across different automation steps or scheduled jobs.

## NEXT STEPS
• Extend to multiple apps: Reuse the same context across different authenticated websites within one session.
• Add session validation: Extract and verify account info (e.g., username, profile details) to confirm successful auth.
• Secure lifecycle: Rotate, refresh, and delete contexts programmatically to enforce security policies.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://github.com/browserbase/stagehand/tree/main/examples
📧 Need help?          support@browserbase.com
