import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright-core";
import { createBrowserPage } from "../browser-page.js";

test("maps the AgentsKit BrowserPage contract to Playwright", async () => {
  const calls: Array<[string, ...unknown[]]> = [];
  const rawPage = {
    goto: async (...args: unknown[]) => void calls.push(["goto", ...args]),
    click: async (...args: unknown[]) => void calls.push(["click", ...args]),
    fill: async (...args: unknown[]) => void calls.push(["fill", ...args]),
    textContent: async (...args: unknown[]) => {
      calls.push(["textContent", ...args]);
      return "Example Domain";
    },
    screenshot: async (...args: unknown[]) => {
      calls.push(["screenshot", ...args]);
      return Buffer.from("png");
    },
    waitForSelector: async (...args: unknown[]) => void calls.push(["waitForSelector", ...args]),
  } as unknown as Page;

  const page = createBrowserPage(rawPage);
  await page.goto("https://example.com");
  await page.click("a");
  await page.fill("input", "AgentsKit");
  assert.equal(await page.textContent("h1"), "Example Domain");
  assert.equal(await page.screenshot(), "cG5n");
  await page.waitForSelector("h1", { timeoutMs: 5000 });

  assert.deepEqual(calls, [
    ["goto", "https://example.com", { waitUntil: "domcontentloaded" }],
    ["click", "a"],
    ["fill", "input", "AgentsKit"],
    ["textContent", "h1"],
    ["screenshot", { type: "png" }],
    ["waitForSelector", "h1", { timeout: 5000 }],
  ]);
});

test("normalizes missing text content to an empty string", async () => {
  const rawPage = {
    textContent: async () => null,
  } as unknown as Page;

  assert.equal(await createBrowserPage(rawPage).textContent("main"), "");
});
