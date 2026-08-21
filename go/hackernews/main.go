package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	stagehand "github.com/browserbase/stagehand/packages/sdk-go/v4"
)

type storyDetails struct {
	Title      string `json:"title" jsonschema:"description=title of the Hacker News post"`
	TopComment string `json:"topComment" jsonschema:"description=text of the first visible comment"`
	Author     string `json:"author" jsonschema:"description=username of the first visible commenter"`
}

type newestStory struct {
	Title string `json:"title" jsonschema:"description=title of the newest visible story"`
}

func main() {
	if err := run(context.Background()); err != nil {
		log.Fatal(err)
	}
}

func run(parent context.Context) (err error) {
	apiKey := os.Getenv("BROWSERBASE_API_KEY")
	if apiKey == "" {
		return errors.New("BROWSERBASE_API_KEY is required")
	}

	ctx, cancel := context.WithTimeout(parent, 2*time.Minute)
	defer cancel()

	sessionTimeout := 120.0
	browser, err := stagehand.LaunchBrowserbase(ctx, stagehand.BrowserbaseLaunchOptions{
		APIKey:  apiKey,
		Timeout: &sessionTimeout,
	})
	if err != nil {
		return fmt.Errorf("launch Browserbase: %w", err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		err = errors.Join(err, browser.Close(cleanupCtx))
	}()

	client, err := stagehand.Create(ctx, stagehand.CreateOptions{Browser: browser})
	if err != nil {
		return fmt.Errorf("create Stagehand: %w", err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		err = errors.Join(err, client.Close(cleanupCtx))
	}()

	browserContext, err := browser.Context()
	if err != nil {
		return fmt.Errorf("get browser context: %w", err)
	}
	pages, err := browserContext.Pages(ctx)
	if err != nil {
		return fmt.Errorf("list pages: %w", err)
	}
	if len(pages) == 0 {
		return errors.New("no active page after Stagehand initialization")
	}
	page := pages[0]

	response, err := page.Goto(ctx, "https://news.ycombinator.com", nil)
	if err != nil {
		return fmt.Errorf("navigate to Hacker News: %w", err)
	}
	if response == nil || response.Status() != 200 {
		return errors.New("unexpected navigation response from Hacker News")
	}
	fmt.Println("Navigated to Hacker News")

	instruction := "Find the comments link for the top-ranked story"
	observed, err := client.Observe(ctx, &instruction, nil)
	if err != nil {
		return fmt.Errorf("observe comments link: %w", err)
	}
	if len(observed.Data) == 0 {
		return errors.New("observe returned no comments link")
	}
	fmt.Printf("Found %d possible comment actions\n", len(observed.Data))

	acted, err := client.Act(ctx, stagehand.ObservedAction(observed.Data[0]), nil)
	if err != nil {
		return fmt.Errorf("open comments: %w", err)
	}
	if !acted.Data.Success {
		return fmt.Errorf("open comments failed: %s", acted.Data.Message)
	}
	details, err := stagehand.Extract[storyDetails](
		ctx,
		client,
		"Extract the post title and the first visible comment with its author",
		nil,
	)
	if err != nil {
		return fmt.Errorf("extract story details: %w", err)
	}
	fmt.Printf("Top story: %s\n", details.Data.Title)
	fmt.Printf("Top comment by %s: %s\n", details.Data.Author, details.Data.TopComment)

	response, err = page.Goto(ctx, "https://news.ycombinator.com/newest", nil)
	if err != nil {
		return fmt.Errorf("navigate to newest stories: %w", err)
	}
	if response == nil || response.Status() != 200 {
		return errors.New("unexpected response from the Hacker News newest page")
	}
	newest, err := stagehand.Extract[newestStory](
		ctx,
		client,
		"Extract the exact title of the first story in the newest stories list",
		nil,
	)
	if err != nil {
		return fmt.Errorf("extract newest story: %w", err)
	}
	fmt.Printf("Newest story: %s\n", newest.Data.Title)
	return nil
}
