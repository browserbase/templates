# Stagehand + Browserbase: Computer Use Agent (CUA) Example

## AT A GLANCE

- Goal: demonstrate autonomous web browsing using Microsoft's Computer Use Agent with Stagehand and Browserbase.
- Uses Stagehand Agent to automate complex workflows with AI powered browser agents
- Leverages Microsoft's fara-7b model for autonomous web interaction and decision-making.

## GLOSSARY

- agent: create an autonomous AI agent that can execute complex multi-step tasks
  Docs → https://docs.stagehand.dev/basics/agent#what-is-agent

## QUICKSTART

1.  npm install
2.  cp .env.example .env
3.  Add your Browserbase API key, Azure API key, and Azure endpoint to .env
4.  npm start

## EXPECTED OUTPUT

- Initializes Stagehand session with Browserbase
- Navigates to Google search engine
- Executes autonomous search and data extraction task
- Displays live session link for monitoring
- Returns structured results or completion status
- Closes session cleanly

## COMMON PITFALLS

- "Cannot find module": ensure all dependencies are installed
- Missing credentials: verify .env contains BROWSERBASE_API_KEY, AZURE_API_KEY, and AZURE_ENDPOINT
- Microsoft API access: ensure you have access to Microsoft's fara-7b model via Azure or Fireworks

## USE CASES

• Autonomous research: Let AI agents independently research topics, gather information, and compile reports without manual intervention.
• Complex web workflows: Automate multi-step processes that require decision-making, form filling, and data extraction across multiple pages.
• Content discovery: Search for specific information, verify data accuracy, and cross-reference sources autonomously.

## NEXT STEPS

• Customize instructions: Modify the instruction variable to test different autonomous tasks and scenarios.
• Add error handling: Implement retry logic, fallback strategies, and better error recovery for failed agent actions.
• Extend capabilities: Add support for file downloads, form submissions, and more complex interaction patterns.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
