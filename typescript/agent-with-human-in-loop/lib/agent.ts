// Stagehand + Browserbase: Human-in-the-Loop Agent — core agent logic

import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { Browserbase } from "@browserbasehq/sdk";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { writeFileSync, mkdtempSync, unlinkSync } from "fs";
import { basename, join } from "path";
import { tmpdir } from "os";
import { z } from "zod/v4";
import {
  completeSession,
  createSession,
  errorSession,
  setQuestion,
  setSessionBrowser,
} from "./session-store";

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

function sendEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: string,
  data: Record<string, unknown>,
) {
  const encoder = new TextEncoder();
  return writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export async function runAgent(params: {
  firstName: string;
  lastName: string;
  resumeBase64: string;
  resumeFileName: string;
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}) {
  const { firstName, lastName, resumeBase64, resumeFileName, id, writer } = params;
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });
  let sessionsBefore = new Set<string>();
  let browserbaseSessionId: string | undefined;
  let resumePath: string | undefined;
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined;
  let liveViewLookup: Promise<void> | undefined;

  createSession(id);
  await sendEvent(writer, "session", { id });

  const announceLiveView = () => {
    liveViewLookup ??= (async () => {
      const createdSession = (await bb.sessions.list({ status: "RUNNING" }))
        .filter((session) => !sessionsBefore.has(session.id))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
      if (!createdSession) return;

      browserbaseSessionId = createdSession.id;
      const { debuggerFullscreenUrl } = await bb.sessions.debug(createdSession.id);
      setSessionBrowser(id, debuggerFullscreenUrl, createdSession.id);
      await sendEvent(writer, "session", { id, debuggerUrl: debuggerFullscreenUrl });
    })().finally(() => {
      if (!browserbaseSessionId) liveViewLookup = undefined;
    });
    return liveViewLookup;
  };

  try {
    sessionsBefore = new Set(
      (await bb.sessions.list({ status: "RUNNING" })).map((session) => session.id),
    );
    const tempDirectory = mkdtempSync(join(tmpdir(), "hitl-"));
    resumePath = join(tempDirectory, basename(resumeFileName));
    writeFileSync(resumePath, Buffer.from(resumeBase64, "base64"));

    mcpClient = await createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: "stagehand-codemode",
        env: childEnv,
        stderr: "inherit",
      }),
    });
    const codeModeTools = await mcpClient.tools();
    if (!codeModeTools.code_execute) {
      throw new Error("Stagehand code mode did not expose code_execute");
    }

    const askHuman = tool({
      description:
        "Ask the applicant for information or a decision that is not present in their supplied details. Wait for their response before continuing.",
      inputSchema: z.object({ question: z.string() }),
      execute: async ({ question }) => {
        await sendEvent(writer, "question", { id, question });
        const answer = await new Promise<string>((resolve) => setQuestion(id, question, resolve));
        await sendEvent(writer, "status", { message: "Received your response, continuing..." });
        return { answer };
      },
    });

    const agent = new ToolLoopAgent({
      model: process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
      instructions:
        "You are a job-application browser agent. Use code_execute for all browser work and askHuman whenever required information or a consequential choice is missing. Prefer deterministic Stagehand V4 page and locator methods. Review the application before submission and do not invent applicant details.",
      tools: { ...codeModeTools, askHuman },
      stopWhen: stepCountIs(30),
    });

    await sendEvent(writer, "status", { message: "Starting the browser agent..." });
    const result = await agent.generate({
      prompt: `Open https://bb-template-site.vercel.app/, go to Careers, choose a suitable open role, and complete its application for ${firstName} ${lastName}. The resume is available at ${JSON.stringify(resumePath)}. Ask the applicant for every required value or decision not supplied here. Upload the resume, review the form, then submit it.`,
      onStepFinish: async () => {
        await announceLiveView();
      },
    });
    await announceLiveView();

    completeSession(id);
    await sendEvent(writer, "complete", {
      success: true,
      message: result.text || "Application submitted",
      sessionReplayUrl: browserbaseSessionId
        ? `https://browserbase.com/sessions/${browserbaseSessionId}`
        : "",
    });
  } catch (error) {
    errorSession(id);
    await sendEvent(writer, "error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await mcpClient?.close().catch(() => undefined);
    if (resumePath) {
      try {
        unlinkSync(resumePath);
      } catch {
        // Ignore cleanup errors for an already-removed temporary file.
      }
    }
    await writer.close();
  }
}
