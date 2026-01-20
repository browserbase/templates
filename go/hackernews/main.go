package main

import (
	"context"
	"fmt"
	"os"

	"github.com/browserbase/stagehand-go"
	"github.com/browserbase/stagehand-go/option"
)

const sdkVersion = "3.0.7"

func main() {
	// Create client using environment variables
	client := stagehand.NewClient(
		option.WithBrowserbaseAPIKey(os.Getenv("BROWSERBASE_API_KEY")),
		option.WithBrowserbaseProjectID(os.Getenv("BROWSERBASE_PROJECT_ID")),
		option.WithModelAPIKey(os.Getenv("MODEL_API_KEY")),
	)

	ctx := context.Background()

	// Start a new browser session
	startResponse, err := client.Sessions.Start(ctx, stagehand.SessionStartParams{
		ModelName:   "openai/gpt-4o-mini",
		XLanguage:   stagehand.SessionStartParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to start session: %v\n", err)
		os.Exit(1)
	}

	sessionID := startResponse.Data.SessionID
	fmt.Printf("Session started: %s\n", sessionID)
	fmt.Printf("Watch live: https://www.browserbase.com/sessions/%s\n", sessionID)

	// Ensure we clean up the session
	defer func() {
		_, _ = client.Sessions.End(ctx, sessionID, stagehand.SessionEndParams{
			XLanguage:   stagehand.SessionEndParamsXLanguageTypescript,
			XSDKVersion: stagehand.String(sdkVersion),
		})
		fmt.Println("Session ended")
	}()

	// Navigate to Hacker News
	_, err = client.Sessions.Navigate(ctx, sessionID, stagehand.SessionNavigateParams{
		URL:         "https://news.ycombinator.com",
		FrameID:     stagehand.String(""),
		XLanguage:   stagehand.SessionNavigateParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to navigate: %v\n", err)
		return
	}
	fmt.Println("Navigated to Hacker News")

	// Observe available actions
	observeResponse, err := client.Sessions.Observe(ctx, sessionID, stagehand.SessionObserveParams{
		Instruction: stagehand.String("find the link to view comments for the top post"),
		XLanguage:   stagehand.SessionObserveParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to observe: %v\n", err)
		return
	}

	actions := observeResponse.Data.Result
	fmt.Printf("Found %d possible actions\n", len(actions))

	if len(actions) == 0 {
		fmt.Println("No actions found")
		return
	}

	// Act on the first action
	action := actions[0]
	fmt.Printf("Acting on: %s\n", action.Description)

	actResponse, err := client.Sessions.Act(ctx, sessionID, stagehand.SessionActParams{
		Input: stagehand.SessionActParamsInputUnion{
			OfAction: &stagehand.ActionParam{
				Description: action.Description,
				Selector:    action.Selector,
				Method:      stagehand.String(action.Method),
				Arguments:   action.Arguments,
			},
		},
		XLanguage:   stagehand.SessionActParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to act: %v\n", err)
		return
	}
	fmt.Printf("Act completed: %s\n", actResponse.Data.Result.Message)

	// Extract structured data
	extractResponse, err := client.Sessions.Extract(ctx, sessionID, stagehand.SessionExtractParams{
		Instruction: stagehand.String("extract the title and top comment from this page"),
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title": map[string]any{
					"type":        "string",
					"description": "The title of the post",
				},
				"topComment": map[string]any{
					"type":        "string",
					"description": "The text of the top comment",
				},
				"author": map[string]any{
					"type":        "string",
					"description": "The username of the top commenter",
				},
			},
			"required": []string{"title"},
		},
		XLanguage:   stagehand.SessionExtractParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to extract: %v\n", err)
		return
	}
	fmt.Printf("Extracted data: %+v\n", extractResponse.Data.Result)

	// Run autonomous agent
	executeResponse, err := client.Sessions.Execute(ctx, sessionID, stagehand.SessionExecuteParams{
		ExecuteOptions: stagehand.SessionExecuteParamsExecuteOptions{
			Instruction: "Navigate back to the main Hacker News page and find the newest post",
			MaxSteps:    stagehand.Float(5),
		},
		AgentConfig: stagehand.SessionExecuteParamsAgentConfig{
			Model: stagehand.ModelConfigUnionParam{
				OfModelConfigModelConfigObject: &stagehand.ModelConfigModelConfigObjectParam{
					ModelName: "openai/gpt-4o-mini",
					APIKey:    stagehand.String(os.Getenv("MODEL_API_KEY")),
				},
			},
			Cua: stagehand.Bool(false),
		},
		XLanguage:   stagehand.SessionExecuteParamsXLanguageTypescript,
		XSDKVersion: stagehand.String(sdkVersion),
	})
	if err != nil {
		fmt.Printf("Failed to execute agent: %v\n", err)
		return
	}
	fmt.Printf("Agent result: %s\n", executeResponse.Data.Result.Message)
	fmt.Printf("Agent success: %v\n", executeResponse.Data.Result.Success)
}
