import { readFile } from "node:fs/promises";
import type { runResearchTask } from "./research.js";

type ResearchRunResult = Awaited<ReturnType<typeof runResearchTask>>;

export type ResearchResponse = {
  topic: string;
  durationSec: number;
  report: ResearchRunResult["report"];
  verification: ResearchRunResult["verification"];
  qualityEval?: ResearchRunResult["traces"][number]["qualityEval"];
  sourceDomainCount: number;
  sources: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    sourceType: string;
    wordCount: number;
    reliabilityScore: number;
    score: number;
  }>;
  artifacts: {
    workspace: string;
    markdown: string;
    json: string;
  };
};

export async function runResearchForResponse(topic: string, runIdPrefix: string): Promise<ResearchResponse> {
  const { runResearchTask } = await import("./research.js");
  const startedAt = Date.now();
  const result = await runResearchTask({
    topic,
    runId: `${runIdPrefix}-${Date.now()}`,
  });

  return buildResearchResponse(result, startedAt);
}

export function makeTextFileReader(fileUrl: URL): () => Promise<string> {
  let cachedIndexHtml: string | undefined;

  return async () => {
    cachedIndexHtml ||= await readFile(fileUrl, "utf8");
    return cachedIndexHtml;
  };
}

export async function handleDashboardRequest(
  request: any,
  response: any,
  options: {
    protocol: "http" | "https";
    readIndexHtml: () => Promise<string>;
    readLogoSvg?: () => Promise<string>;
    readStylesCss?: () => Promise<string>;
    handleResearch: (request: any, response: any) => Promise<void>;
  },
): Promise<void> {
  try {
    const url = requestUrl(request, options.protocol);

    if (request.method === "OPTIONS") {
      return sendEmpty(response, 204);
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return sendHtml(response, 200, await options.readIndexHtml());
    }

    if (request.method === "GET" && url.pathname === "/browserbase-logo.svg" && options.readLogoSvg) {
      return sendText(response, 200, await options.readLogoSvg(), "image/svg+xml; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/styles.css" && options.readStylesCss) {
      return sendText(response, 200, await options.readStylesCss(), "text/css; charset=utf-8");
    }

    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
      return sendJson(response, 200, { ok: true });
    }

    if (url.pathname === "/research" || url.pathname === "/api/research") {
      return await options.handleResearch(request, response);
    }

    return sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    return sendJson(response, 500, { error: errorMessage(error) });
  }
}

function requestUrl(request: any, protocol: "http" | "https"): URL {
  const host = request.headers?.host || "localhost";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

export async function readBody(request: AsyncIterable<unknown>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(String(chunk)));
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function sendJson(response: any, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  setCorsHeaders(response);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function sendHtml(response: any, statusCode: number, html: string): void {
  sendText(response, statusCode, html, "text/html; charset=utf-8");
}

function sendText(response: any, statusCode: number, body: string, contentType: string): void {
  response.statusCode = statusCode;
  setCorsHeaders(response);
  response.setHeader("content-type", contentType);
  response.end(body);
}

function sendEmpty(response: any, statusCode: number): void {
  response.statusCode = statusCode;
  setCorsHeaders(response);
  response.end();
}

function setCorsHeaders(response: any): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function buildResearchResponse(result: ResearchRunResult, startedAt: number): ResearchResponse {
  const latestQuality = result.traces[result.traces.length - 1]?.qualityEval;
  const sources = result.evidence.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    domain: source.domain,
    sourceType: source.sourceType,
    wordCount: source.wordCount,
    reliabilityScore: source.reliabilityScore,
    score: Number(source.score.toFixed(3)),
  }));

  return {
    topic: result.topic,
    durationSec: Math.round((Date.now() - startedAt) / 1000),
    report: result.report,
    verification: result.verification,
    qualityEval: latestQuality,
    sourceDomainCount: new Set(sources.map((source) => source.domain)).size,
    sources,
    artifacts: {
      workspace: result.workspace.root,
      markdown: result.paths.markdownPath,
      json: result.paths.jsonPath,
    },
  };
}

export function readTopic(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { topic?: unknown };
      return typeof parsed.topic === "string" ? parsed.topic : "";
    } catch {
      const params = new URLSearchParams(body);
      return params.get("topic") || "";
    }
  }
  if (typeof body === "object" && "topic" in body) {
    const topic = (body as { topic?: unknown }).topic;
    return typeof topic === "string" ? topic : "";
  }
  return "";
}

export function cleanTopic(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
