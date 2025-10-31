# Stagehand + Browserbase: Value Prop One-Liner Generator

## AT A GLANCE
- Goal: Automatically extract and format website value propositions into concise one-liners for email personalization
- Demonstrates Stagehand's `extract` method with Pydantic schemas to pull structured data from landing pages
- Shows direct OpenAI API usage to transform extracted content with custom prompts
- Includes placeholder page detection and validation logic to filter out non-functional sites
- Docs → https://docs.browserbase.com/stagehand/extract

## GLOSSARY
- Extract: Stagehand method that uses AI to pull structured data from pages using natural language instructions
  Docs → https://docs.browserbase.com/stagehand/extract
- Value Proposition: The core benefit or unique selling point a company communicates to customers

## QUICKSTART
1) cd python/one-liner-generator
2) pip install python-dotenv stagehand openai pydantic
3) cp .env.example .env
4) Add required API keys/IDs to .env
5) python main.py

## EXPECTED OUTPUT
- Stagehand initializes and creates a Browserbase session
- Displays live session link for monitoring
- Navigates to target domain and waits for page load
- Checks for placeholder pages via meta tag inspection
- Extracts value proposition from landing page using AI
- Validates extracted content against placeholder patterns
- Generates formatted one-liner via LLM (constraints: 9 words max, starts with "your")
- Prints generated one-liner to console
- Closes browser session

## COMMON PITFALLS
- Dependency install errors: ensure pip install completed
- Missing credentials:
  - BROWSERBASE_PROJECT_ID (required for browser automation)
  - BROWSERBASE_API_KEY (required for browser automation)
  - OPENAI_API_KEY (required for LLM generation)
- Access limitations: Requires OpenAI API access for gpt-4.1 model
- Placeholder pages: Template includes detection logic, but some custom placeholder pages may still pass validation
- Slow-loading sites: 5-minute timeout configured, but extremely slow sites may still timeout

## USE CASES
• Generate personalized email openers by extracting value props from prospect domains
• Build prospecting tools that automatically understand what companies do from their websites
• Create dynamic messaging systems that adapt content based on extracted company information

## NEXT STEPS
• Batch process multiple domains by iterating over a list and aggregating results
• Extract additional metadata like company description, industry tags, or key features alongside value prop
• Add caching layer to avoid re-extracting value props for previously analyzed domains

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/stagehand
🎮 Browserbase:        https://www.browserbase.com
💡 Templates:          https://github.com/browserbase/stagehand/tree/main/examples
📧 Need help?          support@browserbase.com

