// Stagehand + Browserbase: Image URL Download - See README.md for full documentation
//
// Uses Stagehand extract() to find all image URLs on a page, then downloads each
// image through the browser's proxied fetch() — inheriting session cookies, headers,
// and the Browserbase proxy. Works for any image format (JPG, PNG, WebP, etc.).

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import fs from "fs";
import path from "path";

// ============= CONFIGURATION =============

// Maximum number of images to download per run.
// Increase this if you need more images, or set MAX_IMAGES in your .env.
const MAX_IMAGES = parseInt(process.env.MAX_IMAGES ?? "10", 10) || 10;

// Directory (relative to where the script is run) where images are saved.
const OUTPUT_DIR = "./images";

// =========================================

// Maps MIME types to file extensions for the most common image formats.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

/**
 * Derive a safe filename from an image URL and its detected MIME type.
 * Takes the last path segment for the base name, uses the MIME type for the
 * extension (more reliable than trusting the URL), and appends a timestamp
 * so repeated runs never overwrite earlier downloads.
 */
function imageFilename(url: string, mimeType: string, index: number): string {
  const ext = MIME_TO_EXT[mimeType] ?? "bin";
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    // Strip any existing extension — we'll use the one from the actual MIME type.
    const base = segment.replace(/\.[^.]+$/, "") || `image-${index}`;
    // Sanitize to filesystem-safe characters.
    const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    return `${safe}-${Date.now()}.${ext}`;
  } catch {
    return `image-${index}-${Date.now()}.${ext}`;
  }
}

async function main(): Promise<void> {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error("Usage: npm start <url>");
    console.error("Example: npm start https://www.browserbase.com");
    process.exit(1);
  }

  console.log(`Image URL Download — target: ${targetUrl}`);
  console.log(`Max images: ${MAX_IMAGES} | Output: ${OUTPUT_DIR}/<hostname>/\n`);

  // Initialize Stagehand with Browserbase for cloud-based browser automation.
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-2.5-flash",
    verbose: 1,
  });

  try {
    // Initialize browser session to start automation.
    await stagehand.init();
    console.log("Stagehand initialized successfully!");
    console.log(
      `Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
    );

    const page = stagehand.context.pages()[0];

    // Navigate and wait for network activity to settle so JS-injected images are in the DOM.
    console.log(`\nNavigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: "networkidle", // Wait for network to settle so JS-injected images are in the DOM.
      timeoutMs: 60000, // Extended timeout for reliable page loading.
    });

    // Use extract() with a URL schema so Stagehand knows to look for image URLs.
    console.log("Extracting image URLs from page...");
    const { urls: allUrls } = await stagehand.extract(
      "extract all image URLs on this page, including src attributes from <img> tags and any background image URLs",
      z.object({ urls: z.array(z.string().url()) }),
    );

    // Deduplicate and filter out any empty/malformed URLs before applying the limit.
    const uniqueUrls = [...new Set(allUrls)].filter((u) => {
      try { const { protocol } = new URL(u); return protocol === "https:" || protocol === "http:"; }
      catch { return false; }
    });
    console.log(`Found ${uniqueUrls.length} unique image URL(s)`);

    const urls = uniqueUrls.slice(0, MAX_IMAGES);
    if (uniqueUrls.length > MAX_IMAGES) {
      console.log(`Capping at ${MAX_IMAGES} (adjust MAX_IMAGES to change this)`);
    }

    if (urls.length === 0) {
      console.log("No image URLs found on the page.");
      return;
    }

    // Create a subdirectory scoped to the target site's hostname (e.g. images/browserbase.com/).
    const hostname = new URL(targetUrl).hostname;
    const outputDir = path.join(OUTPUT_DIR, hostname);
    fs.mkdirSync(outputDir, { recursive: true });

    let saved = 0;
    let failed = 0;

    console.log(`\nDownloading ${urls.length} image(s) via browser fetch...\n`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      process.stdout.write(`[${i + 1}/${urls.length}] ${url} → `);

      // Fetch the image through the browser's proxied connection.
      // Running fetch() inside page.evaluate() means it inherits the Browserbase
      // proxy and all active session cookies — no CORS or auth issues.
      // FileReader.readAsDataURL() is the most reliable browser-native way to
      // encode binary data as base64, and it also gives us the real MIME type.
      // Wrap the entire page.evaluate() call — not just the code inside it — so that
      // CDP-level errors (execution context destroyed, timeout, page navigation) are
      // caught per-image and don't abort the rest of the download loop.
      let result: { base64: string; mimeType: string } | null = null;
      try {
        result = await page.evaluate(async (imgUrl: string) => {
          try {
            const res = await fetch(imgUrl);
            if (!res.ok) return null;
            const blob = await res.blob();
            return await new Promise<{ base64: string; mimeType: string } | null>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                const comma = dataUrl.indexOf(",");
                if (comma === -1) { resolve(null); return; }
                const prefix = dataUrl.slice(0, comma); // e.g. "data:image/png;base64"
                const base64 = dataUrl.slice(comma + 1);
                const mimeMatch = prefix.match(/data:([^;]+)/);
                resolve({ base64, mimeType: mimeMatch?.[1] ?? "application/octet-stream" });
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch {
            return null;
          }
        }, url);
      } catch (err) {
        console.log(`FAILED (${err instanceof Error ? err.message : err}, skipping)`);
        failed++;
        continue;
      }

      if (!result) {
        console.log("FAILED (skipping)");
        failed++;
        continue;
      }

      const filename = imageFilename(url, result.mimeType, i);
      const filepath = path.join(outputDir, filename);
      const buffer = Buffer.from(result.base64, "base64");
      try {
        fs.writeFileSync(filepath, buffer);
      } catch (err) {
        console.log(`FAILED (write error: ${err instanceof Error ? err.message : err}, skipping)`);
        failed++;
        continue;
      }
      console.log(`saved as ${filename} (${buffer.length} bytes)`);
      saved++;
    }

    console.log(`\nDone! ${saved} saved, ${failed} failed → ${outputDir}/`);
  } catch (error) {
    console.error("Error during image download:", error);
    throw error;
  } finally {
    // Always close session to release resources and clean up.
    await stagehand.close();
    console.log("Session closed successfully");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  console.error("Common issues:");
  console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
  console.error("  - Ensure GOOGLE_API_KEY is set for the gemini-2.5-flash model");
  console.error("  - Verify the target URL is accessible");
  console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
  process.exit(1);
});
