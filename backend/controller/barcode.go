package controller

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
)

// DVDFrResponse represents the XML response from DVDFr API
type DVDFrResponse struct {
	XMLName   xml.Name `xml:"dvds"`
	Generator string   `xml:"generator,attr"`
	DVDs      []DVD    `xml:"dvd"`
}

type DVD struct {
	ID      string `xml:"id"`
	Media   string `xml:"media"`
	Cover   string `xml:"cover"`
	Titres  Titles `xml:"titres"`
	Annee   string `xml:"annee"`
	Edition string `xml:"edition"`
	Editeur string `xml:"editeur"`
	Stars   []Star `xml:"stars>star"`
}

type Titles struct {
	FR           string `xml:"fr"`
	VO           string `xml:"vo"`
	Alternatif   string `xml:"alternatif"`
	AlternatifVO string `xml:"alternatif_vo"`
}

type Star struct {
	Type string `xml:"type,attr"`
	ID   string `xml:"id,attr"`
	Name string `xml:",chardata"`
}

// DVDFrError represents error response from DVDFr API
type DVDFrError struct {
	XMLName xml.Name `xml:"errors"`
	Errors  []Error  `xml:"error"`
}

type Error struct {
	Type    string `xml:"type,attr"`
	Code    string `xml:"code"`
	Message string `xml:"message"`
}

// BarcodeItem represents a standardized barcode lookup result
type BarcodeItem struct {
	Title     string   `json:"title"`
	Year      string   `json:"year,omitempty"`
	Media     string   `json:"media,omitempty"`
	Edition   string   `json:"edition,omitempty"`
	Cover     string   `json:"cover,omitempty"`
	Publisher string   `json:"publisher,omitempty"`
	Directors []string `json:"directors,omitempty"`
	DVDFrID   string   `json:"dvdfr_id,omitempty"`
}

// LookupBarcode performs barcode lookup using DVDFr API
func (c *Controller) LookupBarcode(ctx context.Context, barcode string) ([]BarcodeItem, error) {
	// Call DVDFr API with barcode (gencode parameter)
	// Use BRD for Blu-ray filtering
	url := fmt.Sprintf("http://www.dvdfr.com/api/search.php?gencode=%s", barcode)

	// Create HTTP client with custom User-Agent (required by DVDFr)
	client := &http.Client{}
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "BlurayManager/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup barcode: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Try to parse as error first
	var errorResult DVDFrError
	if err := xml.Unmarshal(body, &errorResult); err == nil && len(errorResult.Errors) > 0 {
		return nil, fmt.Errorf("DVDFr API error: %s (code: %s)", errorResult.Errors[0].Message, errorResult.Errors[0].Code)
	}

	// Parse the response as DVDFr result
	var result DVDFrResponse
	if err := xml.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Convert DVDFr DVDs to standardized items
	items := make([]BarcodeItem, 0, len(result.DVDs))
	for _, dvd := range result.DVDs {
		// Prefer original title (VO), fallback to French title
		title := dvd.Titres.VO
		if title == "" {
			title = dvd.Titres.FR
		}

		// Extract director names
		directors := make([]string, 0)
		for _, star := range dvd.Stars {
			if star.Type == "Réalisateur" {
				directors = append(directors, star.Name)
			}
		}

		item := BarcodeItem{
			Title:     title,
			Year:      dvd.Annee,
			Media:     dvd.Media,
			Edition:   dvd.Edition,
			Cover:     dvd.Cover,
			Publisher: dvd.Editeur,
			Directors: directors,
			DVDFrID:   dvd.ID,
		}

		items = append(items, item)
	}

	return items, nil
}
