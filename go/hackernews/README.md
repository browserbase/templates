# Stagehand + Browserbase: Hacker News Automation

## AT A GLANCE

- Goal: Demonstrate Stagehand's core browser automation features through a complete Hacker News workflow.
- Comprehensive Example: Shows navigate, observe, act, extract, and execute (autonomous agent) in a single workflow.
- Real-world Scenario: Navigates to Hacker News, clicks on top post comments, extracts structured data, and uses an autonomous agent to find the newest post.
- Docs → https://docs.stagehand.dev/v3/sdk/go

## GLOSSARY

- navigate: Load a web page in the browser session
  Docs → https://docs.stagehand.dev/basics/navigate
- observe: Analyze page elements and generate actionable steps based on natural language instructions
  Docs → https://docs.stagehand.dev/basics/observe
- act: Execute actions on web pages using natural language instructions
  Docs → https://docs.stagehand.dev/basics/act
- extract: Extract structured data from pages using JSON schema definitions
  Docs → https://docs.stagehand.dev/basics/extract
- execute: Run an autonomous agent to complete multi-step tasks automatically
  Docs → https://docs.stagehand.dev/basics/execute

## QUICKSTART

1. Ensure Go 1.22+ is installed (`go version`)
2. Set required environment variables:
   ```bash
   export BROWSERBASE_API_KEY="your-api-key"
   export BROWSERBASE_PROJECT_ID="your-project-id"
   export MODEL_API_KEY="your-model-api-key"
   ```
3. Run the example:
   ```bash
   go run main.go
   ```

## EXPECTED OUTPUT

- Session initialization with Browserbase
- Navigation to Hacker News homepage
- Observation of page to find comment links for the top post
- Action execution to click on the comment link
- Structured data extraction (title, top comment, author)
- Autonomous agent execution to navigate back and find the newest post
- Session cleanup and termination
- Live session recording link displayed in console

## COMMON PITFALLS

- Missing Go installation: Ensure Go 1.22+ is installed (`go version`)
- Missing environment variables: Verify BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and MODEL_API_KEY are set
- Module not found: Run `go mod download` if dependencies aren't resolved
- Network issues: Check internet connection and website accessibility
- Session errors: Verify API keys are valid and project ID exists in Browserbase dashboard
- Find more information on your Browserbase dashboard -> https://www.browserbase.com/sign-in

## USE CASES

• Content aggregation: Automate data extraction from news sites, forums, and social platforms for monitoring and analysis.
• Research automation: Collect structured information from multiple pages using autonomous agents for competitive intelligence.
• Testing workflows: Validate web interactions, form submissions, and navigation flows across different pages.
• Data scraping: Extract structured data from dynamic websites that require JavaScript execution and user interactions.

## NEXT STEPS

• Add error handling: Implement retry logic for failed actions and better error messages for debugging.
• Extend extraction schema: Add more fields to extract (upvotes, comment count, post date, etc.).
• Multi-page workflows: Chain multiple navigations and extractions to build comprehensive data collection pipelines.
• Customize agent instructions: Modify the execute instruction to perform different tasks (e.g., find posts by keyword, filter by score).

## HELPFUL RESOURCES

📚 Stagehand Go Docs: https://docs.stagehand.dev/v3/sdk/go
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
