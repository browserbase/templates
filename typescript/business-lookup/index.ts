// Business Lookup with Stagehand - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

const businessName = "Jalebi Street";

async function main() {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];
    await page.goto("https://data.sf.gov/stories/s/Registered-Business-Lookup/k6sk-2y6w/");

    async function waitFor(
      check: () => Promise<boolean | number>,
      description: string,
    ): Promise<void> {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Timed out waiting for ${description}`);
    }

    // Click the checkbox itself: clicking its adjacent text does not select it.
    const filter = '[role="button"][aria-label="Filter: DBA Name - Select..."]';
    await waitFor(() => page.locator(filter).count(), "the DBA Name filter");
    await page.locator(filter).click();
    await waitFor(
      () => page.locator("#search-text-filter-input").count(),
      "the business-name search input",
    );
    await page.locator("#search-text-filter-input").fill(businessName);
    const checkbox = `forge-checkbox[aria-label=${JSON.stringify(businessName)}]`;
    await waitFor(() => page.locator(checkbox).count(), `the ${businessName} option`);
    await page.locator(checkbox).click();
    await waitFor(() => page.locator(checkbox).isChecked(), "the selected business checkbox");
    await page.locator('[data-testid="apply-filter-button"]').click();

    // Wait for the results grid to replace the unfiltered first page.
    await waitFor(
      () =>
        page.evaluate((name: string) => {
          const cells = [...document.querySelectorAll('[role="gridcell"][col-id="dba_name"]')];
          return cells.length > 0 && cells.every((cell) => cell.textContent!.trim() === name);
        }, businessName),
      `results matching ${businessName}`,
    );
    if ((await page.locator('[role="gridcell"][col-id="dba_name"]').count()) !== 1) {
      throw new Error(
        `Multiple locations found for ${businessName}; narrow the registry filters before extracting one record.`,
      );
    }
    // Read the labeled grid cells directly; missing cells must fail rather
    // than being confused with an empty value published by the registry.
    async function readCell(column: string): Promise<string | null> {
      const text = await page.locator(`[role="gridcell"][col-id="${column}"]`).innerText();
      return text.trim() || null;
    }
    const businessInfo = {
      dbaName: await readCell("dba_name"),
      ownershipName: await readCell("ownership_name"),
      businessAccountNumber: await readCell("certificate_number"),
      locationId: await readCell("ttxid"),
      streetAddress: await readCell("full_business_address"),
    };
    if (
      businessInfo.dbaName !== businessName ||
      !businessInfo.businessAccountNumber ||
      !businessInfo.locationId
    ) {
      throw new Error("The filtered registry row is missing the requested business identity.");
    }

    // The registry virtualizes its columns; scroll to render the remaining fields.
    await page.evaluate(() => {
      const scrollbar = document.querySelector<HTMLElement>(".ag-body-horizontal-scroll-viewport")!;
      scrollbar.scrollLeft = scrollbar.scrollWidth;
    });
    await waitFor(
      () => page.locator('[role="gridcell"][col-id="self_reported_naics_code"]').count(),
      "the Self-Reported NAICS Code column",
    );
    // Preserve blank published values instead of inferring from nearby cells.
    const details = {
      businessStartDate: await readCell("dba_start_date"),
      businessEndDate: await readCell("dba_end_date"),
      neighborhood: await readCell("neighborhoods_analysis_boundaries"),
      licenseCodeDescription: await readCell("lic_code_description"),
      naicsCode: await readCell("self_reported_naics_code"),
    };
    console.log("Business Information:");
    console.log(JSON.stringify({ ...businessInfo, ...details }, null, 2));
    if (!details.naicsCode)
      console.log("The registry does not list a Self-Reported NAICS Code for this business.");
  } catch (error) {
    const errorMessage =
      error !== null &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : String(error);
    console.error("Error during business lookup:", errorMessage);
    throw error;
  } finally {
    await stagehand.close();
  }
}

await main();
