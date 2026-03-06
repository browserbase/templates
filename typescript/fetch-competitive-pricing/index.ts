// Stagehand + Browserbase + Anthropic: Competitive Pricing Intelligence - See README.md for full documentation

import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
if (!BROWSERBASE_API_KEY) {
  console.error("Set BROWSERBASE_API_KEY to run this demo.");
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY to run this demo.");
  process.exit(1);
}

const BB_FETCH_URL = "https://api.browserbase.com/v1/fetch";
// const BB_FETCH_URL = "https://api.dev.browserbase.com/v1/fetch"; // dev only
const COMPETITORS_FILE = "competitors.txt";
const HTML_TRUNCATE = 80_000;

interface FetchSuccess {
  url: string;
  html: string;
  status: string | null;
  title: string;
}

interface FetchFailure {
  url: string;
  error: string;
}

type FetchResult = FetchSuccess | FetchFailure;

interface PricingTier {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  highlights: string[];
}

interface PricingData {
  companyName: string;
  pricingUrl: string;
  tiers: PricingTier[];
  freeTrialOrFreeTier: string;
  notes: string;
}

// --- Step 1: Read URLs from competitors.txt ---

async function readCompetitorUrls(): Promise<string[]> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const filePath = join(__dirname, COMPETITORS_FILE);
  const text = await readFile(filePath, "utf-8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

// --- Step 2: Fetch pages in parallel via Browserbase ---

async function fetchPageOnce(url: string): Promise<FetchResult> {
  const response = await fetch(BB_FETCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bb-api-key": BROWSERBASE_API_KEY!,
    },
    body: JSON.stringify({ url, allowRedirects: true }),
  });

  if (!response.ok) {
    return { url, error: `HTTP ${response.status} from Browserbase` };
  }

  const html = await response.text();
  const status = response.headers.get("x-upstream-status");
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  return { url, html, status, title };
}

async function fetchPage(url: string, index: number, total: number): Promise<FetchResult> {
  console.log(`[${index}/${total}] Fetching ${url}...`);
  try {
    return await fetchPageOnce(url);
  } catch (firstErr) {
    console.log(`  [${index}/${total}] Fetch failed (${firstErr}), retrying...`);
    try {
      const result = await fetchPageOnce(url);
      console.log(`  [${index}/${total}] Retry succeeded.`);
      return result;
    } catch (secondErr) {
      return { url, error: String(secondErr) };
    }
  }
}

// --- Step 3: Extract pricing from each page with Claude Haiku (parallel) ---

async function extractPricing(
  result: FetchSuccess,
  client: Anthropic,
  index: number,
  total: number
): Promise<PricingData | null> {
  console.log(`[${index}/${total}] Extracting pricing from ${result.title}...`);
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Extract pricing information from this web page and return ONLY valid JSON — no markdown fences, no explanation.

The JSON must match this exact shape:
{
  "companyName": "string",
  "pricingUrl": "string",
  "tiers": [
    {
      "name": "string",
      "monthlyPrice": "string",
      "annualPrice": "string",
      "highlights": ["string"]
    }
  ],
  "freeTrialOrFreeTier": "string",
  "notes": "string"
}

Rules:
- monthlyPrice/annualPrice: use "$X/mo", "Free", "Custom", or "N/A"
- highlights: top 3-5 bullet features per tier
- freeTrialOrFreeTier: e.g. "14-day free trial", "Free tier up to 1k reqs/mo", "None"
- notes: usage-based pricing, contact-sales requirements, anything notable
- If a field is unknown, use "Unknown"

Source URL: ${result.url}

Page content:
${result.html.slice(0, HTML_TRUNCATE)}`,
        },
      ],
    });

    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Strip markdown code fences if the model wrapped the JSON anyway
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    return JSON.parse(text) as PricingData;
  } catch (err) {
    console.error(`  Failed to extract pricing for ${result.url}: ${err}`);
    return null;
  }
}

// --- Step 4: Aggregate into a report with Claude Opus (single call) ---

async function generateReport(
  pricingData: PricingData[],
  client: Anthropic
): Promise<string> {
  console.log("\nGenerating competitive pricing report with Claude Opus 4.6...");

  const dataJson = JSON.stringify(pricingData, null, 2);

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are a competitive intelligence analyst. Using the structured pricing data below, produce a polished markdown pricing intelligence report.

The report must include all of the following sections in order:

## Executive Summary
3-5 bullet points summarising the most important competitive takeaways.

## Side-by-Side Comparison Table
A markdown table comparing companies across their tiers, monthly prices, annual prices, and standout features.

## Per-Competitor Deep Dive
One ### subsection per company with a full tier breakdown (features, pricing, trial/free tier, notable caveats).

## Competitive Insights
Positioning gaps, pricing patterns, who has free tiers, who targets SMB vs enterprise, and any other strategic observations.

Be factual and precise. Do not invent data that is not in the input.

Pricing data:
\`\`\`json
${dataJson}
\`\`\``,
      },
    ],
  });

  console.log(`Report token usage — input: ${message.usage.input_tokens.toLocaleString()}, output: ${message.usage.output_tokens.toLocaleString()}`);

  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// --- Main ---

