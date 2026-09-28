package test

import (
	"eylexander/bluraymanager/datastore"
	"reflect"
	"regexp"
	"testing"
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
