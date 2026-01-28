# Stagehand + Browserbase: Dynamic Form Filling with Agent

## AT A GLANCE

- Goal: Automate intelligent form filling using an Stagehand AI agent that understands form context and uses semantic matching.
- Agent-Powered: Uses Stagehand Agent to autonomously fill forms by extracting information from natural language descriptions.
- Semantic Matching: Agent intelligently selects form options even when exact wording doesn't match, choosing the closest semantic match.
- Custom Instructions: Demonstrates how to configure agent behavior with system prompts for reliable form completion.
- Docs → https://docs.stagehand.dev/basics/agent

## GLOSSARY

- agent: create an autonomous AI agent that can execute complex multi-step tasks
  Docs → https://docs.stagehand.dev/basics/agent#what-is-agent
- semantic matching: selecting form options based on meaning rather than exact text match
- system prompt: custom instructions that guide agent behavior and decision-making
  Docs → https://docs.stagehand.dev/basics/agent#using-agent

## QUICKSTART

1. pnpm install
2. cp .env.example .env
3. Add required API keys/IDs to .env (BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
4. Customize the `tripDetails` variable in index.ts with your own form data
5. Update the form URL if using a different form
6. pnpm start

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Displays live session link for monitoring
- Navigates to the target form
- Agent analyzes form structure and available fields
- Agent extracts relevant information from trip details
- Agent fills form fields using semantic matching for dropdowns/checkboxes
- Agent submits the form when complete
- Outputs success status and agent message
- Closes session cleanly

## COMMON PITFALLS

- Dependency install errors: ensure pnpm install completed
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_GENERATIVE_AI_API_KEY
- Google API access: ensure you have access to Google's gemini-2.5-pro model
- Agent stopping early: increase maxSteps (default 30) for complex forms with many fields
- Form not submitting: verify the form URL is accessible and form fields are visible
- Semantic matching issues: adjust system prompt to better guide agent's matching behavior
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Dynamic form automation: Fill out forms with variable data from natural language descriptions without hardcoding field mappings.
• Survey and questionnaire automation: Automatically complete surveys, feedback forms, or registration forms with intelligent option selection.
• Multi-step form workflows: Handle complex multi-page forms where the agent navigates between steps and maintains context.
• Form testing and validation: Test form behavior with different data sets to ensure proper validation and error handling.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
