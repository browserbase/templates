// Stagehand + Browserbase: Credit Karma Mortgage Rates with Caching - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v3";

// User configuration for mortgage rate lookup
// Modify these values to customize the mortgage rate search
const USER_CONFIG = {
  creditScore: "Above 760",
  zipcode: "94109",
  loanBalance: "500000",
  homeValue: "1000000",
  cashOut: "200000",
};

async function main() {
  console.log("Starting Credit Karma Mortgage Rate Automation...");

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 0,
    model: "google/gemini-2.5-flash",
    cacheDir: "credit-karma-cache",
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    },
  });

  try {
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(
      `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`,
    );

    const page = stagehand.context.pages()[0];

    console.log("Navigating to Credit Karma mortgage rates page...");
    await page.goto("https://www.creditkarma.com/home-loans/mortgage-rates", {
      waitUntil: "domcontentloaded",
    });

    await stagehand.act(
      "click on the 'Refinance' tab button in the mortgage rate calculator form (not a navigation link)",
    );
    console.log("Selected Refinance tab");

    await stagehand.act(
      "in the mortgage calculator form, select %creditScore% from the credit score dropdown",
      { variables: { creditScore: USER_CONFIG.creditScore } },
    );
    console.log(`Selected credit score: ${USER_CONFIG.creditScore}`);

    await stagehand.act("in the mortgage calculator form, enter %zipcode% in the ZIP code field", {
      variables: { zipcode: USER_CONFIG.zipcode },
    });
    console.log(`Entered ZIP code: ${USER_CONFIG.zipcode}`);

    await stagehand.act(
      "in the mortgage calculator form, enter %loanBalance% in the current loan balance field",
      { variables: { loanBalance: USER_CONFIG.loanBalance } },
    );
    console.log(`Entered loan balance: $${USER_CONFIG.loanBalance}`);

    await stagehand.act(
      "in the mortgage calculator form, enter %homeValue% in the estimated home value field",
      { variables: { homeValue: USER_CONFIG.homeValue } },
    );
    console.log(`Entered home value: $${USER_CONFIG.homeValue}`);

    await stagehand.act(
      "in the mortgage calculator form, enter %cashOut% in the cash out amount field",
      { variables: { cashOut: USER_CONFIG.cashOut } },
    );
    console.log(`Entered cash-out amount: $${USER_CONFIG.cashOut}`);

    await stagehand.act(
      "click the 'Get my rates' or 'See rates' submit button in the mortgage calculator form",
    );
    console.log("Clicked 'Get my rates' button");

    const mortgageRates = await stagehand.extract(
      "Extract all mortgage rate offers shown on the page.",
      z.object({
        offers: z.array(
          z.object({
            lender: z.string(),
            rate: z.string(),
            apr: z.string(),
            monthlyPayment: z.string(),
            fees: z.string(),
          }),
        ),
      }),
    );

    console.log("\n=== Credit Karma Refinance Query Summary ===");
    console.log(`Credit Score: ${USER_CONFIG.creditScore}`);
    console.log(`ZIP Code: ${USER_CONFIG.zipcode}`);
    console.log(`Loan Balance: $${USER_CONFIG.loanBalance}`);
    console.log(`Home Value: $${USER_CONFIG.homeValue}`);
    console.log(`Cash Out: $${USER_CONFIG.cashOut}`);
    console.log("=============================================\n");

    console.log("=== Mortgage Rate Results ===");
    console.log(mortgageRates.offers?.length ? mortgageRates.offers : "No rates found");
    console.log("\n=============================\n");
  } catch (error) {
    console.error("Error during mortgage rate lookup:", error);
    throw error;
  } finally {
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error in credit karma automation:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Verify GOOGLE_API_KEY is set for the model");
  console.error("  - Credit Karma page structure may have changed");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
