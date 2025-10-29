# Stagehand v2 to v3 Migration Prompt

Use this prompt with your AI coding assistant (like Cursor or Claude) to automatically migrate your Stagehand v2 code to v3.

---

## Copy-Paste Prompt for AI Assistant

```
Please migrate my Stagehand v2 code to be compatible with Stagehand v3. Apply ALL of the following changes:

### 1. PAGE ACCESS PATTERN (CRITICAL)
- Change ALL instances of `const page = stagehand.page` to `const page = stagehand.context.pages()[0]`
- This is the most important change and affects every file that accesses the page

### 2. CONSTRUCTOR PARAMETERS
- Change `modelName` to `model` (can be a string or ModelConfiguration object)
  Before: `modelName: "openai/gpt-4.1"`
  After: `model: "openai/gpt-4.1"`
  
  Or with full config:
  ```typescript
  model: {
    modelName: "google/gemini-2.5-flash",
    apiKey: "your-api-key"
  }
  ```

- Rename `domSettleTimeoutMs` to `domSettleTimeout` (if present)

### 3. METHOD SIGNATURES

**act() method:**
- Signature: `act(instruction: string, options?: ActOptions)`
- Options interface:
  ```typescript
  interface ActOptions {
    model?: ModelConfiguration;
    variables?: Record<string, string>;
    timeout?: number;
    page?: Page;
  }
  ```
- **Note**: If no `page` argument is provided, `stagehand.act()` will operate on the "active" page. The page argument is **not always needed**.
- Example:
  ```typescript
  // page argument is optional - uses active page by default
  await stagehand.act("click 'football'");
  // or with options:
  await stagehand.act("choose 'Peach' from dropdown", {
    timeout: 10000,
    model: "google/gemini-2.5-flash",
    page: page  // optional - only specify if you want a different page
  });
  ```

**extract() method:**
- Signature: `extract(instruction?: string, schema?: zodTypeAny, options?: ExtractOptions)`
- Options interface:
  ```typescript
  interface ExtractOptions {
    model?: ModelConfiguration;
    timeout?: number;
    selector?: string;
    page?: Page;
  }
  ```
- **Note**: If no `page` argument is provided, `stagehand.extract()` will operate on the "active" page. The page argument is **not always needed**.
- Example:
  ```typescript
  const result = await stagehand.extract(
    "extract number one hn story",
    z.string(),
    {
      selector: "xpath=/html/body/main/...",
      timeout: 10000,
      page: page  // optional - only specify if you want a different page
    }
  );
  ```

**observe() method:**
- Signature: `observe(instruction?: string, options?: ObserveOptions)`
- Options interface:
  ```typescript
  interface ObserveOptions {
    model?: ModelConfiguration;
    timeout?: number;
    selector?: string;
    page?: Page;
  }
  ```
- **Note**: If no `page` argument is provided, `stagehand.observe()` will operate on the "active" page. The page argument is **not always needed**.
- Returns: `Promise<Action[]>`
- Example:
  ```typescript
  const [action] = await stagehand.observe("find the button to click");
  await stagehand.act(action);
  ```

### 4. ASYNC METHODS
- Make `stagehand.metrics()` async: `await stagehand.metrics()`
- Make `stagehand.history()` async: `await stagehand.history()`

### 5. REMOVED PARAMETERS
Remove these from `localBrowserLaunchOptions` if present:
- `env` (environment variables)
- `extraHTTPHeaders`
- `geolocation`
- `bypassCSP`
- `cookies`
- `timezoneId`
- `permissions`
- `recordHar`
- `recordVideo`
- `tracesDir`

### 6. NEW FEATURES (Optional)
- `cacheDir?: string` - directory where cache will be stored (enables caching for act() and agent())
- **Page argument is optional**: If no `page` argument is provided to `act()`, `extract()`, or `observe()`, the method will operate on the "active" page. You don't always need to specify the page explicitly.
- New `stagehand.connectURL()` method for integrating with Playwright, Patchright, or Puppeteer
- Caching support for both `act()` and `agent()` methods

### 7. IMPORT STATEMENT
Keep as: `import { Stagehand } from "@browserbasehq/stagehand";`

Please apply these changes to my code while preserving all other functionality.
```

---

## Before/After Examples

### Example 1: Basic Usage

**Before (v2):**
```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  modelName: "openai/gpt-4.1",
  verbose: 1,
});

await stagehand.init();
const page = stagehand.page;

await page.goto("https://example.com");
await page.act("click the button");
```

**After (v3):**
```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  model: "openai/gpt-4.1",
  verbose: 1,
});

await stagehand.init();
const page = stagehand.context.pages()[0];

await page.goto("https://example.com");
await page.act("click the button");
```

### Example 2: With Extract and Schema

