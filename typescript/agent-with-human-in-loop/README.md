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
 1) cd agent-with-human-in-loop
 2) npm install
 3) Create a .env file and add your Browserbase credentials:
    BROWSERBASE_API_KEY=your-api-key
    BROWSERBASE_PROJECT_ID=your-project-id
    ANTHROPIC_API_KEY=your-anthropic-api-key
 5) npm run dev
 6) Open http://localhost:3000 in your browser

## EXPECTED OUTPUT
- A form appears to enter an applicant's name and upload a resume
- On submit, a Browserbase session starts and the live browser view loads
- The agent navigates to a job application site and begins filling out the form
- When the agent needs clarification, it pauses and displays a question in the UI
- You type a response and the agent resumes with your input
- On completion, a session recording link is displayed

## COMMON PITFALLS
- Missing credentials: verify .env contains BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID
- "Cannot find module": ensure all dependencies are installed with npm install
- Agent timeout: if the agent appears stuck, check that you've responded to any pending questions
- Session store is in-memory: restarting the server clears all active sessions

## USE CASES
• Assisted form filling: automate job applications, account signups, or onboarding flows where some fields require human judgment.
• Approval workflows: let an agent prepare actions (purchases, submissions) but pause for human confirmation before committing.
• Supervised data entry: automate repetitive browser data entry while letting a human handle edge cases or ambiguous inputs.

## NEXT STEPS
• Persist sessions: replace the in-memory session store with Redis, Postgres, or DynamoDB for production use.
• Multi-step approval: extend askHuman to support multiple-choice responses or file uploads mid-task.
• Add more tools: give the agent additional custom tools beyond askHuman and uploadResume.
• Webhook notifications: notify users via Slack or email when the agent needs input instead of requiring them to watch the UI.

## HELPFUL RESOURCES
📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
🎮 Browserbase:        https://www.browserbase.com
📧 Need help?          support@browserbase.com
