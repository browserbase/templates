// Browserbase Fetch API: Value Prop One-Liner Generator

import Browserbase from "@browserbasehq/sdk";
import "dotenv/config";
import { z } from "zod/v4";

const TARGET_URL = process.env.TARGET_URL ?? "https://www.browserbase.com";

const ValuePropSchema = z.object({
  valueProposition: z
    .string()
    .min(1)
    .describe("The company's central value proposition stated on the landing page"),
  personalizedOpener: z
    .string()
    .min(1)
    .describe(
      'A unique English phrase grounded in the value proposition, no more than 9 words, beginning with "Your"',
    ),
});

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  console.log(`Extracting a value proposition from ${TARGET_URL} with Fetch API...`);
  const bb = new Browserbase({ apiKey });
  const schema = z.toJSONSchema(ValuePropSchema) as Record<string, unknown>;
  delete schema.$schema;
  const response = await bb.fetchAPI.create({
    url: TARGET_URL,
    format: "json",
    schema,
    allowRedirects: true,
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Target returned HTTP ${response.statusCode}`);
  }

  const result = ValuePropSchema.parse(response.content);
  console.log(JSON.stringify({ targetUrl: TARGET_URL, ...result }, null, 2));
}

main().catch((error) => {
  console.error("Value proposition extraction failed:", error);
  process.exit(1);
});
