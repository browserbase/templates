// Stagehand + Browserbase: Value Prop One-Liner Generator - See README.md for full documentation

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Domain to analyze - change this to target a different website
const targetDomain = "www.browserbase.com"; // Or extract from email: email.split("@")[1]

/**
 * Analyzes a website's landing page to generate a concise one-liner value proposition.
 * Extracts the value prop using Stagehand, then uses an LLM to format it into a short phrase starting with "your".
 */
async function generateOneLiner(domain: string): Promise<string> {
	const stagehand = new Stagehand({
		env: "BROWSERBASE",
        model: "openai/gpt-4.1",
		verbose: 0, //  0 = errors only, 1 = info, 2 = debug 
		browserbaseSessionCreateParams: {
			projectId: process.env.BROWSERBASE_PROJECT_ID!,
		},
	});

	try {
		await stagehand.init();
		console.log("Stagehand initialized successfully!");
		console.log(`Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);

		const page = stagehand.context.pages()[0];

		// Navigate to domain
		console.log(`🌐 Navigating to https://${domain}...`);
		// 5min timeout to handle slow-loading sites or network issues
		await page.goto(`https://${domain}/`, {
			waitUntil: "domcontentloaded",
			timeoutMs: 300000,
		});

		console.log(`✅ Successfully loaded ${domain}`);

		// Extract value proposition from landing page
		console.log(`📝 Extracting value proposition for ${domain}...`);
		const valueProp = await stagehand.extract(
			"extract the value proposition from the landing page",
			z.object({
				value_prop: z.string(),
			}),
		);

		console.log(`📊 Extracted value prop for ${domain}:`, valueProp.value_prop);

		// Validate extraction returned meaningful content
		if (
			!valueProp.value_prop ||
			valueProp.value_prop.toLowerCase() === "null" ||
			valueProp.value_prop.toLowerCase() === "undefined"
		) {
			console.error(`⚠️ Value prop extraction returned empty or invalid result`);
			throw new Error(`No value prop found for ${domain}`);
		}

		// Generate one-liner using OpenAI
		// Prompt uses few-shot examples to guide LLM toward concise, "your X" format
		// System prompt enforces constraints (9 words max, no quotes, must start with "your")
		console.log(`🤖 Generating email one-liner for ${domain}...`);

		const response = await stagehand.llmClient.createChatCompletion({
			logger: () => {}, // Suppress verbose LLM logs
			options: {
				messages: [
					{
						role: "system",
						content:
							"You are an expert at generating concise, unique descriptions of companies. Generate ONLY a concise description (no greetings or extra text). Don't use generic adjectives like 'comprehensive', 'innovative', or 'powerful'. Keep it short and concise, no more than 9 words. DO NOT USE QUOTES. Only use English. You MUST start the response with 'your'.",
					},
					{
						role: "user",
						content: `The response will be inserted into this template: "{response}"

Examples:
Value prop: "Supercharge your investment team with AI-powered research"
Response: "your AI-powered investment research platform"

Value prop: "The video-first food delivery app"
Response: "your video-first approach to food delivery"

Value prop: "${valueProp.value_prop}"
Response:`,
					},
				],
			},
		});

		const oneLiner = String(
			response.choices?.[0]?.message?.content || "",
		).trim();

		// Validate LLM response is usable (not empty, not generic placeholder)
		console.log(`🔍 Validating generated one-liner...`);
		if (
			!oneLiner ||
			oneLiner.toLowerCase() === "null" ||
			oneLiner.toLowerCase() === "undefined" ||
			oneLiner.toLowerCase() === "your company"
		) {
			console.error(`⚠️ LLM generated invalid or placeholder response: "${oneLiner}"`);
			throw new Error(
				`No valid one-liner generated for ${domain}. AI response: "${oneLiner}"`,
			);
		}

		console.log(`✨ Generated one-liner for ${domain}:`, oneLiner);
		return oneLiner;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Generation failed for ${domain}: ${errorMessage}`);
		throw error;
	} finally {
		await stagehand.close();
		console.log("Session closed successfully");
	}
}

/**
 * Main entry point: generates a one-liner value proposition for the target domain.
 */
async function main() {
	console.log("Starting One-Liner Generator...");

	try {
		const oneLiner = await generateOneLiner(targetDomain);
		console.log("\n✅ Success!");
		console.log(`One-liner: ${oneLiner}`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`\n❌ Error: ${errorMessage}`);
		console.error("\nCommon issues:");
		console.error("  - Check .env file has OPENAI_API_KEY set (required for LLM generation)");
		console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY set (required for browser automation)");
		console.error("  - Ensure the domain is accessible and not a placeholder/maintenance page");
		console.error("  - Verify internet connectivity and that the target site is reachable");
		console.error("Docs: https://docs.browserbase.com/stagehand");
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});

