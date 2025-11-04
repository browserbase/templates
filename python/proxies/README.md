# Browserbase Proxy Testing Script

## AT A GLANCE
- Goal: demonstrate different proxy configurations with Browserbase sessions.

## GLOSSARY
- Proxies: Browserbase's default proxy rotation for enhanced privacy
  Docs → https://docs.browserbase.com/features/proxies

## QUICKSTART
 1) cd proxies-template
 2) python -m venv venv
 3) source venv/bin/activate  # On Windows: venv\Scripts\activate
 4) pip install -r requirements.txt
 5) pip install browserbase playwright
 6) playwright install chromium
 7) cp .env.example .env
 8) Add your Browserbase API key and Project ID to .env
 9) python main.py

## EXPECTED OUTPUT
- Tests built-in proxy rotation
- Tests geolocation-specific proxies (New York)
- Tests custom external proxies (commented out by default)
- Displays IP information and geolocation data for each test
- Shows how different proxy configurations affect your apparent location

## COMMON PITFALLS
- Browserbase Developer plan or higher is required to use proxies
- "ModuleNotFoundError": ensure all dependencies are installed via pip
- Missing credentials: verify .env contains BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY
- Custom proxy errors: verify external proxy server credentials and availability
- Playwright not installed: run `playwright install chromium` after pip install
- Import errors: activate your virtual environment if you created one

## USE CASES
• Geo-testing: Verify location-specific content, pricing, or compliance banners.
• Scraping at scale: Rotate IPs to reduce blocks and increase CAPTCHA success rates.
• Custom routing: Mix built-in and external proxies, or apply domain-based rules for compliance.

## NEXT STEPS
• Add routing rules: Configure domainPattern to direct specific sites through targeted proxies.
• Test multiple geos: Compare responses from different cities/countries and log differences.
• Improve reliability: Add retries and fallbacks to handle proxy errors like ERR_TUNNEL_CONNECTION_FAILED.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.stagehand.dev/v3/first-steps/introduction
🎮 Browserbase:        https://www.browserbase.com
💡 Try it out:         https://www.browserbase.com/playground
🔧 Templates:          https://www.browserbase.com/templates
📧 Need help?          support@browserbase.com
