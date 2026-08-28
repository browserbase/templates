import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import localtunnel from "localtunnel";
import { searchActivities, scraperEvents } from "./scraper";
import { SearchParams } from "./types";
import { searchToolDefinition } from "../agent/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/config", (_req, res) => {
  res.json({
    agentId: process.env.ELEVENLABS_AGENT_ID || "",
    webhookSecret: WEBHOOK_SECRET || "",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function requireSecret(req: Request, res: Response, next: NextFunction) {
  if (!WEBHOOK_SECRET) {
    next();
    return;
  }
  const provided =
    req.query.secret || req.headers["x-webhook-secret"];
  if (provided !== WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/api/sessions", requireSecret, (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const onSessions = (data: { viator?: string; airbnb?: string }) => {
    res.write(`data: ${JSON.stringify({ type: "sessions", ...data })}\n\n`);
  };
  const onAction = (data: { source: string; action: string; detail?: string }) => {
    res.write(`data: ${JSON.stringify({ type: "action", ...data })}\n\n`);
  };
  const onDone = () => {
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  };

  scraperEvents.on("sessions", onSessions);
  scraperEvents.on("action", onAction);
  scraperEvents.on("done", onDone);

  _req.on("close", () => {
    scraperEvents.off("sessions", onSessions);
    scraperEvents.off("action", onAction);
    scraperEvents.off("done", onDone);
  });
});

app.post("/search-activities", requireSecret, async (req, res) => {
  const body = req.body as Partial<SearchParams>;

  if (
    !body.location ||
    typeof body.location !== "string" ||
    !body.date ||
    typeof body.date !== "string" ||
    !body.groupSize ||
    typeof body.groupSize !== "number" ||
    !body.interests ||
    !Array.isArray(body.interests)
  ) {
    res.status(400).json({
      error:
        "Missing or invalid required fields: location (string), date (string), groupSize (number), interests (string[])",
    });
    return;
  }

  const params: SearchParams = {
    location: body.location,
    date: body.date,
    groupSize: body.groupSize,
    interests: body.interests,
    budgetPerPerson: body.budgetPerPerson,
  };

  try {
    console.log(`Searching activities for ${params.location} on ${params.date} for ${params.groupSize} people...`);
    const activities = await searchActivities(params);
    console.log(`Found ${activities.length} activities`);

    res.json({
      activities,
      searchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Failed to search activities" });
  }
});

async function updateAgentWebhook(tunnelUrl: string) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!agentId || !apiKey) return;

  const webhookUrl = WEBHOOK_SECRET
    ? `${tunnelUrl}/search-activities?secret=${WEBHOOK_SECRET}`
    : `${tunnelUrl}/search-activities`;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              tools: [searchToolDefinition(webhookUrl)],
            },
          },
        },
      }),
    }
  );

  if (res.ok) {
    console.log(`Webhook updated: ${tunnelUrl}/search-activities`);
  } else {
    const body = await res.text();
    console.error(`Failed to update webhook (${res.status}): ${body}`);
  }
}

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, async () => {
  console.log(`Hotel concierge server running on http://localhost:${port}`);
  console.log(`Voice widget available at http://localhost:${port}`);

  if (!WEBHOOK_SECRET) {
    console.warn("⚠  WEBHOOK_SECRET is not set — endpoints are unauthenticated. Run `npm run setup` to generate one.");
  }

  try {
    const tunnel = await localtunnel({ port });
    console.log(`Tunnel active: ${tunnel.url}`);
    await updateAgentWebhook(tunnel.url);

    tunnel.on("close", () => {
      console.log("Tunnel closed");
    });
  } catch (err) {
    console.error("Failed to start tunnel:", err);
    console.log("The voice agent webhook won't work without a tunnel.");
  }
});
