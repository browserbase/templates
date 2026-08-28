# 🤘 Welcome to VibeCheck!

Hey! This is a project built with [Stagehand](https://github.com/browserbase/stagehand).

Check out our other Stagehand templates [here!](https://www.browserbase.com/templates)

## What is VibeCheck?

VibeCheck uses Stagehand to search Google Maps and score venues based on your vibe preferences. Tell it what atmosphere you're looking for, and it'll search your area.

> 💡 This is just a quick vibe check for inspo - do your own research before heading out!

## Setting the Stage

Stagehand is an SDK for automating browsers. It provides a higher-level API for better debugging and AI fail-safes.

## Curtain Call

### Add your API keys

Your required API keys/environment variables are in the `.env.example` file. Copy it to `.env` and add your keys.

```bash
cp .env.example .env && nano .env # Add your API keys to .env
```

Quick note - in addition to your Browserbase keys, you'll only need the API key of the model providers you're using. For example, to use a google model and an open ai model you'll need a GEMINI_API_KEY and an OPENAI_API_KEY.

### Run your vibe check

Get ready for a show-stopping development experience. Just run:

```bash
python main.py "fall sunset" "san francisco"
```

To do a quick vibe check of the area.

> 🎯 Tip: Always check the latest info yourself!

## What's Next?

### Run on Local

To run on a local browser, change `env: "BROWSERBASE"` to `env: "LOCAL"` in the stagehand constructor.

## 🎥 Watch Your Session Live

When running with Browserbase, you can watch your session live in the Browserbase session inspector. The live view URL will be printed to the console when your script starts.

## 🚀 Future Enhancements

Ideas for extending VibeCheck:

- **Photo Analysis**: Process and analyze venue images for better vibe matching
- **Deeper Reviews**: Pull and analyze more individual reviews for richer sentiment analysis
- **Data Export**: Export results to CSV/JSON files for processing with other systems
- **Web Display**: Add an API route to display results in a web app
- **Dashboard Data**: Build a dashboard to track and compare vibe searches over time
- **Social Sharing**: Use the Twitter/X API to auto-post your vibe discoveries with venue details and scores

## 📚 Resources & Support

- **Questions?** Reach out via support@browserbase.com
- **Documentation:** Check out our docs at [docs.stagehand.dev](https://docs.stagehand.dev)
