import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Stagehand, tool } from "@browserbasehq/stagehand";
import { z } from "zod";

type StagehandEnv = "LOCAL" | "BROWSERBASE";

type VerificationField = {
  label: string;
  expectedValue: string;
};

type PaymentPayload = {
  websiteName: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  invoiceNumber: string;
  paymentAmountUsd: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
  additionalInstructions: string;
};

type RunningTestSite = {
  url: string;
  close: () => Promise<void>;
};

type ModelOption = string | { modelName: string; apiKey: string };

const TEST_SITE_DIR = fileURLToPath(new URL("./test-site", import.meta.url));
const DEFAULT_TEST_SITE_PORT = Number(process.env.TEST_SITE_PORT ?? "4173");

const SAMPLE_PAYMENT: PaymentPayload = {
  websiteName: "Synthetic Checkout Sandbox",
  firstName: "Jordan",
  lastName: "Lee",
  company: "Northwind Labs",
  email: "jordan.lee.demo@example.com",
  phone: "4155550198",
  addressLine1: "145 Harbor Street",
  city: "San Francisco",
  state: "CA",
  zipCode: "94104",
  invoiceNumber: "INV-DEMO-2026-0142",
  paymentAmountUsd: "125.62",
  cardNumber: "4242 4242 4242 4242",
  expiryMonth: "01",
  expiryYear: "2030",
  cvv: "123",
  cardHolderName: "Jordan Lee",
  additionalInstructions:
    "Use only this synthetic sandbox page and do not navigate to external websites.",
};

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

const outputSchema = z.object({
  success: z.boolean().describe("Whether the payment was submitted successfully."),
  confirmation_id: z.string().describe("Confirmation or reference ID shown after submission."),
  charged_amount: z.string().describe("Submitted amount shown on the confirmation panel."),
  error_reasoning: z.string().describe("If unsuccessful, explain why. Empty string if successful."),
});

function resolveModelOption(modelName: string): ModelOption {
  const normalized = modelName.toLowerCase();

  if (normalized.startsWith("google/")) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
    return apiKey ? { modelName, apiKey } : modelName;
  }

  if (normalized.startsWith("openai/")) {
    return process.env.OPENAI_API_KEY
      ? { modelName, apiKey: process.env.OPENAI_API_KEY }
      : modelName;
  }

  if (normalized.startsWith("anthropic/")) {
    return process.env.ANTHROPIC_API_KEY
      ? { modelName, apiKey: process.env.ANTHROPIC_API_KEY }
      : modelName;
  }

  return modelName;
}

function normalizeEnv(value: string | undefined): StagehandEnv {
  return value?.toUpperCase().trim() === "BROWSERBASE" ? "BROWSERBASE" : "LOCAL";
}

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valuesMatch(expectedValue: string, currentValue: string): boolean {
  const expected = normalizeValue(expectedValue);
  const current = normalizeValue(currentValue);

  if (!expected || !current) {
    return false;
  }

  if (expected === current) {
    return true;
  }

  return expected.includes(current) || current.includes(expected);
}

function buildFieldExpectations(payload: PaymentPayload): VerificationField[] {
  return [
    { label: "First name", expectedValue: payload.firstName },
    { label: "Last name", expectedValue: payload.lastName },
    { label: "Company", expectedValue: payload.company },
    { label: "Email", expectedValue: payload.email },
    { label: "Phone", expectedValue: payload.phone },
    { label: "Address line 1", expectedValue: payload.addressLine1 },
    { label: "City", expectedValue: payload.city },
    { label: "State", expectedValue: payload.state },
    { label: "ZIP code", expectedValue: payload.zipCode },
    { label: "Invoice number", expectedValue: payload.invoiceNumber },
    { label: "Payment amount (USD)", expectedValue: payload.paymentAmountUsd },
    { label: "Card number", expectedValue: payload.cardNumber },
    { label: "Expiry month", expectedValue: payload.expiryMonth },
    { label: "Expiry year", expectedValue: payload.expiryYear },
    { label: "CVV", expectedValue: payload.cvv },
    { label: "Cardholder name", expectedValue: payload.cardHolderName },
  ];
}

function formatFieldExpectations(fields: VerificationField[]): string {
  return fields.map((field) => `- ${field.label}: ${field.expectedValue}`).join("\n");
}

async function handleStaticRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(TEST_SITE_DIR, relativePath);

  if (!filePath.startsWith(`${TEST_SITE_DIR}/`) && filePath !== TEST_SITE_DIR) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const fileContent = await readFile(filePath);
    const contentType = MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(fileContent);
  } catch (_error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

async function startLocalTestSite(port: number): Promise<RunningTestSite> {
  const server = createServer((request, response) => {
    void handleStaticRequest(request, response);
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(port, "127.0.0.1", () => resolvePromise());
  });

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
      }),
  };
}

