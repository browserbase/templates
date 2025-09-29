/**
/**
 * Stagehand + Browserbase: Form Filling Automation
 * 
 * AT A GLANCE
 * - Goal: showcase how to automate form filling with Stagehand and Browserbase.
 * - Smart Form Automation: dynamically fill contact forms with variable-driven data.
 * - Field Detection: analyze page structure with `observe` before interacting with fields.
 * - AI-Powered Interaction: leverage Stagehand to map inputs to the right fields reliably.
 *   Docs → https://docs.browserbase.com/features/sessions
 *
 * GLOSSARY
 * - act: perform UI actions from a prompt (type, click, fill forms)
 *   Docs → https://docs.stagehand.dev/basics/act
 * - observe: analyze a page and return selectors or action plans before executing
 *   Docs → https://docs.stagehand.dev/basics/observe
 * - variable substitution: inject dynamic values into actions using `%variable%` syntax
 *
 * 
 * QUICKSTART
 *  1) pnpm init
 *  2) pnpm add @browserbasehq/stagehand dotenv @types/node zod
 *     pnpm add -D typescript && pnpm tsc --init
 *  3) Create .env with:
 *       BROWSERBASE_PROJECT_ID=...
 *       BROWSERBASE_API_KEY=...
 *       OPENAI_API_KEY=...
 *  4) Compile + run:
 *       pnpm tsc && node formFilling.js
 *
 * EXPECTED OUTPUT
 * - Initializes Stagehand session with Browserbase
 * - Navigates to contact form page
 * - Analyzes available form fields using observe
 * - Fills form with sample data using variable substitution
 * - Displays session recording link for monitoring
 * - Closes session cleanly
 *
 * COMMON PITFALLS
 * - "Cannot find module": ensure all dependencies are installed
 * - Missing credentials: verify .env contains all required API keys
 * - Form detection: ensure target page has fillable form fields
 * - Variable mismatch: ensure variable names in action match variables object
 * - Network issues: check internet connection and website accessibility
 */

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

// Form data variables - using random/fake data for testing
// Set your own variables below to customize the form submission
const firstName = "Alex";
const lastName = "Johnson";
const company = "TechCorp Solutions";
const jobTitle = "Software Developer";
const email = "alex.johnson@techcorp.com";
const message = "Hello, I'm interested in learning more about your services and would like to schedule a demo.";

async function main() {
	console.log("Starting Form Filling Example...");
	
	// Initialize Stagehand with Browserbase for cloud-based browser automation.
	const stagehand = new Stagehand({
		env: "BROWSERBASE",
		modelName: "gpt-4o",
		browserbaseSessionCreateParams: {
			projectId: process.env.BROWSERBASE_PROJECT_ID!,
		}
	});

	try {
		// Initialize browser session to start automation.
		await stagehand.init();
		console.log("Stagehand initialized successfully!");
		console.log(`Live View Link: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

		const page = stagehand.page;

		// Navigate to contact page with extended timeout for slow-loading sites.
		console.log("Navigating to Browserbase contact page...");
		await page.goto('https://www.browserbase.com/contact', {
			waitUntil: 'domcontentloaded', // Wait for DOM to be ready before proceeding.
			timeout: 60000 // Extended timeout for reliable page loading.
		});

		// Analyze form structure to identify fillable fields before attempting to fill.
		console.log("Analyzing form fields...");
		const contact_page = await page.observe({ 
			instruction: "What are the fields that can be filled in?",
			returnAction: true // Return action objects for potential reuse with act().
		});
		console.log("Available form fields:", contact_page);

		// Fill form using a more reliable approach with individual field targeting.
		console.log("Filling in contact form...");
		
		// Fill each field individually for better reliability
		await page.act(`Fill in the first name field with "${firstName}"`);
		await page.act(`Fill in the last name field with "${lastName}"`);
		await page.act(`Fill in the company field with "${company}"`);
		await page.act(`Fill in the job title field with "${jobTitle}"`);
		await page.act(`Fill in the email field with "${email}"`);
		await page.act(`Fill in the message field with "${message}"`);
        
        // Language choice in Stagehand act() is crucial for reliable automation.
        // Use "click" for dropdown interactions rather than "select"
        await page.act("Click on the How Can we help? dropdown");
        await page.waitForTimeout(500);
        await page.act("Click on the first option from the dropdown");
        // await page.act("Select the first option from the dropdown"); // Less reliable than "click"

        // Uncomment the line below if you want to submit the form
        // await page.act("Click the submit button");
	
		console.log("Form filled successfully! Waiting 3 seconds...");
		await page.waitForTimeout(30000);

	} catch (error) {
		console.error(`Error during form filling: ${error}`);
	} finally {
		// Always close session to release resources and clean up.
		await stagehand.close();
		console.log("Session closed successfully");
	}
}

main().catch((err) => {
	console.error("Error in form filling example:", err);
	console.error("Common issues:");
	console.error("  - Check .env file has BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
	console.error("  - Verify internet connection and website accessibility");
	console.error("  - Ensure form fields are available on the contact page");
	console.error("Docs: https://docs.browserbase.com/stagehand");
	process.exit(1);
});

/**
 * USE CASES
 * • Lead & intake automation: Auto-fill contact/quote/request forms from CRM or CSV to speed up inbound/outbound workflows.
 * • QA & regression testing: Validate form fields, required rules, and error states across releases/environments.
 * • Bulk registrations & surveys: Programmatically complete repeatable sign-ups or survey passes for pilots and internal ops.
 * 
 * NEXT STEPS
 * • Wire in data sources: Load variables from CSV/JSON/CRM, map fields via observe, and support per-site field aliases.
 * • Submit & verify: Enable submit, capture success toasts/emails, take screenshots, and retry on validation errors.
 * • Handle complex widgets: Add file uploads, multi-step flows, dropdown/radio/datepickers, and basic anti-bot tactics (delays/proxies).
 * 
 * HELPFUL RESOURCES
 * 📚 Stagehand Docs:     https://docs.browserbase.com/stagehand
 * 🎮 Browserbase:        https://www.browserbase.com
 * 📧 Need help?          support@browserbase.com
 */