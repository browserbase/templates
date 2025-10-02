// Stagehand + Browserbase: Form Filling Automation - See README.md for full documentation

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
		modelName: "openai/gpt-4.1",
		verbose: 1,
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

		// Single observe call to plan all form filling
		const formFields = await page.observe({
			instruction: `Find form fields for: first name, last name, company, job title, email, message`,
			returnAction: true
		});

		// Execute all actions without LLM calls
		for (const field of formFields) {
			// Match field to data based on description
			let value = '';
			const desc = field.description.toLowerCase();
			
			if (desc.includes('first name')) value = firstName;
			else if (desc.includes('last name')) value = lastName;
			else if (desc.includes('company')) value = company;
			else if (desc.includes('job title')) value = jobTitle;
			else if (desc.includes('email')) value = email;
			else if (desc.includes('message')) value = message;
			
			if (value) {
				await page.act({
					...field,
					arguments: [value]
				});
			}
		}
		
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
