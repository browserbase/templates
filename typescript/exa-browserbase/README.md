# Stagehand + Browserbase + Exa: Intelligent Job Application Automation

## AT A GLANCE

- **Goal**: Automate job applications with AI that writes smart, tailored responses for each role.
- **Pattern Template**: Shows how to combine Exa (find companies & jobs) + Browserbase (control browser) + Stagehand Agent (fill forms smartly).
- **Workflow**: Exa finds companies you want, then finds their careers pages. Browserbase opens the page, Stagehand reads the job posting, and an AI agent fills out the application form with answers tailored to that specific job.
- **Plans**: Sequential mode works on all plans; concurrent applications and proxies require Startup or Developer plan or higher ([concurrency](https://docs.browserbase.com/guides/concurrency-rate-limits), [proxies](https://docs.browserbase.com/features/proxies)).
- Docs → [Stagehand Agent](https://docs.stagehand.dev/basics/agent) | [Exa Search](https://docs.exa.ai/reference/search) | [Stagehand Extract](https://docs.stagehand.dev/basics/extract)

## THE 5-STEP FLOW

1. **Search for companies** — Exa finds companies matching your criteria (e.g., "AI startups in SF")
2. **Find careers pages** — For each company, Exa searches for their careers/jobs page
3. **Extract job details** — Stagehand reads the job posting and extracts structured data (title, requirements, responsibilities)
4. **Smart form filling** — AI agent fills out application fields with tailored responses based on the job description
5. **Resume upload** — Playwright handles file uploads for resume/CV attachments

## GLOSSARY

- **agent**: An AI that can plan and do multi-step tasks on its own. It looks at the page and decides what to do next without needing step-by-step instructions.
  Docs → https://docs.stagehand.dev/basics/agent
- **extract**: Pull structured data from web pages. You define what you want (job title, requirements, etc.) and it returns clean JSON.
  Docs → https://docs.stagehand.dev/basics/extract
- **Exa Search**: AI search engine that finds relevant web content. Can search for companies, find similar pages, and filter by date.
  Docs → https://docs.exa.ai/reference/search
- **Hybrid mode**: Agent mode that combines reading the page code (DOM) and looking at the page visually. Works better across different websites.
- **Tailored responses**: The AI reads the job requirements and writes custom answers for cover letters and open-ended questions that highlight relevant skills.

## QUICKSTART

1. cd exa-browserbase
2. pnpm install
3. cp .env.example .env
4. Add required API keys to .env:
   - `BROWSERBASE_PROJECT_ID` — from Browserbase
   - `BROWSERBASE_API_KEY` — from Browserbase
   - `EXA_API_KEY` — from https://dashboard.exa.ai/api-keys
   - Configure your Browserbase API key with OpenRouter/Anthropic
5. Update `applicationDetails` object with candidate information
6. Update `resumePath` to point to your PDF resume
7. pnpm start

## EXPECTED OUTPUT

- Uses your exact info for name, email, phone
- Writes custom answers for open-ended questions
- Creates a tailored cover letter based on the job
- Handles location and visa questions smartly
- Stops before submitting (for testing/review purposes)
- Closes session cleanly

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev/v3/first-steps/introduction
📚 Stagehand Agent: https://docs.stagehand.dev/basics/agent
📚 Exa API Key: https://dashboard.exa.ai/api-keys
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
