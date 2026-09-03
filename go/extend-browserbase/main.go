// Stagehand + Browserbase + Extend: Download Expense Receipts and Parse with Extend AI
// See README.md for full documentation

package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	stagehand "github.com/browserbase/stagehand/packages/sdk-go/v4"
	extend "github.com/extend-hq/extend-go-sdk"
	extendclient "github.com/extend-hq/extend-go-sdk/client"
	"github.com/extend-hq/extend-go-sdk/option"
)

const (
	expensePortalURL = "https://v0-reimburse-me-expense-portal.vercel.app/"
	browserbaseAPI   = "https://api.browserbase.com/v1"
	documentsDir     = "output/documents"
	resultsDir       = "output/results"
	downloadTimeout  = 60 * time.Second
	extractBatchSize = 9
)

func main() {
	if err := run(context.Background()); err != nil {
		log.Println("Application error:", err)
		log.Println("Common issues:")
		log.Println("  - Check BROWSERBASE_API_KEY is set in your environment")
		log.Println("  - Set EXTEND_API_KEY to enable receipt parsing with Extend AI")
		log.Println("  - Verify internet connection and expense portal accessibility")
		log.Println("Docs: https://docs.stagehand.dev/v4/first-steps/introduction")
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	fmt.Println("Starting Expense Receipt Downloader...")

	apiKey := os.Getenv("BROWSERBASE_API_KEY")
	if apiKey == "" {
		return errors.New("BROWSERBASE_API_KEY is required")
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	sessionID, clicks, err := downloadReceipts(ctx, apiKey)
	if err != nil {
		return err
	}

	// Give Browserbase a moment to finalize downloads after the session closes.
	time.Sleep(2 * time.Second)

	fmt.Println("\nRetrieving downloads from Browserbase...")
	files, err := saveDownloadsWithRetry(ctx, apiKey, sessionID, clicks, downloadTimeout)
	if err != nil {
		return fmt.Errorf("download retrieval failed: %w", err)
	}
	if len(files) == 0 {
		fmt.Println("No downloads were captured")
		return nil
	}

	fmt.Println("\n=== Download Summary ===")
	fmt.Printf("Total files downloaded: %d\n", len(files))
	fmt.Printf("Files saved to: ./%s/\n", documentsDir)

	if err := parseReceiptsWithExtend(ctx, files); err != nil {
		return err
	}

	fmt.Println("\nExpense receipt download complete!")
	return nil
}

// downloadReceipts drives a Browserbase session with Stagehand: it opens the
// expense portal, observes every per-receipt download link, and clicks each one.
// The session is closed before returning so downloads can be retrieved.
// It returns the session ID and the number of successful download clicks.
func downloadReceipts(ctx context.Context, apiKey string) (sessionID string, clicks int, err error) {
	sessionTimeout := 300.0
	browser, err := stagehand.LaunchBrowserbase(ctx, stagehand.BrowserbaseLaunchOptions{
		APIKey:  apiKey,
		Timeout: &sessionTimeout,
	})
	if err != nil {
		return "", 0, fmt.Errorf("launch Browserbase: %w", err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		err = errors.Join(err, browser.Close(cleanupCtx))
	}()

	sessionID = browser.SessionID()
	if sessionID == "" {
		return "", 0, errors.New("Browserbase launch did not return a session ID")
	}

	client, err := stagehand.Create(ctx, stagehand.CreateOptions{Browser: browser})
	if err != nil {
		return "", 0, fmt.Errorf("create Stagehand: %w", err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		err = errors.Join(err, client.Close(cleanupCtx))
	}()
	fmt.Println("Stagehand initialized successfully!")
	fmt.Println("Live View is available in the Browserbase Sessions dashboard")

	browserContext, err := browser.Context()
	if err != nil {
		return "", 0, fmt.Errorf("get browser context: %w", err)
	}
	pages, err := browserContext.Pages(ctx)
	if err != nil {
		return "", 0, fmt.Errorf("list pages: %w", err)
	}
	if len(pages) == 0 {
		return "", 0, errors.New("no active page after Stagehand initialization")
	}
	page := pages[0]

	fmt.Println("\nNavigating to expense portal...")
	waitUntil := stagehand.LoadStateDOMContentLoaded
	if _, err := page.Goto(ctx, expensePortalURL, &stagehand.PageNavigationOptions{WaitUntil: &waitUntil}); err != nil {
		return "", 0, fmt.Errorf("navigate to expense portal: %w", err)
	}

	// Observe finds every individual download link (not the "Download All" button)
	// so each can be passed straight to act for precise element targeting.
	fmt.Println("\nFinding all individual download buttons...")
	instruction := "Find all the small Download links on individual receipt cards."
	observed, err := client.Observe(ctx, &instruction, &stagehand.StagehandClientObserveOptions{Page: page})
	if err != nil {
		return "", 0, fmt.Errorf("observe download links: %w", err)
	}
	if len(observed.Data) == 0 {
		return "", 0, errors.New("no receipt download links were found")
	}

	actOptions := &stagehand.StagehandClientActOptions{Page: page}
	scroll := func() {
		_, _ = client.Act(ctx, stagehand.ActInstruction("Scroll down slightly"), actOptions)
	}
	for i, action := range observed.Data {
		fmt.Printf("Downloading receipt %d/%d...\n", i+1, len(observed.Data))

		if _, err := client.Act(ctx, stagehand.ObservedAction(action), actOptions); err == nil {
			clicks++
		} else {
			// If the click fails, scroll the element into view and retry once.
			fmt.Printf("  Could not click download button %d, trying to scroll and retry...\n", i+1)
			scroll()
			if _, err := client.Act(ctx, stagehand.ObservedAction(action), actOptions); err == nil {
				clicks++
			} else {
				fmt.Printf("  Skipping receipt %d\n", i+1)
			}
		}

		// Scroll periodically so later links stay in view.
		if (i+1)%4 == 0 && i+1 < len(observed.Data) {
			scroll()
		}
	}

	fmt.Printf("\nDownload clicks completed! (%d/%d successful)\n", clicks, len(observed.Data))
	return sessionID, clicks, nil
}

type browserbaseDownload struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
}

type browserbaseDownloadList struct {
	Downloads []browserbaseDownload `json:"downloads"`
	Total     int                   `json:"total"`
}

// saveDownloadsWithRetry polls the Browserbase Downloads API every 2 seconds
// until every expected file has synced (or the timeout passes), then saves each
// file into output/documents and returns the local paths.
func saveDownloadsWithRetry(ctx context.Context, apiKey, sessionID string, expected int, timeout time.Duration) ([]string, error) {
	fmt.Printf("Waiting up to %s for downloads to complete...\n", timeout)
	httpClient := &http.Client{Timeout: 30 * time.Second}
	deadline := time.Now().Add(timeout)

	var list browserbaseDownloadList
	for {
		fmt.Println("Checking for downloads...")
		if err := browserbaseGetJSON(ctx, httpClient, apiKey,
			browserbaseAPI+"/downloads?sessionId="+url.QueryEscape(sessionID), &list); err != nil {
			return nil, err
		}
		if list.Total >= expected && list.Total > 0 {
			break
		}
		if time.Now().After(deadline) {
			if list.Total == 0 {
				return nil, errors.New("download timeout exceeded")
			}
			fmt.Printf("Timed out waiting for all downloads; continuing with %d of %d\n", list.Total, expected)
			break
		}
		fmt.Printf("Downloads not ready yet (%d/%d), retrying...\n", list.Total, expected)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	fmt.Printf("Downloads ready! Found %d file(s)\n", list.Total)

	if err := os.MkdirAll(documentsDir, 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(resultsDir, 0o755); err != nil {
		return nil, err
	}

	paths := make([]string, 0, len(list.Downloads))
	for _, download := range list.Downloads {
		// filepath.Base guards against path separators in server-provided names.
		outputPath := filepath.Join(documentsDir, filepath.Base(download.Filename))
		if err := browserbaseGetFile(ctx, httpClient, apiKey, browserbaseAPI+"/downloads/"+download.ID, outputPath); err != nil {
			return nil, fmt.Errorf("save %s: %w", download.Filename, err)
		}
		fmt.Printf("Saved: %s (%d bytes)\n", outputPath, download.Size)
		paths = append(paths, outputPath)
	}
	return paths, nil
}

func browserbaseRequest(ctx context.Context, apiKey, endpoint, accept string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-bb-api-key", apiKey)
	req.Header.Set("Accept", accept)
	return req, nil
}

func browserbaseGetJSON(ctx context.Context, httpClient *http.Client, apiKey, endpoint string, out any) error {
	req, err := browserbaseRequest(ctx, apiKey, endpoint, "application/json")
	if err != nil {
		return err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("browserbase %s returned %d: %s", endpoint, resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func browserbaseGetFile(ctx context.Context, httpClient *http.Client, apiKey, endpoint, outputPath string) error {
	req, err := browserbaseRequest(ctx, apiKey, endpoint, "application/octet-stream")
	if err != nil {
		return err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("browserbase %s returned %d", endpoint, resp.StatusCode)
	}
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = io.Copy(file, resp.Body)
	return err
}

// receiptExtractionConfig is an inline Extend extraction config: no extractor
// resource needs to be created ahead of time. It uses the extraction_light base
// processor with the parse_performance engine for low latency on simple receipts.
func receiptExtractionConfig() *extend.ExtractConfigJSON {
	currencyField := func(description string) map[string]any {
		return map[string]any{
			"type":        "object",
			"extend:type": "currency",
			"description": description,
			"required":    []any{"amount", "iso_4217_currency_code"},
			"properties": map[string]any{
				"amount":                 map[string]any{"type": []any{"number", "null"}},
				"iso_4217_currency_code": map[string]any{"type": []any{"string", "null"}},
			},
			"additionalProperties": false,
		}
	}

	return &extend.ExtractConfigJSON{
		BaseProcessor: extend.ExtractBaseProcessorExtractionLight.Ptr(),
		BaseVersion:   new("3.5.1"),
		ParseConfig: &extend.ParseConfig{
			Engine:        extend.ParseConfigEngineParsePerformance.Ptr(),
			EngineVersion: new("2.0.0"),
			Target:        extend.ParseConfigTargetMarkdown.Ptr(),
			BlockOptions: &extend.ParseConfigBlockOptions{
				Text: &extend.ParseConfigBlockOptionsText{
					Agentic:                   &extend.ParseConfigBlockOptionsTextAgentic{Enabled: new(false)},
					SignatureDetectionEnabled: new(false),
				},
				Tables: &extend.ParseConfigBlockOptionsTables{
					Agentic:                        &extend.ParseConfigBlockOptionsTablesAgentic{Enabled: new(false)},
					TargetFormat:                   extend.ParseConfigBlockOptionsTablesTargetFormatMarkdown.Ptr(),
					CellBlocksEnabled:              new(false),
					TableHeaderContinuationEnabled: new(false),
				},
				Figures: &extend.ParseConfigBlockOptionsFigures{
					Enabled:                    new(false),
					FigureImageClippingEnabled: new(false),
				},
			},
			AdvancedOptions: &extend.ParseConfigAdvancedOptions{
				PageRotationEnabled:       new(false),
				VerticalGroupingThreshold: new(1.0),
			},
			ChunkingStrategy: &extend.ParseConfigChunkingStrategy{
				Type: extend.ParseConfigChunkingStrategyTypeDocument.Ptr(),
			},
		},
		Schema: &extend.JSONObject{
			"type": "object",
			"required": []any{
				"vendor_name", "receipt_date", "receipt_number", "total_amount",
				"subtotal_amount", "tax_amount", "line_items", "payment_method",
			},
			"properties": map[string]any{
				"vendor_name": map[string]any{
					"type":        []any{"string", "null"},
					"description": "The name of the merchant or vendor on the receipt.",
				},
				"receipt_date": map[string]any{
					"type":        []any{"string", "null"},
					"description": "The date of the transaction shown on the receipt.",
					"extend:type": "date",
				},
				"receipt_number": map[string]any{
					"type":        []any{"string", "null"},
					"description": "The receipt or transaction number, if present.",
				},
				"total_amount":    currencyField("The total amount paid on the receipt."),
				"subtotal_amount": currencyField("The subtotal before tax, if shown."),
				"tax_amount":      currencyField("The tax amount on the receipt."),
				"line_items": map[string]any{
					"type":        "array",
					"description": "Individual items on the receipt.",
					"items": map[string]any{
						"type":     "object",
						"required": []any{"description", "quantity", "unit_price", "amount"},
						"properties": map[string]any{
							"description": map[string]any{
								"type":        []any{"string", "null"},
								"description": "Description of the item purchased.",
							},
							"quantity": map[string]any{
								"type":        []any{"number", "null"},
								"description": "Quantity of the item, if shown.",
							},
							"unit_price": map[string]any{
								"type":        []any{"number", "null"},
								"description": "Price per unit, if shown.",
							},
							"amount": map[string]any{
								"type":        []any{"number", "null"},
								"description": "Total amount for this line item.",
							},
						},
						"additionalProperties": false,
					},
				},
				"payment_method": map[string]any{
					"type":        []any{"string", "null"},
					"description": "The payment method used (e.g., cash, credit card, etc.).",
				},
			},
			"additionalProperties": false,
		},
		AdvancedOptions: &extend.ExtractAdvancedOptions{
			AdvancedMultimodalEnabled: new(false),
			CitationsEnabled:          new(true),
			ArrayCitationStrategy:     extend.ExtractAdvancedOptionsArrayCitationStrategyItem.Ptr(),
		},
	}
}

// namedReader gives the Extend multipart upload a clean filename instead of
// the local path an *os.File would report.
type namedReader struct {
	io.Reader
	name string
}

func (r namedReader) Name() string { return r.name }

type receiptResult struct {
	File  string `json:"file"`
	RunID string `json:"runId,omitempty"`
	Data  any    `json:"data"`
}

// parseReceiptsWithExtend uploads each receipt to Extend, runs extraction with
// the inline config, and writes the results as JSON and CSV.
func parseReceiptsWithExtend(ctx context.Context, filePaths []string) error {
	extendAPIKey := os.Getenv("EXTEND_API_KEY")
	if extendAPIKey == "" || extendAPIKey == "YOUR_EXTEND_API_KEY_HERE" {
		fmt.Println("\nWARNING: EXTEND_API_KEY not configured. Skipping receipt parsing.")
		fmt.Println("   Set EXTEND_API_KEY to enable automatic receipt parsing.")
		return nil
	}

	fmt.Println("\n=== Parsing Receipts with Extend AI ===")

	// The SDK retries 429s and 5xx errors with exponential backoff up to MaxAttempts.
	client := extendclient.NewClient(
		option.WithToken(extendAPIKey),
		option.WithMaxAttempts(5),
		option.WithHTTPClient(&http.Client{Timeout: 5 * time.Minute}),
	)
	config := receiptExtractionConfig()

	fmt.Printf("Processing %d receipts with inline config...\n\n", len(filePaths))

	results := make([]receiptResult, len(filePaths))
	processOne := func(i int, filePath string) {
		fileName := filepath.Base(filePath)
		run, err := extractReceipt(ctx, client, config, filePath)
		if err != nil {
			fmt.Printf("  Failed to parse %s: %v\n", fileName, err)
			results[i] = receiptResult{File: fileName, Data: map[string]string{"error": err.Error()}}
			return
		}
		fmt.Printf("  Parsed %s (run: %s)\n", fileName, run.ID)
		results[i] = receiptResult{File: fileName, RunID: run.ID, Data: run}
	}

	// Process in batches to balance speed and reliability.
	for start := 0; start < len(filePaths); start += extractBatchSize {
		end := min(start+extractBatchSize, len(filePaths))
		var wg sync.WaitGroup
		for i := start; i < end; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				processOne(i, filePaths[i])
			}(i)
		}
		wg.Wait()
	}

	if err := writeResultsJSON(results); err != nil {
		return err
	}
	return writeResultsCSV(results)
}

func extractReceipt(ctx context.Context, client *extendclient.Client, config *extend.ExtractConfigJSON, filePath string) (*extend.ExtractRun, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	uploaded, err := client.Files.Upload(ctx, namedReader{Reader: file, name: filepath.Base(filePath)}, &extend.FilesUploadRequest{})
	if err != nil {
		return nil, fmt.Errorf("upload: %w", err)
	}

	// Extract runs synchronously against the inline config using the uploaded file ID.
	run, err := client.Extract(ctx, &extend.ExtractRequest{
		Config: config,
		File:   &extend.ExtractRequestFile{FileFromID: &extend.FileFromID{ID: uploaded.ID}},
	})
	if err != nil {
		return nil, fmt.Errorf("extract: %w", err)
	}
	if run.Status != extend.ProcessorRunStatusProcessed {
		msg := string(run.Status)
		if run.FailureMessage != nil {
			msg += ": " + *run.FailureMessage
		}
		return nil, fmt.Errorf("extraction did not complete (%s)", msg)
	}
	return run, nil
}

func writeResultsJSON(results []receiptResult) error {
	jsonPath := filepath.Join(resultsDir, "receipts.json")
	data, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(jsonPath, data, 0o644); err != nil {
		return err
	}
	fmt.Printf("\nSaved JSON: %s\n", jsonPath)
	return nil
}

func writeResultsCSV(results []receiptResult) error {
	csvPath := filepath.Join(resultsDir, "receipts.csv")
	file, err := os.Create(csvPath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	if err := writer.Write([]string{
		"file", "vendor_name", "receipt_date", "receipt_number", "total_amount",
		"currency", "subtotal", "tax", "payment_method", "line_items_count",
	}); err != nil {
		return err
	}

	for _, result := range results {
		output := extractedValue(result.Data)
		lineItems, _ := output["line_items"].([]any)
		row := []string{
			result.File,
			stringValue(output["vendor_name"]),
			stringValue(output["receipt_date"]),
			stringValue(output["receipt_number"]),
			stringValue(nested(output, "total_amount", "amount")),
			stringValue(nested(output, "total_amount", "iso_4217_currency_code")),
			stringValue(nested(output, "subtotal_amount", "amount")),
			stringValue(nested(output, "tax_amount", "amount")),
			stringValue(output["payment_method"]),
			fmt.Sprint(len(lineItems)),
		}
		if err := writer.Write(row); err != nil {
			return err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return err
	}
	fmt.Printf("Saved CSV:  %s\n", csvPath)
	return nil
}

// extractedValue returns the extracted field map from a successful run, or an
// empty map for failed results so CSV rows are still emitted.
func extractedValue(data any) map[string]any {
	run, ok := data.(*extend.ExtractRun)
	if !ok || run.Output == nil || run.Output.ExtractOutputJSON == nil {
		return map[string]any{}
	}
	return run.Output.ExtractOutputJSON.Value
}

func nested(m map[string]any, keys ...string) any {
	var current any = m
	for _, key := range keys {
		obj, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = obj[key]
	}
	return current
}

func stringValue(v any) string {
	if v == nil {
		return ""
	}
	return fmt.Sprint(v)
}
