# Stagehand + Browserbase: Computer Use Agent (CUA) Example

## AT A GLANCE
- Goal: demonstrate autonomous web browsing using Google's Computer Use Agent with Stagehand and Browserbase.
- Uses Stagehand Agent to automate complex workflows with AI powered browser agents
- Leverages Google's gemini-2.5-computer-use-preview model for autonomous web interaction and decision-making.

## GLOSSARY
- agent: create an autonomous AI agent that can execute complex multi-step tasks
  Docs → https://docs.stagehand.dev/basics/agent#what-is-agent

## QUICKSTART
 1) python -m venv venv
 2) source venv/bin/activate  # On Windows: venv\Scripts\activate
 3) pip install -r requirements.txt
 4) cp .env.example .env
 5) Add your Browserbase API key, Project ID, and Google API key to .env
 6) python main.py

## EXPECTED OUTPUT
- Initializes Stagehand session with Browserbase
- Navigates to Google search engine
- Executes autonomous search and data extraction task
- Displays live session link for monitoring
- Returns structured results or completion status
- Closes session cleanly

## COMMON PITFALLS
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_API_KEY
- Google API access: ensure you have access to Google's gemini-2.5-computer-use-preview model
- Import errors: activate your virtual environment if you created one

## USE CASES
• Autonomous research: Let AI agents independently research topics, gather information, and compile reports without manual intervention.
• Complex web workflows: Automate multi-step processes that require decision-making, form filling, and data extraction across multiple pages.
• Content discovery: Search for specific information, verify data accuracy, and cross-reference sources autonomously.

## NEXT STEPS
• Customize instructions: Modify the instruction variable to test different autonomous tasks and scenarios.
• Add error handling: Implement retry logic, fallback strategies, and better error recovery for failed agent actions.
• Extend capabilities: Add support for file downloads, form submissions, and more complex interaction patterns.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
📧 Need help?          support@browserbase.com
