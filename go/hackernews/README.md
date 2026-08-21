# Stagehand + Browserbase: Hacker News Automation

Stagehand is the SDK for browser agents.

## AT A GLANCE

- Goal: demonstrate Stagehand V4's core browser automation primitives through a complete Hacker News workflow.
- Complete workflow: launch a Browserbase browser, attach Stagehand, navigate, observe, act, and extract typed data.
- Real-world outcome: open the top story's comments, extract its first comment, then extract the newest visible story.
- Docs → https://docs.stagehand.dev/v4/first-steps/quickstart

## GLOSSARY

- `LaunchBrowserbase`: create a Browserbase browser owned by the application.
- `Create`: attach Stagehand V4 to that browser.
- `Observe`: find possible page actions from a natural-language instruction.
- `Act`: execute either an observed action or a natural-language instruction.
- `Extract`: return typed structured data together with result metadata.

## QUICKSTART

1. Install Go 1.26 or newer (`go version`).
2. Set `BROWSERBASE_API_KEY` in your environment.
3. Run `go mod download`.
4. Run `go run .`.

## EXPECTED OUTPUT

- Launches a real Browserbase browser and attaches Stagehand V4.
- Navigates to Hacker News and verifies the main-document HTTP response.
- Observes and opens the comments link for the top-ranked story.
- Extracts the story title, first comment, and commenter.
- Navigates to `/newest` and extracts the newest story title.
- Explicitly closes Stagehand before closing the browser.

## COMMON PITFALLS

- Missing Go installation: ensure Go 1.26+ is installed.
- Missing credentials: verify `BROWSERBASE_API_KEY` is set.
- Module not found: run `go mod download` if dependencies are not resolved.
- No `MODEL_API_KEY` is needed: Stagehand primitives use Browserbase Model Gateway.
- Stagehand V4 does not expose an agent API. Bring your own agent framework when orchestration is required.

## USE CASES

- Content aggregation: extract structured records from news sites, forums, and social platforms.
- Research automation: combine deterministic navigation with AI-guided actions and typed extraction.
- Content automation: combine page interaction and structured extraction in a real cloud browser.

## NEXT STEPS

- Add retries for transient site or model failures.
- Extend the extraction types with points, comment count, and post age.
- Add an external Go agent framework if the workflow needs autonomous planning.

## HELPFUL RESOURCES

- Stagehand Docs: https://docs.stagehand.dev/v4/first-steps/quickstart
- Browserbase: https://www.browserbase.com
- Templates: https://www.browserbase.com/templates
- Discord: http://stagehand.dev/discord
