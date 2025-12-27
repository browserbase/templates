# Stagehand + Browserbase: Basic Screenshots Automation

## AT A GLANCE

- Goal: demonstrate how to automate screenshot capture during browser interactions using Stagehand.
- Sequential Screenshots: capture full-page screenshots at key interaction points throughout an automation flow.
- AI-Powered Navigation: use Stagehand's `act` method to navigate and interact with web pages naturally.
- Documentation & Debugging: save screenshots locally for visual verification and debugging of automation flows.

## GLOSSARY

- act: perform UI actions from a natural language prompt (type, click, navigate).
  Docs → https://docs.stagehand.dev/v2/basics/act
- screenshot: capture visual representation of a web page at a specific point in time.
- full-page screenshot: captures the entire scrollable page content, not just the visible viewport.
- CDP (Chrome DevTools Protocol): browser debugging protocol that enables faster screenshot capture.
  Docs → https://docs.browserbase.com/features/screenshots

## QUICKSTART

1. cd python/basic-screenshots
2. uv venv venv
3. source venv/bin/activate # On Windows: venv\Scripts\activate
4. uvx install stagehand python-dotenv
5. cp ../../.env.example .env (or create .env with required keys)
6. Add your Browserbase API key, Project ID, and Google Generative AI API key to .env
7. python main.py

## EXPECTED OUTPUT

- Creates a `screenshots` directory in the project folder
- Initializes Stagehand session with Browserbase
- Navigates to Polymarket homepage
- Takes screenshot after initial page load
- Clicks search box and captures screenshot
- Types search query and captures screenshot
- Selects first search result and captures final screenshot
- Saves all screenshots as JPEG files with sequential naming
- Displays live session link for monitoring

## COMMON PITFALLS

- "ModuleNotFoundError": ensure all dependencies are installed via uvx install
- Missing API keys: verify .env contains BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, and GOOGLE_GENERATIVE_AI_API_KEY
- Screenshot directory permissions: ensure write permissions for creating the screenshots folder
- Page load timeouts: website may be slow or unresponsive, check network connectivity
- Search results not found: target website structure may have changed, verify selectors still work
- Import errors: activate your virtual environment if you created one

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase: https://www.browserbase.com
💡 Screenshots Guide: https://docs.browserbase.com/features/screenshots
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
