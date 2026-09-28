package test

import (
	"eylexander/bluraymanager/i18n"
	"testing"
)

// Every message key must exist in every language, or users of that language
// see the raw key instead of a sentence.
func TestMessagesHaveSameKeys(t *testing.T) {
	const reference = "en-US"
	for lang, messages := range i18n.Messages {
		for key := range i18n.Messages[reference] {
			if _, ok := messages[key]; !ok {
				t.Errorf("%s is missing key %q", lang, key)
			}
		}
		for key := range messages {
			if _, ok := i18n.Messages[reference][key]; !ok {
				t.Errorf("%s has key %q that %s lacks", lang, key, reference)
			}
		}
	}
}
