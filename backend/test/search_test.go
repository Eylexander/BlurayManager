package datastore

import (
	"reflect"
	"regexp"
	"testing"
)

func TestParseSearchQuery(t *testing.T) {
	tests := []struct {
		query   string
		filters []SearchFilter
		free    string
	}{
		{"director:David Yates", []SearchFilter{{"director", "David Yates"}}, ""},
		{`director:"David Yates"`, []SearchFilter{{"director", "David Yates"}}, ""},
		{"director: David Yates", []SearchFilter{{"director", "David Yates"}}, ""},
		{"director:nolan title:the dark knight", []SearchFilter{{"director", "nolan"}, {"title", "the dark knight"}}, ""},
		{"Director:Nolan", []SearchFilter{{"director", "Nolan"}}, ""},
		// "Mission:" isn't a filter name, so the colon stays part of the title
		{"title:Mission: Impossible", []SearchFilter{{"title", "Mission: Impossible"}}, ""},
		{"Mission: Impossible", nil, "Mission: Impossible"},
		// year/type take a single word; what follows is free text
		{"year:2011 potter", []SearchFilter{{"year", "2011"}}, "potter"},
		{"harry potter type:movie", []SearchFilter{{"type", "movie"}}, "harry potter"},
		{"inception", nil, "inception"},
		{"director:", nil, ""},
		{"", nil, ""},
	}

	for _, tc := range tests {
		filters, free := parseSearchQuery(tc.query)
		if !reflect.DeepEqual(filters, tc.filters) || free != tc.free {
			t.Errorf("parseSearchQuery(%q) = %v, %q; want %v, %q", tc.query, filters, free, tc.filters, tc.free)
		}
	}
}

func TestContainsPatternIsLiteral(t *testing.T) {
	re := regexp.MustCompile("(?i)" + containsPattern("J.J. Abrams (2009)").Pattern)
	if !re.MatchString("directed by j.j. abrams (2009)") {
		t.Error("should match the literal text, case-insensitively")
	}
	if re.MatchString("JaJa Abrams 2009") {
		t.Error("regex metacharacters in user input must be escaped")
	}
}
