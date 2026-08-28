// Human-in-the-Loop Approval Workflow - See README.md for full documentation

import "dotenv/config";
import * as readline from "readline";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// ============= CONFIGURATION =============
// Adjust these thresholds to control when human approval is required.
// With the default BOOK_URL below, the price rule always triggers (£51.77 > £20).
const PRICE_THRESHOLD = 20.0; // Pause if price exceeds this (site uses £)
const RATING_THRESHOLD = 3; // Pause if rating is strictly below this (out of 5)
const BOOK_URL =
  "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html";
const APPROVAL_TIMEOUT_MS = 120_000; // 2 minutes
// =========================================

const BookDetailsSchema = z.object({
  title: z.string().describe("The book title"),
  price: z
    .number()
    .describe("The price as a decimal number, without the currency symbol"),
  rating: z
    .number()
    .min(1)
    .max(5)
    .describe("The star rating as a whole number from 1 to 5"),
  availability: z.string().describe("Stock availability status"),
});

type BookDetails = z.infer<typeof BookDetailsSchema>;

/**
 * Pause the workflow and wait for a human approve/reject decision.
 * Prints a live Browserbase session URL so the human can watch the browser in real time.
 * Returns "approved", "rejected", or "timeout".
 */
async function waitForHumanDecision(
  sessionId: string,
  book: BookDetails,
): Promise<"approved" | "rejected" | "timeout"> {
  console.log("\n" + "═".repeat(62));
  console.log("  WORKFLOW PAUSED — HUMAN DECISION REQUIRED");
  console.log("═".repeat(62));
  console.log(
    `\nLive browser: https://browserbase.com/sessions/${sessionId}`,
  );
  console.log("\nProduct details:");
  console.log(`  Title:        ${book.title}`);
  console.log(`  Price:        £${book.price.toFixed(2)}`);
  console.log(`  Rating:       ${book.rating}/5 stars`);
  console.log(`  Availability: ${book.availability}`);
  console.log("\nReview the details above, then decide whether to proceed.");
  console.log("(Auto-rejects in 2 minutes if no input received.)\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const inputPromise = new Promise<"approved" | "rejected">((resolve) => {
    const ask = () => {
      rl.question('Type "approve" or "reject" and press Enter: ', (answer) => {
        const v = answer.trim().toLowerCase();
        if (v === "approve") {
          resolve("approved");
        } else if (v === "reject") {
          resolve("rejected");
        } else {
          console.log('  Please type exactly "approve" or "reject".');
          ask();
        }
      });
    };
    ask();
  });

  const timeoutPromise = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), APPROVAL_TIMEOUT_MS),
  );

  const decision = await Promise.race([inputPromise, timeoutPromise]);
  rl.close();
  return decision;
}

/**
 * Evaluate configurable purchase rules against extracted book data.
 * Returns whether to pause and a list of reasons explaining why.
 */
function evaluatePurchaseRules(book: BookDetails): {
  shouldPause: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (book.price > PRICE_THRESHOLD) {
    reasons.push(
      `Price £${book.price.toFixed(2)} exceeds threshold £${PRICE_THRESHOLD.toFixed(2)}`,
    );
  }
  if (book.rating < RATING_THRESHOLD) {
    reasons.push(
      `Rating ${book.rating}/5 is below threshold ${RATING_THRESHOLD}/5`,
    );
  }
  return { shouldPause: reasons.length > 0, reasons };
}

async function main() {
  console.log("Starting Human-in-the-Loop Purchase Approval Demo...");

  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    console.error("\nError: Missing Browserbase credentials");
    console.error(
      "  Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env",
    );
    process.exit(1);
  }

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    // 0 = errors only, 1 = info, 2 = debug
    model: "openai/gpt-4.1-mini",
  });

  try {
    await stagehand.init();
    const sessionId = stagehand.browserbaseSessionID!;
    console.log(`\nWatch live: https://browserbase.com/sessions/${sessionId}`);

    const page = stagehand.context.pages()[0];

    // Step 1: Navigate to the product page
    console.log("\nNavigating to product page...");
    await page.goto(BOOK_URL, { waitUntil: "domcontentloaded" });

    // Step 2: Extract product details using AI
    console.log("Extracting product details...");
    const book = await stagehand.extract(
      "Extract the book title, price as a decimal number without the currency symbol, " +
        "star rating as a whole number from 1 to 5, and stock availability status.",
      BookDetailsSchema,
    );
    console.log(
      `Found: "${book.title}" at £${book.price.toFixed(2)}, ${book.rating}/5 stars`,
    );

    // Step 3: Evaluate purchase rules
    const { shouldPause, reasons } = evaluatePurchaseRules(book);

    if (!shouldPause) {
      // Auto-approve path: rules not triggered
      console.log("\nPurchase rules not triggered — auto-approving.");
      console.log("Adding to basket...");
      await stagehand.act("Click the Add to basket button");
      console.log("Item added to basket successfully.");
    } else {
      // Step 4: Pause for human decision
      console.log("\nPurchase rules triggered:");
      for (const reason of reasons) {
        console.log(`  - ${reason}`);
      }

      const decision = await waitForHumanDecision(sessionId, book);

      if (decision === "approved") {
        console.log("\nApproved — proceeding with purchase...");
        await stagehand.act("Click the Add to basket button");
        console.log("Item added to basket successfully.");
      } else if (decision === "rejected") {
        console.log("\nRejected — aborting purchase workflow.");
      } else {
        console.log(
          "\nTimeout — no response received within 2 minutes. Auto-rejecting.",
        );
      }
    }

    console.log("\n" + "═".repeat(62));
    console.log("  Workflow complete.");
    console.log("═".repeat(62));
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    await stagehand.close();
    console.log("Session closed.");
  }
}

main().catch((err) => {
  console.error("Application error:", err);
  console.error("\nTroubleshooting:");
  console.error(
    "  - Ensure .env has BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and OPENAI_API_KEY",
  );
  console.error("  - Docs: https://docs.stagehand.dev");
  process.exit(1);
});
