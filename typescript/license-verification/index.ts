// Real Estate License Verification - See README.md for full documentation

import "dotenv/config";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v4";

// License verification variables
const variables = {
  input1: "02237476", // DRE License ID to search for
};

async function main() {
  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });
  const stagehand = await Stagehand.create({
    browser: browser,
    model: { modelName: "openai/gpt-4.1" },
    logging: { level: "info" },
  });

  try {
    console.log(`Stagehand Session Started`);

    const page = (await browser.context.pages())[0];

    console.log("Navigating to: https://www2.dre.ca.gov/publicasp/pplinfo.asp");
    await page.goto("https://www2.dre.ca.gov/publicasp/pplinfo.asp");

    console.log(`Performing action: type ${variables.input1} into the License ID input field`);
    await stagehand.act(`type ${variables.input1} into the License ID input field`);

    console.log(`Performing action: click the Find button`);
    await stagehand.act(`click the Find button`);

    console.log(`Extracting: extract all the license verification details for DRE#02237476`);
    const { data: license } = await stagehand.extract(
      `extract all the license verification details for DRE#${variables.input1}`,
      z.object({
        licenseType: z.string().nullable(),
        name: z.string().nullable(),
        mailingAddress: z.string().nullable(),
        licenseId: z.string().nullable(),
        expirationDate: z.string().nullable(),
        licenseStatus: z.string().nullable(),
        salespersonLicenseIssued: z.string().nullable(),
        formerNames: z.string().nullable(),
        responsibleBroker: z.string().nullable(),
        brokerLicenseId: z.string().nullable(),
        brokerAddress: z.string().nullable(),
        disciplinaryAction: z.string().nullable(),
        otherComments: z.string().nullable(),
      }),
    );

    console.log("License details:", license);
  } finally {
    try {
      await stagehand.close();
    } catch (error) {
      console.warn("Stagehand cleanup warning:", error);
    }
    try {
      await browser.close();
    } catch (error) {
      console.warn("Browser cleanup warning:", error);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
