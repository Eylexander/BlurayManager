package i18n

import "testing"

// Every message key must exist in every language, or users of that language
// see the raw key instead of a sentence.
func TestMessagesHaveSameKeys(t *testing.T) {
	const reference = "en-US"
	for lang, messages := range Messages {
		for key := range Messages[reference] {
			if _, ok := messages[key]; !ok {
				t.Errorf("%s is missing key %q", lang, key)
			}
		}
		for key := range messages {
			if _, ok := Messages[reference][key]; !ok {
				t.Errorf("%s has key %q that %s lacks", lang, key, reference)
			}
		}
	}
}