function secs(ms: number) {
  return (ms / 1000).toFixed(2) + "s";
}

async function main() {
  const totalStart = Date.now();

  // Read URLs
  const urls = await readCompetitorUrls();
  if (urls.length === 0) {
    console.error(`No URLs found in ${COMPETITORS_FILE}. Add one URL per line.`);
    process.exit(1);
  }
  console.log(`Found ${urls.length} competitor URL(s) in ${COMPETITORS_FILE}\n`);

  // Parallel fetch
  const fetchStart = Date.now();
  const fetchResults = await Promise.all(
    urls.map((url, i) => fetchPage(url, i + 1, urls.length))
  );
  const fetchMs = Date.now() - fetchStart;

  const successes = fetchResults.filter((r): r is FetchSuccess => !("error" in r));
  const failures = fetchResults.filter((r): r is FetchFailure => "error" in r);

  if (failures.length > 0) {
    console.log("\nFailed fetches (skipped):");
    for (const f of failures) {
      console.log(`  - ${f.url}: ${f.error}`);
    }
  }

  if (successes.length === 0) {
    console.error("\nAll fetches failed — nothing to process.");
    process.exit(1);
  }

  console.log(`\nSuccessfully fetched ${successes.length}/${urls.length} pages — fetch took ${secs(fetchMs)}\n`);

  // Parallel extraction
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const extractionResults = await Promise.all(
    successes.map((result, i) =>
      extractPricing(result, client, i + 1, successes.length)
    )
  );

  const pricingData = extractionResults.filter((d): d is PricingData => d !== null);

  if (pricingData.length === 0) {
    console.error("\nPricing extraction failed for all pages.");
    process.exit(1);
  }

  console.log(`\nExtracted pricing data from ${pricingData.length}/${successes.length} pages\n`);

  // Generate aggregated report
  const reportStart = Date.now();
  const report = await generateReport(pricingData, client);
  const reportMs = Date.now() - reportStart;

  // Build dynamic filename: "<company1>-vs-<company2>-...-YYYY-MM-DD.md"
  const timestamp = new Date().toISOString().slice(0, 10);
  const slug = pricingData
    .slice(0, 3)
    .map((d) => d.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .join("-vs-");
  const filename = `${slug}-${timestamp}.md`;

  // Save report
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputDir = join(__dirname, "analysis-summaries");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, filename);
  await writeFile(outputPath, report, "utf-8");

  console.log(`\nReport saved to: ${outputPath}`);
  console.log(`Report size: ${report.length.toLocaleString()} characters`);
  console.log(`\nTiming:`);
  console.log(`  Fetch:   ${secs(fetchMs)}`);
  console.log(`  Report:  ${secs(reportMs)}`);
  console.log(`  Total:   ${secs(Date.now() - totalStart)}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
