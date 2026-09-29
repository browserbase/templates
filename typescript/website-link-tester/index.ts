// Browserbase Fetch API: Website Link Tester - See README.md for full documentation

import Browserbase from "@browserbasehq/sdk";
import { load } from "cheerio";
import "dotenv/config";

const TARGET_URL = process.env.TARGET_URL ?? "https://www.browserbase.com";
const MAX_LINKS = positiveInteger("MAX_LINKS", 25);
const MAX_CONCURRENT_LINKS = positiveInteger("MAX_CONCURRENT_LINKS", 5);
const FETCH_ATTEMPTS = positiveInteger("FETCH_ATTEMPTS", 2);

type Link = {
  url: string;
  linkText: string;
};

type LinkCheckResult = Link & {
  success: boolean;
  statusCode?: number;
  contentType?: string;
  pageTitle?: string;
  attempts: number;
  error?: string;
};

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function responseBody(content: string | Record<string, unknown>): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

function pageTitle(html: string): string | undefined {
  const title = load(html)("title").first().text().replace(/\s+/g, " ").trim();
  return title || undefined;
}

function extractLinks(html: string, baseUrl: string): Link[] {
  const $ = load(html);
  const links = new Map<string, Link>();

  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      url.hash = "";

      const normalizedUrl = url.toString();
      if (links.has(normalizedUrl)) return;

      const linkText =
        $(element).text().replace(/\s+/g, " ").trim() ||
        $(element).attr("aria-label")?.trim() ||
        normalizedUrl;
      links.set(normalizedUrl, { url: normalizedUrl, linkText });
    } catch {
      // Ignore malformed href values and continue checking valid HTTP(S) links.
    }
  });

  return [...links.values()];
}

async function checkLink(bb: Browserbase, link: Link): Promise<LinkCheckResult> {
  let lastError = "Fetch failed";

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await bb.fetchAPI.create({
        url: link.url,
        format: "raw",
        allowRedirects: true,
      });
      if (response.statusCode >= 500 && attempt < FETCH_ATTEMPTS) continue;

      const body = responseBody(response.content);
      const success = response.statusCode >= 200 && response.statusCode < 400;
      return {
        ...link,
        success,
        statusCode: response.statusCode,
        contentType: response.contentType,
        pageTitle: response.contentType.includes("text/html") ? pageTitle(body) : undefined,
        attempts: attempt,
        error: success ? undefined : `HTTP ${response.statusCode}`,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { ...link, success: false, attempts: FETCH_ATTEMPTS, error: lastError };
}

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  const bb = new Browserbase({ apiKey });
  console.log(`Fetching ${TARGET_URL} to discover links...`);
  const homepage = await bb.fetchAPI.create({
    url: TARGET_URL,
    format: "raw",
    allowRedirects: true,
  });
  if (homepage.statusCode < 200 || homepage.statusCode >= 400) {
    throw new Error(`Homepage returned HTTP ${homepage.statusCode}`);
  }
  if (!homepage.contentType.includes("text/html")) {
    throw new Error(`Expected HTML, received ${homepage.contentType}`);
  }

  const discovered = extractLinks(responseBody(homepage.content), TARGET_URL);
  const links = discovered.slice(0, MAX_LINKS);
  console.log(`Found ${discovered.length} unique HTTP(S) links; checking ${links.length}.`);

  const results: LinkCheckResult[] = [];
  for (let index = 0; index < links.length; index += MAX_CONCURRENT_LINKS) {
    const batch = links.slice(index, index + MAX_CONCURRENT_LINKS);
    const checked = await Promise.all(batch.map((link) => checkLink(bb, link)));
    results.push(...checked);
    for (const result of checked) {
      console.log(
        `${result.success ? "PASS" : "FAIL"} ${result.statusCode ?? "ERR"} ${result.url}`,
      );
    }
  }

  const summary = {
    targetUrl: TARGET_URL,
    discoveredLinks: discovered.length,
    checkedLinks: results.length,
    successful: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Website link test failed:", error);
  process.exit(1);
});
