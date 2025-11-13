// Stagehand + Browserbase: Download Apple's Quarterly Financial Statements - See README.md for full documentation

import { Browserbase } from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import 'dotenv/config';
import fs from 'fs';

/**
 * Polls Browserbase API for downloads with timeout handling.
 * Retries every 2 seconds until downloads are ready or timeout is reached.
 */
async function saveDownloadsWithRetry(
    bb: Browserbase,
    sessionId: string,
    retryForSeconds: number = 30
): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        console.log(`Waiting up to ${retryForSeconds} seconds for downloads to complete...`);
        let poller: NodeJS.Timeout;
        
        // Set timeout to prevent infinite polling if downloads never complete
        const timeout: NodeJS.Timeout = setTimeout(() => {
            if (poller) {
                clearInterval(poller);
                reject(new Error("Download timeout exceeded"));
            }
        }, retryForSeconds * 1000);

        async function fetchDownloads(): Promise<void> {
            try {
                console.log("Checking for downloads...");
                const response = await bb.sessions.downloads.list(sessionId);
                const downloadBuffer: ArrayBuffer = await response.arrayBuffer();

                if (downloadBuffer.byteLength > 0) {
                    console.log(`Downloads ready! File size: ${downloadBuffer.byteLength} bytes`);
                    fs.writeFileSync('downloaded_files.zip', Buffer.from(downloadBuffer));
                    console.log("Files saved as: downloaded_files.zip");

                    clearInterval(poller);
                    clearTimeout(timeout);
                    resolve(downloadBuffer.byteLength);
                } else {
                    console.log("Downloads not ready yet, retrying...");
                }
            } catch (e: unknown) {
                console.error('Error fetching downloads:', e);
                clearInterval(poller);
                clearTimeout(timeout);
                reject(e);
            }
        }

        // Poll every 2 seconds to check if downloads are ready
        poller = setInterval(fetchDownloads, 2000);
    });
}

async function main(): Promise<void> {
    console.log("Starting Apple Financial Statements Download Automation...");
    
    console.log("Initializing Browserbase client...");
    const bb: Browserbase = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY as string
    });

    // Initialize Stagehand with Browserbase for cloud-based browser automation
    const stagehand: Stagehand = new Stagehand({
        env: "BROWSERBASE",
        model: "google/gemini-2.5-flash",
        verbose: 0,
        // 0 = errors only, 1 = info, 2 = debug 
        // (When handling sensitive data like passwords or API keys, set verbose: 0 to prevent secrets from appearing in logs.) 
        // https://docs.stagehand.dev/configuration/logging
        logger: console.log,
        disablePino: true
    });

    try {
        // Initialize browser session to start automation
        await stagehand.init();
        console.log("Stagehand initialized successfully!");
        const context = stagehand.context;
        const page = context.pages()[0];

        // Display live view URL for debugging and monitoring
        const liveViewLinks = await bb.sessions.debug(stagehand.browserbaseSessionId!);
        console.log(`Live View Link: ${liveViewLinks.debuggerFullscreenUrl}`);

        // Navigate to Apple homepage with extended timeout for slow-loading sites
        console.log("Navigating to Apple.com...");
        await page.goto("https://www.apple.com/", { timeoutMs: 60000 });

        // Navigate to investor relations section
        console.log("Navigating to Investors section...");
        await stagehand.act("Click the 'Investors' button at the bottom of the page'");
        await stagehand.act("Scroll down to the Financial Data section of the page");
        await stagehand.act("Under Quarterly Earnings Reports, click on '2025'");

        // Download all quarterly financial statements
        // When a URL of a PDF is opened, Browserbase automatically downloads and stores the PDF
        // See https://docs.browserbase.com/features/screenshots#pdfs for more info
        console.log("Downloading quarterly financial statements...");
        await stagehand.act("Click the 'Financial Statements' link under Q4");
        await stagehand.act("Click the 'Financial Statements' link under Q3");
        await stagehand.act("Click the 'Financial Statements' link under Q2");
        await stagehand.act("Click the 'Financial Statements' link under Q1");

        // Retrieve all downloads triggered during this session from Browserbase API
        console.log("Retrieving downloads from Browserbase...");
        await saveDownloadsWithRetry(bb, stagehand.browserbaseSessionId!, 45);
        console.log("All downloads completed successfully!");
        
        console.log("\nStagehand History:");
        console.log(stagehand.history);

    } catch (error) {
        console.error("Error during automation:", error);
        throw error;
    } finally {
        // Always close session to release resources and clean up
        await stagehand.close();
        console.log("Session closed successfully");
    }
}

main().catch((err) => {
    console.error("Application error:", err);
    console.error("Common issues:");
    console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.error("  - Verify internet connection and Apple website accessibility");
    console.error("  - Ensure sufficient timeout for slow-loading pages");
    console.error("Docs: https://docs.stagehand.dev/v3/first-steps/introduction");
    process.exit(1);
});