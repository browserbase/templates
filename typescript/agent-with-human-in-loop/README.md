# Stagehand + Browserbase: Human-in-the-Loop Agent

## AT A GLANCE

- Goal: showcase how to build an AI agent that can pause and ask a human for input mid-task using Stagehand and Browserbase.
- Interactive Agent Loop: the agent automates browser tasks but can request human guidance when it encounters decisions it can't make alone.
- Live Browser View: watch the agent work in real-time through an embedded Browserbase session.
- SSE Streaming: real-time activity log and status updates streamed to the frontend.
  Docs → https://docs.browserbase.com/features/sessions

## GLOSSARY

- agent: an AI-driven Stagehand instance that autonomously performs browser actions and can invoke custom tools
  Docs → https://docs.stagehand.dev/basics/agent
- askHuman: a custom agent tool that pauses execution and sends a question to the user, resuming once a response is provided
- session store: an in-memory map coordinating state between the SSE stream and the human response endpoint
- act: perform UI actions from a prompt (type, click, fill forms)
  Docs → https://docs.stagehand.dev/basics/act
- observe: analyze a page and return selectors or action plans before executing
  Docs → https://docs.stagehand.dev/basics/observe

## QUICKSTART

1.  cd agent-with-human-in-loop
2.  npm install
3.  Create a .env file and add your Browserbase credentials:
    BROWSERBASE_API_KEY=your-api-key
    BROWSERBASE_PROJECT_ID=your-project-id
    ANTHROPIC_API_KEY=your-anthropic-api-key
4.  npm run dev
5.  Open http://localhost:3000 in your browser

## EXPECTED OUTPUT

- A form appears to enter an applicant's name and upload a resume
- On submit, a Browserbase session starts and the live browser view loads
- The agent navigates to a job application site and begins filling out the form
- When the agent needs clarification, it pauses and displays a question in the UI
- You type a response and the agent resumes with your input

## USE CASES

• Assisted form filling: automate job applications, account signups, or onboarding flows where some fields require human judgment.
• Approval workflows: let an agent prepare actions (purchases, submissions) but pause for human confirmation before committing.
• Supervised data entry: automate repetitive browser data entry while letting a human handle edge cases or ambiguous inputs.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev
📚 Stagehand Agent: https://docs.stagehand.dev/basics/agent
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
