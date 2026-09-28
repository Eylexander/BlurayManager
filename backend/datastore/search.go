package datastore

import (
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SearchFilter struct {
	Field string
	Value string
}

// searchFields are the recognised "field:value" prefixes. Values of the
// multi-word fields run until the next recognised prefix, so
// "director:David Yates" searches for the full name.
var searchFields = map[string]bool{
	"title":       true,
	"director":    true,
	"tag":         true,
	"genre":       true,
	"description": true,
	"year":        false, // single-word values
	"type":        false,
}

// parseSearchQuery splits a query such as `director:David Yates year:2011 potter`
// into field filters and the remaining free text.
func parseSearchQuery(query string) (filters []SearchFilter, freeText string) {
	var free []string
	var current *SearchFilter
	var currentWords []string

	flush := func() {
		if current != nil {
			current.Value = strings.Trim(strings.Join(currentWords, " "), `"`)
			if current.Value != "" {
				filters = append(filters, *current)
			}
		}
		current, currentWords = nil, nil
	}

	for _, word := range strings.Fields(query) {
		if field, value, ok := strings.Cut(word, ":"); ok {
			if _, known := searchFields[strings.ToLower(field)]; known {
				flush()
				current = &SearchFilter{Field: strings.ToLower(field)}
				if value != "" {
					currentWords = append(currentWords, value)
				}
				continue
			}
		}

		switch {
		case current == nil:
			free = append(free, word)
		case !searchFields[current.Field] && len(currentWords) > 0:
			// year/type already have their single word; the rest is free text
			free = append(free, word)
		default:
			currentWords = append(currentWords, word)
		}
	}
	flush()

	return filters, strings.Trim(strings.Join(free, " "), `"`)
}

// containsPattern matches s literally (case-insensitive) anywhere in a field.
// User input is escaped so characters like "." or "(" aren't treated as regex.
func containsPattern(s string) primitive.Regex {
	return primitive.Regex{Pattern: regexp.QuoteMeta(s), Options: "i"}
}
