import type { BrowserPage } from "@agentskit/tools/integrations";
import type { Page } from "playwright-core";

export function createBrowserPage(page: Page): BrowserPage {
  return {
    goto: async (url) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    },
    click: async (selector) => {
      await page.click(selector);
    },
    fill: async (selector, value) => {
      await page.fill(selector, value);
    },
    textContent: async (selector) => (await page.textContent(selector)) ?? "",
    screenshot: async () => (await page.screenshot({ type: "png" })).toString("base64"),
    waitForSelector: async (selector, options) => {
      await page.waitForSelector(selector, { timeout: options?.timeoutMs });
    },
  };
}
