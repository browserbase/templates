// Stagehand + Browserbase: Human-in-the-Loop Agent — core agent logic
// This module runs a Stagehand agent that fills out a job application,
// pausing to ask the human whenever it encounters fields it can't fill alone.
// Communication with the frontend happens via Server-Sent Events (SSE).

import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand, tool } from "@browserbasehq/stagehand";
import { z } from "zod";
import { createSession, setQuestion, completeSession, errorSession } from "./session-store";
import { writeFileSync, mkdtempSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";

// SSE event helper — writes a Server-Sent Event to the stream
function sendEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: string,
  data: Record<string, unknown>
) {
  const encoder = new TextEncoder();
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return writer.write(encoder.encode(msg));
}

export async function runAgent(params: {
  firstName: string;
  lastName: string;
  resumeBase64: string;
  resumeFileName: string;
  id: string; // internal correlation ID
  writer: WritableStreamDefaultWriter<Uint8Array>;
}) {
  const { firstName, lastName, resumeBase64, resumeFileName, id, writer } = params;
  let resumePath: string | undefined;

  try {
    // --- Browserbase session setup ---
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        viewport: { width: 1288, height: 711 },
      },
    });

    const debugLinks = await bb.sessions.debug(session.id);
    const debuggerUrl = debugLinks.debuggerFullscreenUrl;

    // Register in session store
    createSession(id, debuggerUrl, session.id);

    // Send the session info to the frontend immediately
    await sendEvent(writer, "session", {
      id,
      debuggerUrl,
      browserbaseSessionId: session.id,
    });

    // --- Stagehand setup ---
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      model: "anthropic/claude-sonnet-4-5-20250929",
      verbose: 1,
      browserbaseSessionID: session.id,
      disablePino: true,
      experimental: true,
    });

    await stagehand.init();
    const page = stagehand.context.pages()[0];
    await page.goto("https://bb-template-site.vercel.app/");

    // Save resume to a temp file so Playwright can upload it
    const tmpDir = mkdtempSync(join(tmpdir(), "hitl-"));
    resumePath = join(tmpDir, basename(resumeFileName));
    writeFileSync(resumePath, Buffer.from(resumeBase64, "base64"));

    await sendEvent(writer, "status", { message: "Navigating to job listing..." });

    // --- Agent with custom askHuman tool ---
    const agent = stagehand.agent({
      mode: "hybrid",
      model: "anthropic/claude-sonnet-4-5-20250929",
      systemPrompt: `You are an assistant helping a user apply to a job by filling out an application form.

You already know the applicant's name:
- First Name: ${firstName}
- Last Name: ${lastName}

You should try to fill out the form autonomously using the information you have.
However, you may NOT have all the information needed.

When you encounter anything you're unsure about — whether that's choosing
which job position the person wants to apply to, form fields that require personal
information you don't have, or any other decision that depends on the human's
preference — use the askHuman tool. You can batch multiple fields into a single
question to be efficient. Do NOT make up or guess any personal information, and do NOT make choices on the
human's behalf. Always ask when unsure.

File upload fields CANNOT be handled with act or fillForm — they will fail. If you
encounter a resume upload field, use the uploadResume tool to attach the file instead
of trying to click or interact with the file input directly.`,
      tools: {
        askHuman: tool({
          description:
            "Ask the human operator for information needed to continue the task. " +
            "Use this when you encounter form fields requiring personal info you don't have. " +
            "Be specific about what information you need.",
          inputSchema: z.object({
            question: z.string().describe(
              "The question to ask the human. Be specific about what info is needed."
            ),
          }),
          execute: async ({ question }) => {
            // Send question to the frontend via SSE
            await sendEvent(writer, "question", { id, question });

            // Block until the human responds via POST /api/agent/respond
            // This Promise is resolved by resolveQuestion() in the session store
            const response = await new Promise<string>((resolve) => {
              setQuestion(id, question, resolve);
            });

            await sendEvent(writer, "status", {
              message: "Received your response, continuing...",
            });

            return {
              response,
              message: "Human provided the requested information.",
            };
          },
        }),
        uploadResume: tool({
          description:
            "Upload the user's resume to the resume file input on the page. " +
            "Use this when you encounter a resume upload field.",
          inputSchema: z.object({}),
          execute: async () => {
            // File inputs are hidden in the DOM, so observe() can't find them
            // (it works from the accessibility tree). Use page.locator() directly
            // which works on hidden elements via CDP.
            const fileInput = page.locator('input[type="file"]').first();
            await fileInput.setInputFiles(resumePath);

            await sendEvent(writer, "status", {
              message: `Uploaded resume: ${resumeFileName}`,
            });

            return {
              message: `Successfully uploaded ${resumeFileName}`,
            };
          },
        }),
      },
    });

    // --- Execute ---
    const result = await agent.execute({
      instruction:
        "Apply to a job on this site by navigating to the careers page, choosing a position, " +
        "and filling out the application form. Fill in all text fields, upload the resume, " +
        "and submit the application.",
      maxSteps: 30,
      callbacks: {
        onStepFinish: async (event) => {
          if (event.toolCalls) {
            for (const tc of event.toolCalls) {
              if (tc.toolName === "askHuman") {
                await sendEvent(writer, "status", {
                  message: "Waiting for your input...",
                });
              } else {
                await sendEvent(writer, "status", {
                  message: `Agent used tool: ${tc.toolName}`,
                });
              }
            }
          }
        },
      },
    });

    completeSession(id);
    await sendEvent(writer, "complete", {
      success: result.success,
      message: result.message,
      sessionReplayUrl: `https://browserbase.com/sessions/${session.id}`,
    });

    // Keep the session open briefly so the user can see the final state
    await new Promise((resolve) => setTimeout(resolve, 10000));

    await stagehand.close();
  } catch (err) {
    errorSession(id);
    await sendEvent(writer, "error", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    // Clean up temp resume file (in finally so it's removed even on error)
    if (resumePath) try { unlinkSync(resumePath); } catch { /* ignore */ }
    await writer.close();
  }
}
