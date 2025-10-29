# License Verification Automation

This example demonstrates how to automate license verification workflows using Stagehand and Browserbase. The automation navigates to license verification sites, fills in credentials, and extracts structured results.

## Features

- **Automated Form Filling**: Uses AI to fill in license information (first name, last name, license number)
- **License Verification**: Submits search queries and extracts structured results
- **Batch Processing**: Can process multiple license records in sequence
- **Type-Safe Extraction**: Uses Zod schemas for validated data extraction

## Prerequisites

- Node.js 18+ installed
- A Browserbase account with API credentials
- An OpenAI API key

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment variables**

Create a `.env` file in the project root:

```env
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_project_id
OPENAI_API_KEY=your_openai_api_key
```

3. **Configure license records**

Edit the `LicenseRecords` array in `index.ts` with your license verification data:

```typescript
const LicenseRecords = [
  {
    Site: "https://pod-search.kalmservices.net/",
    FirstName: "Ronald",
    LastName: "Agee",
    LicenseNumber: "346",
  },
  // Add more records as needed
];
```

## Usage

Run the automation:

```bash
npm start
# or
npx tsx index.ts
```

The script will:
1. Initialize a Browserbase browser session
2. Navigate to each license verification site
3. Fill in the license information
4. Submit the search
5. Extract and display the verification results

## How It Works

### 1. Navigation

The automation navigates to the specified license verification site:

```typescript
await page.goto(LicenseRecord.Site);
await page.waitForLoadState("domcontentloaded");
```

### 2. Form Filling

Uses Stagehand's `act()` method to fill in form fields:

```typescript
await stagehand.act(
  `Type "${LicenseRecord.FirstName}" into the first name field`,
);
await stagehand.act(`Type "${LicenseRecord.LastName}" into the last name field`);
await stagehand.act(
  `Type "${LicenseRecord.LicenseNumber}" into the license number field`,
);
```

### 3. Search Submission

Clicks the search button to submit the form:

```typescript
await stagehand.act("Click the search button");
```

### 4. Data Extraction

Extracts structured license verification results using Zod schemas:

```typescript
const results = await stagehand.extract(
  "Extract ALL the license verification results from the page",
  z.object({
    list_of_licenses: z.array(
      z.object({
        name: z.string(),
        license_number: z.string(),
        status: z.string(),
        more_info_url: z.string(),
      }),
    ),
  }),
);
```

## Extracting Data

The automation uses Stagehand's `extract()` method with Zod schemas to get structured data:

- **name**: The license holder's name
- **license_number**: The license identification number
- **status**: Current status of the license
- **more_info_url**: URL for additional license information

## Customization

### Adding More License Records

Add additional records to the `LicenseRecords` array:

```typescript
const LicenseRecords = [
  {
    Site: "https://pod-search.kalmservices.net/",
    FirstName: "Ronald",
    LastName: "Agee",
    LicenseNumber: "346",
  },
  {
    Site: "https://another-site.com/",
    FirstName: "Jane",
    LastName: "Doe",
    LicenseNumber: "789",
  },
];
```

### Modifying the Extraction Schema

Update the Zod schema to extract different fields:

```typescript
const results = await stagehand.extract(
  "Extract license verification details",
  z.object({
    list_of_licenses: z.array(
      z.object({
        name: z.string(),
        license_number: z.string(),
        status: z.string(),
        expiration_date: z.string().optional(), // Add new field
        issue_date: z.string().optional(), // Add new field
        more_info_url: z.string(),
      }),
    ),
  }),
);
```

### Customizing Actions

Modify the actions to handle different form structures:

```typescript
// For different field names
await stagehand.act(`Type "${LicenseRecord.LicenseNumber}" into the license ID field`);

// For custom submit buttons
await stagehand.act("Click the submit or verify button");
```

## Configuration

### Stagehand Options

The automation uses the following Stagehand configuration:

```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE", // Use cloud-based browsers
  verbose: 1, // Logging level: 0 (errors), 1 (info), 2 (debug)
  model: "openai/gpt-4.1", // Model for AI actions and extraction
});
```

### Verbose Levels

- `0`: Errors only (use for production with sensitive data)
- `1`: Info level (default, shows important actions)
- `2`: Debug level (shows all details, use for troubleshooting)

## Troubleshooting

### Common Issues

1. **"Missing API keys"**: Ensure `.env` file has all required API keys
2. **"License not found"**: Verify the license data is correct and the site is accessible
3. **"Page load timeout"**: The site may be slow, increase timeouts in the code
4. **"Extraction failed"**: Check if the result page structure matches your schema

### Debug Mode

Enable verbose logging to troubleshoot issues:

```typescript
const stagehand = new Stagehand({
  verbose: 2, // Shows all debug information
});
```

## Live Session View

Each run provides a live session URL to watch the automation in real-time:

```
Watch live: https://browserbase.com/sessions/{session-id}
```

## Learn More

- [Stagehand Documentation](https://docs.browserbase.com/stagehand)
- [Browserbase Docs](https://docs.browserbase.com)
- [Zod Documentation](https://zod.dev)
