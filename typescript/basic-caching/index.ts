// Stagehand + Browserbase: Basic Caching - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "stagehand-demo");

async function runWithoutCache() {
  console.log("RUN 1: WITHOUT CACHING");

  const startTime = Date.now();

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "google/gemini-2.5-flash",
    enableCaching: false,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    },
  });

  await stagehand.init();
  const page = stagehand.context.pages()[0];

  try {
    console.log("Navigating to Stripe checkout...");
    await page.goto("https://checkout.stripe.dev/preview", {
      waitUntil: "domcontentloaded",
    });

    await stagehand.act("Click on the View Demo button");
    await stagehand.act("Type 'test@example.com' into the email field");
    await stagehand.act("Type '4242424242424242' into the card number field");
    await stagehand.act("Type '12/34' into the expiration date field");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Total time: ${elapsed}s`);
    console.log("Cost: ~$0.01-0.05 (4 LLM calls)");
    console.log("API calls: 4 (one per action)\n");

    await stagehand.close();

    return { elapsed, llmCalls: 4 };
  } catch (error) {
    console.error("Error:", error.message);
    await stagehand.close();
    throw error;
  }
}

async function runWithCache() {
  console.log("RUN 2: WITH CACHING");

  const startTime = Date.now();

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.)
    // https://docs.stagehand.dev/configuration/logging
    model: "google/gemini-2.5-flash",
    enableCaching: true,
    cacheDir: CACHE_DIR,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    },
  });

  await stagehand.init();
  const page = stagehand.context.pages()[0];

  try {
    console.log("Navigating to Stripe checkout...");
    await page.goto("https://checkout.stripe.dev/preview", {
      waitUntil: "domcontentloaded",
    });

    await stagehand.act("Click on the View Demo button");
    await stagehand.act("Type 'test@example.com' into the email field");
    await stagehand.act("Type '4242424242424242' into the card number field");
    await stagehand.act("Type '12/34' into the expiration date field");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const cacheExists = fs.existsSync(CACHE_DIR);
    const cacheFiles = cacheExists ? fs.readdirSync(CACHE_DIR).length : 0;

    console.log(`Total time: ${elapsed}s`);

    if (cacheFiles > 0) {
      console.log("Cost: $0.00 (cache hits, no LLM calls)");
      console.log("API calls: 0 (all from cache)");
      console.log(`Cache entries: ${cacheFiles}`);
    } else {
      console.log("💰Cost: ~$0.01-0.05 (first run, populated cache)");
      console.log("📡API calls: 4 (saved to cache for next run)");
      console.log("📂Cache created");
    }
    console.log();

    await stagehand.close();

    return { elapsed, llmCalls: cacheFiles > 0 ? 0 : 4 };
  } catch (error) {
    console.error("Error:", error.message);
    await stagehand.close();
    throw error;
  }
}

async function main() {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Caching Demo - Run This Script TWICE!         ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("This demo shows caching impact by running the same workflow twice:\n");
  console.log("First run:");
  console.log("  1. WITHOUT cache (baseline)");
  console.log("  2. WITH cache enabled (populates cache)\n");

  console.log("Second run:");
  console.log("  - WITH cache (instant, $0 cost)\n");

  console.log("Run 'pnpm start' twice to see the difference!\n");

  // Check if cache exists
  const cacheExists = fs.existsSync(CACHE_DIR);

  if (cacheExists) {
    const cacheFiles = fs.readdirSync(CACHE_DIR);
    console.log(`📂 Cache found: ${cacheFiles.length} entries`);
    console.log("   This is a SUBSEQUENT run - cache will be used!\n");
  } else {
    console.log("No cache found - first run will populate cache");
  }

  console.log("\nRunning comparison: without cache vs with cache...\n");

  const withoutCache = await runWithoutCache();
  const withCache = await runWithCache();

  console.log("\n=== Comparison ===");
  console.log(`Without caching: ${withoutCache.elapsed}s, ${withoutCache.llmCalls} LLM calls`);
  console.log(`With caching:    ${withCache.elapsed}s, ${withCache.llmCalls} LLM calls`);

  if (withCache.llmCalls === 0) {
    const speedup = (parseFloat(withoutCache.elapsed) / parseFloat(withCache.elapsed)).toFixed(1);
    console.log(`\nSpeedup: ${speedup}x faster with cache`);
    console.log("Cost savings: 100% (no LLM calls)");
  }

  console.log("\nRun again to see cache benefits on subsequent runs!");
}

main().catch((err) => {
  console.error("Error in caching demo:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_API_KEY is set for the model");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
