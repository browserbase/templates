// Browserbase Fetch API: Philadelphia Council Events

import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";
import { z } from "zod/v4";

const CALENDAR_URL = "https://phila.legistar.com/Calendar.aspx";
const CURRENT_YEAR = new Date().getUTCFullYear();

const CouncilEventsSchema = z.object({
  events: z
    .array(
      z.object({
        name: z.string().describe("The event or meeting name"),
        date: z.string().describe("The displayed event date"),
        time: z.string().describe("The displayed event time"),
      }),
    )
    .describe(`Every ${CURRENT_YEAR} event displayed in the council calendar table`),
});

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  const calendarUrl = new URL(CALENDAR_URL);
  calendarUrl.searchParams.set("Mode", String(CURRENT_YEAR));

  console.log(`Fetching the ${CURRENT_YEAR} Philadelphia Council calendar...`);
  const bb = new Browserbase({ apiKey });
  const schema = z.toJSONSchema(CouncilEventsSchema) as Record<string, unknown>;
  delete schema.$schema;
  const response = await bb.fetchAPI.create({
    url: calendarUrl.toString(),
    format: "json",
    schema,
    allowRedirects: true,
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Council calendar returned HTTP ${response.statusCode}`);
  }

  const result = CouncilEventsSchema.parse(response.content);
  console.log(`Found ${result.events.length} events for ${CURRENT_YEAR}.`);
  console.log(
    JSON.stringify({ year: CURRENT_YEAR, sourceUrl: calendarUrl.toString(), ...result }, null, 2),
  );
}

main().catch((error) => {
  console.error("Council event extraction failed:", error);
  process.exit(1);
});
