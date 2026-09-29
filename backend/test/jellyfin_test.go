package test

import (
	"eylexander/bluraymanager/api"
	"testing"
)

func TestNormalizeJellyfinURL(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"", "", true},
		{"  ", "", true},
		{"https://jellyfin.example.com/", "https://jellyfin.example.com", true},
		{" http://192.168.1.10:8096 ", "http://192.168.1.10:8096", true},
		{"https://example.com/jellyfin//", "https://example.com/jellyfin", true},
		{"https://jf.example.com/web/", "https://jf.example.com", true},
		{"jellyfin.local:8096", "", false},
		{"javascript:alert(1)", "", false},
		{"ftp://example.com", "", false},
	}
	for _, c := range cases {
		got, ok := api.NormalizeJellyfinURL(c.in)
		if got != c.want || ok != c.ok {
			t.Errorf("NormalizeJellyfinURL(%q) = %q, %v; want %q, %v", c.in, got, ok, c.want, c.ok)
		}
	}
}
