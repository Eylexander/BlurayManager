package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	neturl "net/url"
	"time"
)

// UPCItemDBURL is the UPCitemdb lookup endpoint. The keyless trial tier
// allows 100 lookups a day, plenty for a personal collection. DVDFr, used
// before, shut its API down in 2026. Exported so tests can point it at a stub.
var UPCItemDBURL = "https://api.upcitemdb.com/prod/trial/lookup"

// BarcodeItem is a product found for a barcode. Its title is the retail
// listing ("Inception (Blu-ray) [Blu-ray]"), cleaned up by the frontend
// before searching TMDB.
type BarcodeItem struct {
	Title string `json:"title"`
}

type upcItemDBResponse struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Items   []BarcodeItem `json:"items"`
}

// ErrBarcodeRateLimited means too many lookups in a short time; retrying
// after a few seconds works. The daily quota is a different, final error.
var ErrBarcodeRateLimited = errors.New("barcode lookup rate limited, retry shortly")

// barcodeClient keeps a slow or unreachable UPCitemdb from hanging the scan.
var barcodeClient = &http.Client{Timeout: 10 * time.Second}

// LookupBarcode returns the products matching an EAN/UPC barcode. An unknown
// barcode is an empty list, not an error.
func (c *Controller) LookupBarcode(ctx context.Context, barcode string) ([]BarcodeItem, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, UPCItemDBURL+"?upc="+neturl.QueryEscape(barcode), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := barcodeClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup barcode: %w", err)
	}
	defer resp.Body.Close()

	// Errors (invalid code, rate limit) come back as JSON too, with a code.
	var result upcItemDBResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse response (status %d): %w", resp.StatusCode, err)
	}
	if result.Code == "TOO_FAST" {
		return nil, ErrBarcodeRateLimited
	}
	if result.Code != "OK" {
		return nil, fmt.Errorf("barcode lookup failed: %s (%s)", result.Message, result.Code)
	}
	if result.Items == nil {
		result.Items = []BarcodeItem{}
	}
	return result.Items, nil
}
