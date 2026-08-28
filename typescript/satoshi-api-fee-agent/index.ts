// Satoshi API Fee Agent - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const FeePageSchema = z.object({
  visibleFastFee: z
    .string()
    .describe("Fast or next-block fee visible on the current page, if present."),
  visibleEconomyFee: z
    .string()
    .describe("Lower-priority or economy fee visible on the current page, if present."),
  congestionSummary: z
    .string()
    .describe("Short summary of visible mempool or fee congestion context."),
});

type JsonObject = Record<string, unknown>;

interface SatoshiFeePayload {
  data: JsonObject;
  meta?: JsonObject;
}

function getObject(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getEstimate(data: JsonObject, keys: string[]): number | undefined {
  const estimates = getObject(data.estimates);
  for (const key of keys) {
    const estimate = estimates ? getNumber(estimates[key]) : undefined;
    if (estimate !== undefined) {
      return estimate;
    }

    const topLevel = getNumber(data[key]);
    if (topLevel !== undefined) {
      return topLevel;
    }
  }

  return undefined;
}

function summarizeSatoshiRecommendation(data: JsonObject): string {
  const recommendation =
    getString(data.recommendation) ??
    getString(data.summary) ??
    getString(data.message) ??
    "Satoshi API returned live Bitcoin fee context for this browser agent.";

  const nextBlockFee = getEstimate(data, [
    "1",
    "high",
    "fastestFee",
    "fastest_fee",
    "nextBlockFee",
    "next_block_fee_sat_vb",
  ]);
  const sixBlockFee = getEstimate(data, ["6", "medium", "halfHourFee"]);
  const dayFee = getEstimate(data, ["144", "low", "economyFee"]);

  const feeParts = [
    nextBlockFee === undefined ? null : `next block ${nextBlockFee} sat/vB`,
    sixBlockFee === undefined ? null : `~6 blocks ${sixBlockFee} sat/vB`,
    dayFee === undefined ? null : `~1 day ${dayFee} sat/vB`,
  ].filter((part): part is string => part !== null);

  return feeParts.length > 0 ? `${recommendation} (${feeParts.join(", ")})` : recommendation;
}

async function fetchSatoshiFeeRecommendation(): Promise<SatoshiFeePayload> {
  const baseUrl = process.env.SATOSHI_API_URL ?? "https://bitcoinsapi.com";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (process.env.SATOSHI_API_KEY) {
    headers["X-API-Key"] = process.env.SATOSHI_API_KEY;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/fees/recommended`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Satoshi API returned HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as unknown;
  const envelope = getObject(payload);
  const data = envelope ? getObject(envelope.data) : undefined;

  if (!data) {
    throw new Error("Satoshi API response did not include a data object.");
  }

  return {
    data,
    meta: envelope ? getObject(envelope.meta) : undefined,
  };
}

async function main() {
  const satoshiFeePayload = await fetchSatoshiFeeRecommendation();
  const satoshiRecommendation = summarizeSatoshiRecommendation(satoshiFeePayload.data);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-3-flash-preview",
    verbose: 1,
    browserbaseSessionCreateParams: {
      browserSettings: {
        viewport: {
          width: 1280,
          height: 720,
        },
      },
    },
  });

  try {
    await stagehand.init();

    const page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error("Browserbase session did not create an initial page.");
    }

    console.log(
      `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`,
    );
    console.log("Satoshi API fee recommendation:");
    console.log(satoshiRecommendation);

    await page.goto("https://mempool.space/", {
      waitUntil: "domcontentloaded",
      timeoutMs: 60000,
    });

    const pageContext = await stagehand.extract(
      `Extract the visible Bitcoin fee context from this page.
      Return the fast or next-block fee, a lower-priority or economy fee, and a short congestion summary.
      If a value is not visible, say "not visible".`,
      FeePageSchema,
    );

    console.log("\nBrowserbase session:");
    console.log(`Page title: ${await page.title()}`);
    console.log("Visible page context:");
    console.log(JSON.stringify(pageContext, null, 2));
  } finally {
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((error) => {
  console.error("Error running Satoshi API fee agent:", error);
  console.error("\nCommon issues:");
  console.error("  - Check .env file has BROWSERBASE_API_KEY");
  console.error("  - Add SATOSHI_API_KEY for higher Satoshi API limits");
  console.error("  - Use /api/v1/fees/recommended for the free quickstart");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
