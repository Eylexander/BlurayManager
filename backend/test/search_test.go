package test

import (
	"eylexander/bluraymanager/datastore"
	"reflect"
	"regexp"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

func TestParseSearchQuery(t *testing.T) {
	tests := []struct {
		query   string
		filters []datastore.SearchFilter
		free    string
	}{
		{"director:David Yates", []datastore.SearchFilter{{Field: "director", Value: "David Yates"}}, ""},
		{`director:"David Yates"`, []datastore.SearchFilter{{Field: "director", Value: "David Yates"}}, ""},
		{"director: David Yates", []datastore.SearchFilter{{Field: "director", Value: "David Yates"}}, ""},
		{"director:nolan title:the dark knight", []datastore.SearchFilter{{Field: "director", Value: "nolan"}, {Field: "title", Value: "the dark knight"}}, ""},
		{"Director:Nolan", []datastore.SearchFilter{{Field: "director", Value: "Nolan"}}, ""},
		// "Mission:" isn't a filter name, so the colon stays part of the title
		{"title:Mission: Impossible", []datastore.SearchFilter{{Field: "title", Value: "Mission: Impossible"}}, ""},
		{"Mission: Impossible", nil, "Mission: Impossible"},
		// year/type take a single word; what follows is free text
		{"year:2011 potter", []datastore.SearchFilter{{Field: "year", Value: "2011"}}, "potter"},
		{"harry potter type:movie", []datastore.SearchFilter{{Field: "type", Value: "movie"}}, "harry potter"},
		{"inception", nil, "inception"},
		{"director:", nil, ""},
		{"", nil, ""},
	}

	for _, tc := range tests {
		filters, free := datastore.ParseSearchQuery(tc.query)
		if !reflect.DeepEqual(filters, tc.filters) || free != tc.free {
			t.Errorf("datastore.ParseSearchQuery(%q) = %v, %q; want %v, %q", tc.query, filters, free, tc.filters, tc.free)
		}
	}
}

func TestContainsPatternIsLiteral(t *testing.T) {
	re := regexp.MustCompile("(?i)" + datastore.ContainsPattern("J.J. Abrams (2009)").Pattern)
	if !re.MatchString("directed by j.j. abrams (2009)") {
		t.Error("should match the literal text, case-insensitively")
	}
	if re.MatchString("JaJa Abrams 2009") {
		t.Error("regex metacharacters in user input must be escaped")
	}
}

// Every order must end on _id: without a tiebreaker, rows with equal sort
// values repeat or go missing between pages.
func TestSimplifiedSortIsStable(t *testing.T) {
	for _, sortBy := range []string{"", "recent", "name", "release_date", "rating", "bogus"} {
		stages := datastore.SimplifiedSort(sortBy, "fr-FR")
		keys, ok := stages[len(stages)-1]["$sort"].(bson.D)
		if !ok || len(keys) != 2 || keys[1].Key != "_id" {
			t.Errorf("SimplifiedSort(%q) = %v; want a $sort ending on _id", sortBy, stages)
		}
	}
	// Name order uses the title as displayed, in a supported language only.
	shown := datastore.SimplifiedSort("name", "de-DE")[0]["$addFields"].(bson.M)["sort_title"].(bson.M)["$toLower"].(bson.M)["$ifNull"].(bson.A)
	if shown[0] != "$titles.en-US" || shown[1] != "$title" {
		t.Errorf("name sort reads %v; want $titles.en-US then $title", shown)
	}
}
