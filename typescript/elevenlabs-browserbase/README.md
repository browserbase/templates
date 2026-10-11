# Stagehand + Browserbase + ElevenLabs: Hotel Concierge Voice Agent

## AT A GLANCE

- **Goal**: A voice-powered hotel concierge that searches for real activities in real time. Guest speaks, AI listens, browsers scrape, agent answers.
- **Pattern Template**: Shows how to combine ElevenLabs Conversational AI (voice) + Browserbase (cloud browsers) + Stagehand (browser automation) to build a voice agent with live web data.
- **Workflow**: Guest tells Aria (the concierge) what they want to do. Aria collects preferences, triggers two parallel Browserbase sessions to search Viator and Airbnb Experiences, then speaks back the best options with prices and durations.
- **Plans**: Sequential mode works on all plans; parallel browser sessions require Startup or Developer plan or higher ([concurrency](https://docs.browserbase.com/guides/concurrency-rate-limits)).
- Docs: [Stagehand Act](https://docs.stagehand.dev/basics/act) | [Stagehand Extract](https://docs.stagehand.dev/basics/extract) | [ElevenLabs Conversational AI](https://elevenlabs.io/docs/conversational-ai/overview)

## QUICKSTART

### 1. Clone and install

```bash
git clone <this-repo>
cd elevenlabs-browserbase
npm install
```

### 2. Add your API keys

```bash
cp .env.example .env
```

Fill in the four required keys:

| Variable | Where to get it |
|----------|----------------|
| `BROWSERBASE_API_KEY` | [Browserbase Settings](https://www.browserbase.com/settings) |
| `BROWSERBASE_PROJECT_ID` | [Browserbase Settings](https://www.browserbase.com/settings) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |
| `ELEVENLABS_API_KEY` | [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys) |

### 3. Run setup

```bash
npm run setup
```

This automatically creates the ElevenLabs voice agent (Aria) with the correct system prompt, webhook tool, and widget settings. The agent ID is written to your `.env` file.

### 4. Start the server

```bash
npm run dev
```

This automatically:
- Starts the Express server on `http://localhost:3000`
- Opens a localtunnel so ElevenLabs can reach your webhook
- Updates the agent's webhook URL with the tunnel address

Open `http://localhost:3000` — you'll see the ElevenLabs voice widget. Click to talk to Aria.

> **Note:** The tunnel is powered by [localtunnel](https://github.com/localtunnel/localtunnel), which requires no account but can occasionally drop connections. If the voice agent reports a service issue, restart with `npm run dev` to get a fresh tunnel. For a more stable tunnel, you can use [ngrok](https://ngrok.com) (free account required).

### 5. (Optional) Test the scraper standalone

```bash
npm run test-search
# or with custom args:
npx tsx test-search.ts "San Francisco" "2026-04-01" 2
```

This launches two Browserbase sessions, scrapes Viator and Airbnb, and prints results to your terminal. If this works, your Browserbase + Anthropic keys are good.

## THE 5-STEP FLOW

1. **Guest speaks** — via the ElevenLabs widget at `http://localhost:3000`
2. **Aria collects preferences** — location, date, group size, interests (conversationally, not a form)
3. **Server tool fires** — ElevenLabs calls `POST /search-activities` on your server
4. **Parallel browser scraping** — Two Stagehand sessions search Viator and Airbnb Experiences simultaneously
5. **Aria speaks results** — Top activities with prices, durations, and booking links, delivered conversationally

## ARCHITECTURE

```
Guest speaks (ElevenLabs widget at localhost:3000)
     │
     ▼
ElevenLabs Voice Agent (Aria)
     │  collects: location, date, groupSize, interests
     │
     ▼
POST /search-activities  (server tool webhook)
     │
     ▼
scraper.ts
  ┌──┴──┐
  │     │   (parallel Stagehand sessions on Browserbase)
  ▼     ▼
Viator  Airbnb Experiences
  │     │
  └──┬──┘
     │  merged Activity[] (up to 6 results)
     ▼
Aria speaks results back to guest
```

## EXPECTED BEHAVIOR

- Aria greets you and asks what you'd like to do
- You describe your interests conversationally ("we're a family of four looking for outdoor activities this Saturday")
- Aria confirms details and triggers the search (you'll see Browserbase sessions launch in your terminal)
- After 10-15 seconds, Aria describes the top options: names, prices, durations
- You can ask follow-up questions or request the booking link

## PROJECT STRUCTURE

```
├── setup.ts            # One-command agent setup (creates ElevenLabs agent)
├── server/
│   ├── index.ts         # Express server, /search-activities webhook, serves voice widget
│   ├── scraper.ts       # Orchestrates parallel Viator + Airbnb Stagehand sessions
│   ├── viator.ts        # Viator search: navigate, act, extract top 3
│   ├── airbnb.ts        # Airbnb Experiences search: navigate, act, extract top 3
│   └── types.ts         # SearchParams, Activity interfaces
├── agent/
│   └── config.ts        # Agent config reference (prompt + tool schema)
├── public/
│   └── index.html       # ElevenLabs widget + Browserbase session viewer
├── test-search.ts       # Standalone scraper test (no ElevenLabs needed)
├── .env.example
├── package.json
└── README.md
```

## GLOSSARY

- **act**: Tell the browser what to do in plain English. Stagehand translates it to real clicks and keystrokes.
  Docs: https://docs.stagehand.dev/basics/act
- **extract**: Pull structured data from a web page into a typed schema using Zod. Returns clean JSON.
  Docs: https://docs.stagehand.dev/basics/extract
- **Conversational AI**: ElevenLabs' platform for building voice agents with tool calling, low-latency speech, and webhook integrations.
  Docs: https://elevenlabs.io/docs/conversational-ai/overview
- **Server tool**: An ElevenLabs tool type that calls your webhook mid-conversation and waits for the response before the agent continues speaking.

## HELPFUL RESOURCES

- Stagehand Docs: https://docs.stagehand.dev
- Browserbase: https://www.browserbase.com
- ElevenLabs Conversational AI: https://elevenlabs.io/docs/conversational-ai/overview
- ElevenLabs Widget: https://elevenlabs.io/docs/conversational-ai/customization/widget
- Browserbase Templates: https://www.browserbase.com/templates
- Discord: https://stagehand.dev/discord
- Need help? support@browserbase.com