**Before (v2):**
```typescript
const stagehand = new Stagehand({
  env: "LOCAL",
  modelName: "google/gemini-2.5-flash",
  verbose: 0,
});

await stagehand.init();
const page = stagehand.page;

await page.goto("https://news.ycombinator.com");

const userData = await page.extract({
  instruction: "Extract the top story",
  schema: z.object({
    title: z.string(),
    url: z.string()
  })
});
```

**After (v3):**
```typescript
const stagehand = new Stagehand({
  env: "LOCAL",
  model: "google/gemini-2.5-flash",
  verbose: 0,
});

await stagehand.init();
const page = stagehand.context.pages()[0];

await page.goto("https://news.ycombinator.com");

const userData = await stagehand.extract(
  "Extract the top story",
  z.object({
    title: z.string(),
    url: z.string()
  })
  // page parameter is optional - uses active page by default
);
```

### Example 3: With Act Options

**Before (v2):**
```typescript
const page = stagehand.page;
await page.act("click the submit button");
```

**After (v3):**
```typescript
const page = stagehand.context.pages()[0];

// Simple usage - no page parameter needed (uses active page by default)
await stagehand.act("click the submit button");

// Or with options but still no explicit page needed:
await stagehand.act("click the submit button", {
  timeout: 10000,
  // page parameter is optional - only include if you want a different page
});
```

### Example 4: With Browserbase Context

**Before (v2):**
```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  modelName: "openai/gpt-4.1",
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      context: {
        id: contextId,
        persist: true,
      },
    },
  },
});

await stagehand.init();
const page = stagehand.page;
```

**After (v3):**
```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  model: "openai/gpt-4.1",
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      context: {
        id: contextId,
        persist: true,
      },
    },
  },
});

await stagehand.init();
const page = stagehand.context.pages()[0];
```

### Example 5: Observe Pattern

**Before (v2):**
```typescript
const page = stagehand.page;
await page.goto("https://example.com");
// observe functionality may have been different
```

**After (v3):**
```typescript
const page = stagehand.context.pages()[0];
await page.goto("https://example.com");

const [action] = await stagehand.observe("find the button to click");
await stagehand.act(action);
```

### Example 6: Shadow DOM and OOPIF

**v3 New Features:**
```typescript
const page = stagehand.context.pages()[0];

// For shadow DOM with xpath
await page.locator("/html/body/shadow-demo//div/button").click();

// For crossing OOPIF & shadow root boundaries
await page.deepLocator(
  "/html/body/shadow-host//section/iframe/html/body/main/section[1]/form/div/div[1]/input"
).fill("text");
```

---

## Quick Reference: All Breaking Changes

| v2 | v3 | Notes |
|---|---|---|
| `stagehand.page` | `stagehand.context.pages()[0]` | **Most critical change** |
| `modelName: "..."` | `model: "..."` | Constructor parameter |
| `domSettleTimeoutMs` | `domSettleTimeout` | Constructor parameter |
| `stagehand.metrics()` | `await stagehand.metrics()` | Now async |
| `stagehand.history()` | `await stagehand.history()` | Now async |
| `page.extract({ instruction, schema })` | `page.extract(instruction, schema, options)` | New signature |
| Various `localBrowserLaunchOptions` | Removed | See removed parameters list |

---

## Common Migration Patterns

### Pattern 1: Multiple Page Access
If you access `stagehand.page` multiple times, update ALL occurrences:

```typescript
// Find and replace ALL of these patterns:
const page = stagehand.page;
await stagehand.page.goto(...);
let p = stagehand.page;

// With:
const page = stagehand.context.pages()[0];
await stagehand.context.pages()[0].goto(...);
let p = stagehand.context.pages()[0];
```

### Pattern 2: Function Parameters
If you pass the page to functions, update the function calls:

```typescript
// Before
async function myFunction(stagehand: Stagehand) {
  const page = stagehand.page;
  // ...
}

// After
async function myFunction(stagehand: Stagehand) {
  const page = stagehand.context.pages()[0];
  // ...
}
```

### Pattern 3: Multiple Stagehand Instances
Update EACH instance individually:

```typescript
// Before
const stagehand1 = new Stagehand({ env: "BROWSERBASE", modelName: "openai/gpt-4.1" });
const stagehand2 = new Stagehand({ env: "BROWSERBASE", modelName: "openai/gpt-4.1" });
await stagehand1.init();
await stagehand2.init();
const page1 = stagehand1.page;
const page2 = stagehand2.page;

// After
const stagehand1 = new Stagehand({ env: "BROWSERBASE", model: "openai/gpt-4.1" });
const stagehand2 = new Stagehand({ env: "BROWSERBASE", model: "openai/gpt-4.1" });
await stagehand1.init();
await stagehand2.init();
const page1 = stagehand1.context.pages()[0];
const page2 = stagehand2.context.pages()[0];
```

---

## New v3 Features

### Integrating with Playwright

To use Stagehand with Playwright, connect your Playwright browser over the WebSocket:

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { chromium } from "playwright-core";
import { z } from "zod";

