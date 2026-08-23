# Stagehand + Browserbase Templates

Ready-to-use automation templates for Stagehand and Browserbase. Each template has its own README with setup instructions.

> All templates also live on [browserbase.com/templates](https://www.browserbase.com/templates)

## All Templates

| Template                         | TS                                                | PY                                            | GO                  | Description                                                                                                    |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| agent-with-human-in-loop         | [TS](typescript/agent-with-human-in-loop)         | -                                             | -                   | Build an AI agent that can pause and ask a human for input mid-task                                            |
| basic-caching                    | [TS](typescript/basic-caching)                    | [PY](python/basic-caching)                    | -                   | Demonstrate how Stagehand's caching feature reduces cost and latency by reusing previously computed actions    |
| basic-recaptcha                  | [TS](typescript/basic-recaptcha)                  | [PY](python/basic-recaptcha)                  | -                   | Automatic reCAPTCHA solving using Browserbase's built-in captcha solving capabilities                          |
| browser-agent-demo               | [TS](typescript/browser-agent-demo)               | -                                             | -                   | Browser agent that searches the web, fetches page content, and autonomously extracts information               |
| browserbase-reducto              | [TS](typescript/browserbase-reducto)              | [PY](python/browserbase-reducto)              | -                   | Download financial PDFs from websites and extract structured data using AI-powered document parsing            |
| business-lookup                  | [TS](typescript/business-lookup)                  | [PY](python/business-lookup)                  | -                   | Automate business registry searches using an autonomous AI agent with computer-use capabilities                |
| cartesia-form-filling            | -                                                 | [PY](python/cartesia-form-filling)            | -                   | Voice agent that conducts phone questionnaires while automatically filling out web forms                       |
| cerebras-docs-checker            | -                                                 | [PY](python/cerebras-docs-checker)            | -                   | Crawl documentation sites, discover source repos, and verify docs accuracy against actual codebase             |
| company-address-finder           | [TS](typescript/company-address-finder)           | [PY](python/company-address-finder)           | -                   | Discover company legal information and physical addresses from Terms of Service and Privacy Policy pages       |
| company-value-prop-generator     | [TS](typescript/company-value-prop-generator)     | [PY](python/company-value-prop-generator)     | -                   | Extract and format website value propositions into concise one-liners for email personalization                |
| context                          | [TS](typescript/context)                          | [PY](python/context)                          | -                   | Persistent authentication using Browserbase contexts that survive across sessions                              |
| council-events                   | [TS](typescript/council-events)                   | [PY](python/council-events)                   | -                   | Automate event information extraction from Philadelphia Council                                                |
| download-financial-statements    | [TS](typescript/download-financial-statements)    | [PY](python/download-financial-statements)    | -                   | Download Apple's quarterly financial statements (PDFs) from their investor relations site                      |
| dynamic-form-filling             | [TS](typescript/dynamic-form-filling)             | -                                             | -                   | Intelligent form filling using a Stagehand AI agent that understands form context and uses semantic matching   |
| exa-browserbase                  | [TS](typescript/exa-browserbase)                  | [PY](python/exa-browserbase)                  | -                   | Automate job applications with AI that writes smart, tailored responses for each role                          |
| extend-browserbase               | [TS](typescript/extend-browserbase)               | [PY](python/extend-browserbase)               | -                   | Download receipts from an expense portal and extract structured receipt data using AI-powered document parsing |
| form-filling                     | [TS](typescript/form-filling)                     | [PY](python/form-filling)                     | -                   | Automate form filling with Stagehand and Browserbase                                                           |
| gemini-3-flash                   | [TS](typescript/gemini-3-flash)                   | -                                             | -                   | Autonomous web browsing using Google's Gemini 3 Flash with Stagehand and Browserbase                           |
| gemini-cua                       | [TS](typescript/gemini-cua)                       | [PY](python/gemini-cua)                       | -                   | Autonomous web browsing using Google's Computer Use Agent with Stagehand and Browserbase                       |
| getting-started-with-browserbase | [TS](typescript/getting-started-with-browserbase) | [PY](python/getting-started-with-browserbase) | -                   | Demo all three core Browserbase capabilities: Search API, Fetch API, and Browser Sessions                      |
| gift-finder                      | [TS](typescript/gift-finder)                      | [PY](python/gift-finder)                      | -                   | Find personalized gift recommendations using AI-generated search queries and intelligent product scoring       |
| google-trends                    | [TS](typescript/google-trends)                    | [PY](python/google-trends)                    | -                   | Extract trending search keywords from Google Trends for any country with structured JSON output                |
| hackernews                       | -                                                 | -                                             | [GO](go/hackernews) | Demonstrate Stagehand's core browser automation features through a complete Hacker News workflow               |
| image-url-download               | [TS](typescript/image-url-download)               | [PY](python/image-url-download)               | -                   | Extract all image URLs from a page and download each image through the browser's direct connection             |
| job-application                  | [TS](typescript/job-application)                  | [PY](python/job-application)                  | -                   | Automate job applications by discovering job listings and submitting applications                              |
| license-verification             | [TS](typescript/license-verification)             | [PY](python/license-verification)             | -                   | Extract structured, validated data from websites using Stagehand + Zod                                         |
| manual-mfa-with-contexts         | [TS](typescript/manual-mfa-with-contexts)         | [PY](python/manual-mfa-with-contexts)         | -                   | Persist authentication across sessions using Browserbase Contexts, eliminating MFA friction                    |
| mfa-handling                     | [TS](typescript/mfa-handling)                     | [PY](python/mfa-handling)                     | -                   | Automate MFA completion using TOTP (Time-based One-Time Password) code generation                              |
| microsoft-cua                    | [TS](typescript/microsoft-cua)                    | -                                             | -                   | Autonomous web browsing using Microsoft's Computer Use Agent with Stagehand and Browserbase                    |
| nurse-verification               | [TS](typescript/nurse-verification)               | [PY](python/nurse-verification)               | -                   | Automate verification of nurse licenses by filling forms and extracting structured results                     |
| pickleball                       | [TS](typescript/pickleball)                       | [PY](python/pickleball)                       | -                   | Automate tennis and pickleball court bookings in San Francisco Recreation & Parks system                       |
| playwright                       | [TS](typescript/playwright)                       | [PY](python/playwright)                       | -                   | Raw Playwright usage with Browserbase (no Stagehand)                                                           |
| playwright-mfa-handling          | [TS](typescript/playwright-mfa-handling)          | [PY](python/playwright-mfa-handling)          | -                   | Automate MFA completion using TOTP with raw Playwright and Browserbase                                         |
| polymarket-research              | [TS](typescript/polymarket-research)              | [PY](python/polymarket-research)              | -                   | Automate market research on prediction markets using Stagehand                                                 |
| proxies                          | [TS](typescript/proxies)                          | [PY](python/proxies)                          | -                   | Demonstrate different proxy configurations with Browserbase sessions                                           |
| proxies-weather                  | [TS](typescript/proxies-weather)                  | [PY](python/proxies-weather)                  | -                   | Geolocation proxies fetching location-specific weather data from multiple cities                               |
| puppeteer                        | [TS](typescript/puppeteer)                        | -                                             | -                   | Raw Puppeteer usage with Browserbase                                                                           |
| sec-filing-research              | [TS](typescript/sec-filing-research)              | [PY](python/sec-filing-research)              | -                   | Search SEC EDGAR for a company and extract recent filing metadata                                              |
| selenium                         | [TS](typescript/selenium)                         | [PY](python/selenium)                         | -                   | Raw Selenium usage with Browserbase                                                                            |
| smart-fetch-scraper              | [TS](typescript/smart-fetch-scraper)              | [PY](python/smart-fetch-scraper)              | -                   | Scrape a webpage using the fastest method available -- Fetch API first, full browser session as fallback       |
| website-link-tester              | [TS](typescript/website-link-tester)              | [PY](python/website-link-tester)              | -                   | Crawl a website's homepage, collect all links, and verify each link loads successfully                         |

## Model Gateway

Templates use the Model Gateway to route LLM requests -- you only need your `BROWSERBASE_API_KEY`. No separate OpenAI, Anthropic, or Google API keys required. Supported models include OpenAI, Anthropic, and Google (Gemini).

> **Note**: CUA (Computer Use Agent) models are not yet supported through the Model Gateway. Templates using CUA models still require a separate model provider API key.

## Getting Started

1. **Choose a template** from the table above
2. **Read the template's README** for specific setup instructions
3. **Set up your environment** with the required API keys and dependencies
4. **Run the template** and start automating

Each template's README contains detailed installation steps, environment variable requirements, and troubleshooting guides.

## Resources

### Documentation

- **Stagehand Docs**: https://docs.stagehand.dev/v3/first-steps/introduction
- **Browserbase Docs**: https://docs.browserbase.com

### Support

- **Discord**: http://stagehand.dev/discord
- **Email Support**: support@browserbase.com
- **GitHub Issues**: Report bugs and request features

## Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Use GitHub issues to report problems
2. **Suggest Features**: Propose new templates or improvements
3. **Submit Pull Requests**: Contribute code improvements
4. **Share Templates**: Create and share your own templates

### Template Guidelines

- Follow the established structure and naming conventions
- Include comprehensive README documentation
- Add proper error handling and logging
- Test templates thoroughly before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.
