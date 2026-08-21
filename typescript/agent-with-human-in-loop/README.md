# Stagehand Code Mode + Vercel AI SDK: Human-in-the-Loop Agent

## AT A GLANCE

- Goal: showcase a bring-your-own browser agent that pauses for human input while filling a form.
- Agent framework: Vercel AI SDK `ToolLoopAgent` owns the reasoning loop and exposes a custom `askHuman` tool.
- Browser tool: Stagehand code mode exposes one stateful MCP tool, `code_execute`.
- Interactive loop: the agent calls `askHuman` for missing facts and resumes when the user responds.
- Live Browser View: watch the agent work in real-time through an embedded Browserbase session.
- SSE Streaming: real-time activity log and status updates streamed to the frontend.
  Docs → https://docs.browserbase.com/features/sessions

## GLOSSARY

- askHuman: an application-defined AI SDK tool that pauses execution and sends a question to the user, resuming once a response is provided
- session store: an in-memory map coordinating state between the SSE stream and the human response endpoint
- code_execute: Stagehand code mode's MCP tool for stateful browser JavaScript, including V4 page APIs and AI primitives
- ToolLoopAgent: the Vercel AI SDK agent loop that decides when to call `code_execute` or `askHuman`

## QUICKSTART

1.  cd agent-with-human-in-loop
2.  pnpm install
3.  Create a .env file and add your Browserbase and Vercel AI Gateway credentials:
    BROWSERBASE_API_KEY=your-api-key
    AI_GATEWAY_API_KEY=your-ai-gateway-key
4.  pnpm dev
5.  Open http://localhost:3000 in your browser

## EXPECTED OUTPUT

- A form appears to enter an applicant's name and upload a resume
- On submit, a Browserbase session starts and the live browser view loads
- The agent uses `code_execute` to navigate to a job application and fill known fields
- When an unknown field is encountered, it pauses and displays a question in the UI
- You type a response and the workflow continues with that value
- Closing the MCP client closes Stagehand and its Browserbase browser

## SAFETY

Code mode executes model-authored JavaScript and is not itself a security sandbox. Run it inside an isolation boundary when prompts or pages are untrusted.

## USE CASES

• Assisted form filling: automate job applications, account signups, or onboarding flows where some fields require human judgment.
• Approval workflows: let an agent prepare actions (purchases, submissions) but pause for human confirmation before committing.
• Supervised data entry: automate repetitive browser data entry while letting a human handle edge cases or ambiguous inputs.

## HELPFUL RESOURCES

📚 Stagehand Docs: https://docs.stagehand.dev
📚 Vercel AI SDK Agents: https://ai-sdk.dev/docs/agents/building-agents
📚 Vercel AI SDK MCP Tools: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
🎮 Browserbase: https://www.browserbase.com
💡 Try it out: https://www.browserbase.com/playground
🔧 Templates: https://www.browserbase.com/templates
📧 Need help? support@browserbase.com
💬 Discord: http://stagehand.dev/discord
