import "dotenv/config";
import fs from "fs";
import path from "path";
import { URL } from "url";
import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import Anthropic from "@anthropic-ai/sdk";

const SCREENSHOTS_DIR = "./screenshots";
const COMPARISON_FILE = "./comparison.md";

interface Target {
  name: string;
  url: string;
}

interface PricingPlan {
  name: string;
  price: string;
  features: string[];
}

interface CompetitorData {
  name: string;
  plans: PricingPlan[];
}

interface AnalysisResult {
  competitors: CompetitorData[];
}

const DEFAULT_COMPETITORS: Target[] = [
  { name: "Asana", url: "https://asana.com/pricing" },
  { name: "Linear", url: "https://linear.app/pricing" },
  { name: "Notion", url: "https://www.notion.com/pricing" },
];

function nameFromUrl(rawUrl: string): string {
  const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
  return hostname.split(".")[0] ?? hostname;
}

function resolveTargets(): Target[] {
  const args = process.argv.slice(2).filter((a) => a.startsWith("http"));
  if (args.length === 0) return DEFAULT_COMPETITORS;
  return args.map((u) => ({ name: nameFromUrl(u), url: u }));
}

async function main(): Promise<void> {
  console.log("=== Competitor Pricing Monitor ===\n");

  const targets = resolveTargets();
  const usingDefaults = targets === DEFAULT_COMPETITORS;
  console.log(
    usingDefaults
      ? `Using default competitors: ${targets.map((t) => t.name).join(", ")}`
      : `Custom URLs provided: ${targets.map((t) => t.url).join(", ")}`,
  );
  console.log();

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

  console.log("Creating Browserbase remote browser session...");
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });
  console.log(`Session created: ${session.id}\n`);

  const connectUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${session.id}`;
  const browser = await chromium.connectOverCDP(connectUrl);
  console.log("Playwright connected to remote browser via CDP.\n");

  const screenshots: Array<{ name: string; base64: string }> = [];
  const savedFiles: string[] = [];

  try {
    for (const target of targets) {
      console.log(`[${target.name}] Navigating to ${target.url} ...`);
      const page = await browser.newPage();

      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      await page
        .waitForSelector('main, [role="main"], #main, .pricing', { timeout: 10_000 })
        .catch(() => {
          console.log(`  [${target.name}] Main selector not found — continuing anyway.`);
        });

      await page.waitForTimeout(2000);

      console.log(`  [${target.name}] Page loaded. Taking screenshot...`);
      const buffer = await page.screenshot({ type: "png", fullPage: true });
      const base64 = buffer.toString("base64");

      const filename = `${target.name.toLowerCase()}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      savedFiles.push(filepath);

      screenshots.push({ name: target.name, base64 });
      console.log(
        `  [${target.name}] Screenshot saved → ${filepath} (${Math.round(buffer.length / 1024)} KB)\n`,
      );

      await page.close();
    }
  } finally {
    console.log("Closing browser session...");
    await browser.close();
    console.log("Browser session closed.\n");
  }

  const anthropic = new Anthropic({ apiKey: process.env.MODEL_API_KEY });

  const imageBlocks = screenshots.map((s) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: "image/png" as const, data: s.base64 },
  }));

  const labelBlock = {
    type: "text" as const,
    text:
      `The screenshots below are (in order): ${screenshots.map((s) => s.name).join(", ")}.\n\n` +
      "You are a pricing analyst. Here are screenshots of competitor pricing pages. " +
      "Extract the plan names, prices, and key features for each competitor. " +
      "Return ONLY valid JSON matching this exact structure — no markdown fences, no extra text:\n" +
      "{\n" +
      '  "competitors": [\n' +
      "    {\n" +
      '      "name": "CompanyName",\n' +
      '      "plans": [\n' +
      '        { "name": "Plan Name", "price": "$X/mo", "features": ["feature1", "feature2"] }\n' +
      "      ]\n" +
      "    }\n" +
      "  ]\n" +
      "}",
  };

  console.log(`Sending ${screenshots.length} screenshot(s) to Claude for analysis...`);

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    messages: [{ role: "user", content: [labelBlock, ...imageBlocks] }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let data: AnalysisResult | null = null;
  try {
    data = JSON.parse(rawText) as AnalysisResult;
  } catch {
    console.error("Could not parse Claude response as JSON — printing raw output:\n");
    console.log(rawText);
  }

  console.log("Claude analysis complete.\n");
  console.log("=== Pricing Comparison ===");

  const mdLines = [`# Competitor Pricing Comparison\n\n_Generated: ${new Date().toISOString()}_\n`];

  if (data?.competitors) {
    const COL_PLAN = 22;
    const COL_PRICE = 16;
    const DIVIDER = "─".repeat(COL_PLAN + COL_PRICE + 40);
    const pad = (str: unknown, len: number): string => String(str ?? "").padEnd(len);

    for (const competitor of data.competitors) {
      console.log(`\n${competitor.name.toUpperCase()}`);
      console.log(DIVIDER);
      console.log(`${pad("PLAN", COL_PLAN)}${pad("PRICE", COL_PRICE)}KEY FEATURES`);
      console.log(DIVIDER);

      const mdTableRows = ["| Plan | Price | Key Features |", "|------|-------|--------------|"];

      for (const plan of competitor.plans ?? []) {
        const features = (plan.features ?? []).join(", ");
        console.log(`${pad(plan.name, COL_PLAN)}${pad(plan.price, COL_PRICE)}${features}`);
        mdTableRows.push(`| ${plan.name} | ${plan.price} | ${features} |`);
      }

      console.log(DIVIDER);
      mdLines.push(`## ${competitor.name}\n\n${mdTableRows.join("\n")}\n`);
    }
  } else {
    mdLines.push(rawText);
  }

  fs.writeFileSync(COMPARISON_FILE, mdLines.join("\n"));

  console.log("\n=== Summary ===");
  console.log(`Pages visited:    ${targets.length} (${targets.map((t) => t.name).join(", ")})`);
  console.log(`Session ID:       ${session.id}`);
  console.log(`Screenshots:      ${savedFiles.join(", ")}`);
  console.log(`Comparison saved: ${COMPARISON_FILE}`);
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