async function main(): Promise<void> {
  const stagehandEnv = normalizeEnv(process.env.STAGEHAND_ENV);
  const stagehandModelName = process.env.STAGEHAND_MODEL ?? "google/gemini-2.5-flash";
  const agentModelName = process.env.AGENT_MODEL ?? stagehandModelName;
  let localTestSite: RunningTestSite | null = null;
  let stagehand: Stagehand | null = null;

  try {
    let targetUrl = process.env.TARGET_FORM_URL?.trim();

    if (!targetUrl) {
      localTestSite = await startLocalTestSite(DEFAULT_TEST_SITE_PORT);
      targetUrl = `${localTestSite.url}/index.html`;
      console.log(`Local sandbox test site running at ${targetUrl}`);
    }

    if (
      stagehandEnv === "BROWSERBASE" &&
      /https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(targetUrl)
    ) {
      throw new Error(
        "BROWSERBASE sessions cannot access localhost. Set TARGET_FORM_URL to a public deployment of ./test-site.",
      );
    }

    stagehand = new Stagehand({
      env: stagehandEnv,
      model: resolveModelOption(stagehandModelName),
      experimental: true,
      verbose: 1,
      cacheDir: "./cache",
      browserbaseSessionCreateParams:
        stagehandEnv === "BROWSERBASE"
          ? {
              projectId: process.env.BROWSERBASE_PROJECT_ID,
              browserSettings: {
                solveCaptchas: true,
              },
            }
          : undefined,
    });

    await stagehand.init();
    const activeStagehand = stagehand;

    if (stagehandEnv === "BROWSERBASE" && stagehand.browserbaseSessionId) {
      console.log(
        `Live session: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`,
      );
    }

    const page = stagehand.context.pages()[0];
    const fieldExpectations = buildFieldExpectations(SAMPLE_PAYMENT);

    let captchaSolving = false;
    let captchaResolve: (() => void) | null = null;

    page.on("console", (message) => {
      const text = message.text().trim();

      if (text === "browserbase-solving-started") {
        captchaSolving = true;
        console.log("Captcha solving started.");
      } else if (text === "browserbase-solving-finished") {
        captchaSolving = false;
        console.log("Captcha solving finished.");
        captchaResolve?.();
        captchaResolve = null;
      }
    });

    async function waitForCaptcha(): Promise<void> {
      if (!captchaSolving) {
        return;
      }

      await new Promise<void>((resolvePromise) => {
        captchaResolve = resolvePromise;
      });
    }

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: 60000,
    });

    const agent = stagehand.agent({
      model: resolveModelOption(agentModelName),
      mode: "dom",
      systemPrompt: `You are a checkout automation agent for synthetic sandbox forms.
- Use only values from the provided payload.
- Fill only visible and enabled fields.
- Never solve CAPTCHAs manually.
- Always call verifyFields after filling all fields and before submitting.
- If verifyFields reports issues, fix only the flagged fields and run verifyFields again.
- After submission, extract the confirmation ID and charged amount from the success panel.`,
      tools: {
        verifyFields: tool({
          description:
            "Checks that filled form fields match expected values. Returns ok=false with a list of issues if fields are empty or mismatched.",
          inputSchema: z.object({
            fields: z.array(
              z.object({
                label: z.string(),
                expectedValue: z.string(),
              }),
            ),
          }),
          execute: async ({ fields }: { fields: VerificationField[] }) => {
            if (fields.length === 0) {
              return {
                ok: false,
                issues: [{ label: "unknown", issue: "No fields were provided to verifyFields." }],
              };
            }

            const labels = fields.map((field) => field.label).join(", ");
            const extractedFields = await activeStagehand.extract(
              `Read the currently visible values for these fields: ${labels}. Return label/currentValue pairs.`,
              z.array(
                z.object({
                  label: z.string(),
                  currentValue: z.string(),
                }),
              ),
            );

            const comparisons = fields.map((expectedField) => {
              const matchCandidate = extractedFields.find((item) => {
                const extractedLabel = normalizeValue(item.label);
                const expectedLabel = normalizeValue(expectedField.label);
                return (
                  extractedLabel.includes(expectedLabel) || expectedLabel.includes(extractedLabel)
                );
              });

              const currentValue = matchCandidate?.currentValue ?? "";

              return {
                label: expectedField.label,
                expectedValue: expectedField.expectedValue,
                currentValue,
                match: valuesMatch(expectedField.expectedValue, currentValue),
              };
            });

            const issues = comparisons
              .filter((result) => !result.match)
              .map((result) => ({
                label: result.label,
                issue: result.currentValue
                  ? `Expected "${result.expectedValue}" but found "${result.currentValue}".`
                  : "Field is empty.",
              }));

            if (issues.length === 0) {
              return {
                ok: true,
                checked: comparisons.length,
                message: "All fields matched expected values.",
              };
            }

            return {
              ok: false,
              checked: comparisons.length,
              issues,
            };
          },
        }),
      },
    });

    const result = await agent.execute({
      instruction: `## Context
Website: ${SAMPLE_PAYMENT.websiteName}
Current page: ${targetUrl}

## Payment payload
${formatFieldExpectations(fieldExpectations)}

## Task
1. Dismiss cookie banners if present.
2. Fill every visible and enabled form field using the payload above.
3. Call verifyFields with every field/value pair you entered. If verifyFields returns ok=false, fix those fields and call verifyFields again.
4. Submit the form using the "Submit payment" button.
5. Extract the confirmation ID, charged amount, and status from the confirmation panel.

## Site-specific guidance
${SAMPLE_PAYMENT.additionalInstructions}`,
      maxSteps: 80,
      output: outputSchema,
      callbacks: {
        prepareStep: async (stepContext) => {
          await waitForCaptcha();
          return stepContext;
        },
      },
    });

    console.log("Agent result:");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (stagehand) {
      await stagehand.close();
    }

    if (localTestSite) {
      await localTestSite.close();
      console.log("Local sandbox test site stopped.");
    }
  }
}

main().catch((error) => {
  console.error("Template run failed:", error);
  process.exit(1);
});
