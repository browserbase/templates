/**
 * setup.ts — One-command setup for the Hotel Concierge demo.
 *
 * Creates the ElevenLabs Conversational AI agent with the correct prompt,
 * webhook tool, and widget settings, then writes the agent ID to .env.
 *
 * Usage:
 *   npm run setup
 *   # or with a custom tunnel URL:
 *   npm run setup -- --webhook-url https://your-tunnel.loca.lt
 */

import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  AGENT_NAME,
  FIRST_MESSAGE,
  systemPrompt,
  searchToolDefinition,
  PLATFORM_SETTINGS,
  TTS_CONFIG,
} from "./agent/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ELEVENLABS_API_KEY;
const HOTEL_LOCATION = process.env.HOTEL_LOCATION || "New York City";
const PORT = process.env.PORT || "3000";

if (!API_KEY) {
  console.error(
    "\n❌  ELEVENLABS_API_KEY is not set in .env\n" +
    "   Get one at https://elevenlabs.io/app/settings/api-keys\n"
  );
  process.exit(1);
}

const webhookUrlArg = process.argv.find((a) => a.startsWith("--webhook-url"));
let webhookUrl: string | undefined;
if (webhookUrlArg) {
  webhookUrl = webhookUrlArg.includes("=")
    ? webhookUrlArg.split("=")[1]
    : process.argv[process.argv.indexOf(webhookUrlArg) + 1];
}

const serverUrl = webhookUrl || `http://localhost:${PORT}`;

function ensureWebhookSecret(envPath: string, envContent: string): { secret: string; envContent: string } {
  const existing = process.env.WEBHOOK_SECRET;
  if (existing) return { secret: existing, envContent };

  const secret = crypto.randomBytes(32).toString("hex");
  if (envContent.includes("WEBHOOK_SECRET=")) {
    envContent = envContent.replace(/WEBHOOK_SECRET=.*/, `WEBHOOK_SECRET=${secret}`);
  } else {
    envContent += `\nWEBHOOK_SECRET=${secret}\n`;
  }
  return { secret, envContent };
}

function buildAgentPayload(webhookEndpoint: string) {
  return {
    name: AGENT_NAME,
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE,
        language: "en",
        prompt: {
          prompt: systemPrompt(HOTEL_LOCATION),
          llm: "gpt-4o-mini",
          temperature: 0.7,
          tools: [searchToolDefinition(webhookEndpoint)],
        },
      },
      tts: TTS_CONFIG,
    },
    platform_settings: PLATFORM_SETTINGS,
  };
}

async function main() {
  const envPath = path.join(__dirname, ".env");
  let envContent = "";
  try {
    envContent = fs.readFileSync(envPath, "utf-8");
  } catch {
    // .env doesn't exist yet
  }

  const { secret, envContent: updatedEnv } = ensureWebhookSecret(envPath, envContent);
  envContent = updatedEnv;

  const webhookEndpoint = `${serverUrl}/search-activities?secret=${secret}`;

  const existingId = process.env.ELEVENLABS_AGENT_ID;
  if (existingId) {
    const check = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${existingId}`,
      { headers: { "xi-api-key": API_KEY! } }
    );
    if (check.ok) {
      console.log(`\n✅  Agent already exists: ${existingId}`);
      console.log("   To recreate, remove ELEVENLABS_AGENT_ID from .env and run again.\n");
      fs.writeFileSync(envPath, envContent);
      return;
    }
  }

  console.log("\n🔧  Creating ElevenLabs Conversational AI agent...");
  console.log(`   Webhook URL: ${serverUrl}/search-activities`);
  if (!webhookUrl) {
    console.log(
      "   ⚠  Using localhost — the webhook won't work until you expose it with a tunnel.\n" +
      "      Re-run with: npm run setup -- --webhook-url=https://your-tunnel-url.com\n"
    );
  }

  const agentPayload = buildAgentPayload(webhookEndpoint);

  const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agentPayload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`\n❌  Failed to create agent (${res.status}):\n${body}\n`);
    process.exit(1);
  }

  const { agent_id } = (await res.json()) as { agent_id: string };
  console.log(`\n✅  Agent created: ${agent_id}`);

  if (envContent.includes("ELEVENLABS_AGENT_ID=")) {
    envContent = envContent.replace(
      /ELEVENLABS_AGENT_ID=.*/,
      `ELEVENLABS_AGENT_ID=${agent_id}`
    );
  } else {
    envContent += `\nELEVENLABS_AGENT_ID=${agent_id}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`   Written to .env as ELEVENLABS_AGENT_ID=${agent_id}`);

  console.log("\n🚀  Setup complete! Next steps:");
  console.log("   1. npm run dev        — start the server");
  console.log("   2. Open http://localhost:3000 and talk to Aria\n");

  if (!webhookUrl) {
    console.log("   📡  For the search tool to work, expose your server:");
    console.log("       npx localtunnel --port 3000");
    console.log("       Then re-run: npm run setup -- --webhook-url=https://your-url.loca.lt\n");
  }
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