async function example(stagehand: Stagehand) {
  const browser = await chromium.connectOverCDP({
    wsEndpoint: stagehand.connectURL(),
  });
  const pwContext = browser.contexts()[0];
  const pwPage1 = pwContext.pages()[0];
  await pwPage1.goto("https://docs.stagehand.dev/first-steps/introduction");

  const pwPage2 = await pwContext.newPage();
  await pwPage2.goto("https://docs.stagehand.dev/configuration/observability");

  const [page1Extraction, page2Extraction] = await Promise.all([
    stagehand.extract(
      "extract the names of the four stagehand primitives",
      z.array(z.string()),
      { page: pwPage1 },
    ),
    stagehand.extract(
      "extract the list of session dashboard features",
      z.array(z.string()),
      { page: pwPage2 },
    ),
  ]);

  console.log(page1Extraction);
  console.log(page2Extraction);
}

(async () => {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    model: "openai/gpt-4.1",
  });
  await stagehand.init();
  await example(stagehand);
})();
```

### Integrating with Patchright

To use Stagehand with Patchright, connect your Patchright browser over the WebSocket:

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { chromium } from "patchright-core";
import { z } from "zod";

async function example(stagehand: Stagehand) {
  const browser = await chromium.connectOverCDP({
    wsEndpoint: stagehand.connectURL(),
  });

  const prContext = browser.contexts()[0];
  const prPage = prContext.pages()[0];
  await prPage.goto("https://github.com/microsoft/playwright/issues/30261");

  // Both calls work on the active page (prPage) by default
  // You can omit the page parameter since there's only one active page
  await stagehand.act("scroll to the bottom of the page");

  const reason = await stagehand.extract(
    "extract the reason why playwright doesn't expose frame IDs",
    z.string()
  );
  console.log(reason);
}

(async () => {
  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 0,
    model: "openai/gpt-4.1",
  });
  await stagehand.init();
  await example(stagehand);
})();
```

### Integrating with Puppeteer

To use Stagehand with Puppeteer, connect your Puppeteer browser over the WebSocket:

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import puppeteer from "puppeteer-core";

async function example(stagehand: Stagehand) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: stagehand.connectURL(),
    defaultViewport: null,
  });
  const ppPages = await browser.pages();
  const ppPage = ppPages[0];

  await ppPage.goto("https://www.browserbase.com/blog");

  // page parameter is optional - operates on the active page by default
  const actions = await stagehand.observe("find the next page button");

  await stagehand.act(actions[0]);
}

(async () => {
  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 0,
    model: "openai/gpt-4.1",
  });
  await stagehand.init();
  await example(stagehand);
})();
```

### Caching Actions

You can cache actions from `agent()` (including CUA agent) and `act()`. Specify a cache directory in your Stagehand constructor. The first run uses inference; subsequent runs use cached actions (no inference needed).

**Caching with agent():**

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

async function example(stagehand: Stagehand) {
  const page = stagehand.context.pages()[0];
  await page.goto(
    "https://browserbase.github.io/stagehand-eval-sites/sites/drag-drop/",
  );

  const agent = stagehand.agent({
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
  });

  const result = await agent.execute({
    instruction: "drag 'text' to zone A.",
    maxSteps: 20,
  });

  console.log(JSON.stringify(result, null, 2));
}

(async () => {
  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 1,
    cacheDir: "cua-agent-cache", // specify a cache directory
  });
  await stagehand.init();
  await example(stagehand);
})();
```

**Caching with act():**

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

async function example(stagehand: Stagehand) {
  const page = stagehand.context.pages()[0];
  await page.goto(
    "https://browserbase.github.io/stagehand-eval-sites/sites/iframe-same-proc-scroll/",
  );
  await stagehand.act("scroll to the bottom of the iframe");
  await stagehand.act("fill the username field with %username%", {
    variables: {
      username: "fakeUsername",
    },
  });
}

(async () => {
  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 1,
    logInferenceToFile: false,
    cacheDir: "act-cache", // specify a cache directory
  });
  await stagehand.init();
  await example(stagehand);
})();
```

---

## Testing Your Migration

After migration, verify these key points:

1. ✅ All `stagehand.page` references are now `stagehand.context.pages()[0]`
2. ✅ All `modelName` are now `model`
3. ✅ All `domSettleTimeoutMs` are now `domSettleTimeout`
4. ✅ All `stagehand.metrics()` and `stagehand.history()` calls have `await`
5. ✅ Removed parameters are no longer in your config
6. ✅ Your code compiles without TypeScript errors
7. ✅ Your automation runs successfully

---

## Need Help?

If you encounter issues during migration:
- Check that you updated ALL page access patterns
- Verify your model configuration is correct
- Ensure removed parameters are completely removed
- Review the examples above for your specific use case

For more information, see: https://docs.browserbase.com/stagehand

