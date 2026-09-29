package test

import (
	"bytes"
	"eylexander/bluraymanager/api"
	"eylexander/bluraymanager/models"
	"reflect"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestCSVRoundTrip(t *testing.T) {
	in := []*models.Bluray{
		{
			Title:         `Crouching Tiger, "Hidden" Dragon`,
			Type:          models.MediaTypeMovie,
			Genre:         models.I18nTextArray{En: []string{"Action", "Drama"}, Fr: []string{"Action", "Drame"}},
			Description:   models.I18nText{En: "Line one\nline two", Fr: "Été, à la plage"},
			Director:      "Ang Lee",
			ReleaseYear:   2000,
			Runtime:       120,
			Rating:        7.9,
			PurchasePrice: 14.99,
			PurchaseDate:  time.Date(2024, 3, 15, 0, 0, 0, 0, time.UTC),
			TMDBID:        "146",
			Tags:          []string{"Steelbook, limited", "4K"},
		},
		{
			Title:         "Dark",
			Type:          models.MediaTypeSeries,
			Seasons:       []models.Season{{Number: 1, EpisodeCount: 10, Year: 2017}, {Number: 2, EpisodeCount: 8}},
			TotalEpisodes: 18,
		},
	}

	var buf bytes.Buffer
	if err := api.WriteBluraysCSV(&buf, in); err != nil {
		t.Fatalf("write: %v", err)
	}
	if !strings.HasPrefix(buf.String(), api.UTF8BOM) {
		t.Fatal("export is missing the UTF-8 BOM")
	}

	records, err := api.ReadBluraysCSV(&buf)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if len(records) != len(in) {
		t.Fatalf("got %d records, want %d", len(records), len(in))
	}

	for i, rec := range records {
		got, err := api.RecordToBluray(rec)
		if err != nil {
			t.Fatalf("record %d: %v", i, err)
		}
		if !reflect.DeepEqual(got, in[i]) {
			t.Errorf("record %d mismatch:\n got  %+v\n want %+v", i, got, in[i])
		}
	}
}

func TestCSVExportDerivesTotalEpisodes(t *testing.T) {
	// Blurays saved before total_episodes was persisted only have seasons
	in := []*models.Bluray{{
		Title:   "Dark",
		Type:    models.MediaTypeSeries,
		Seasons: []models.Season{{Number: 1, EpisodeCount: 10}, {Number: 2, EpisodeCount: 8}},
	}}

	var buf bytes.Buffer
	if err := api.WriteBluraysCSV(&buf, in); err != nil {
		t.Fatalf("write: %v", err)
	}
	records, err := api.ReadBluraysCSV(&buf)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if got := records[0][len(api.CSVHeader)-1]; got != "18" {
		t.Errorf("TotalEpisodes = %q, want %q", got, "18")
	}
}

func TestRecordToBlurayShortRow(t *testing.T) {
	if _, err := api.RecordToBluray([]string{"Only a title"}); err == nil {
		t.Fatal("expected an error for a row with missing columns")
	}
}

func TestReadBluraysCSVEmpty(t *testing.T) {
	if _, err := api.ReadBluraysCSV(strings.NewReader(strings.Join(api.CSVHeader, ",") + "\n")); err == nil {
		t.Fatal("expected an error for a header-only file")
	}
}

func TestTagResolver(t *testing.T) {
	fourK := &models.Tag{ID: primitive.NewObjectID(), Name: "4K"}
	steel := &models.Tag{ID: primitive.NewObjectID(), Name: "Steelbook"}
	r := api.NewTagResolver([]*models.Tag{fourK, steel})

	// Export: IDs become names; IDs of deleted tags are dropped
	if got := r.Names([]string{steel.ID.Hex(), primitive.NewObjectID().Hex()}); !reflect.DeepEqual(got, []string{"Steelbook"}) {
		t.Errorf("names = %v", got)
	}

	// Import: names (any case) and legacy IDs resolve; unknown names are reported once
	ids, missing := r.Resolve([]string{"4k", steel.ID.Hex(), "Criterion", "criterion", " ", "4K"})
	if want := []string{fourK.ID.Hex(), steel.ID.Hex()}; !reflect.DeepEqual(ids, want) {
		t.Errorf("ids = %v, want %v", ids, want)
	}
	if !reflect.DeepEqual(missing, []string{"Criterion"}) {
		t.Errorf("missing = %v", missing)
	}
}
