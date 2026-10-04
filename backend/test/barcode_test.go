package test

import (
	"context"
	"errors"
	"eylexander/bluraymanager/controller"
	"net/http"
	"net/http/httptest"
	"testing"
)

func stubUPCItemDB(t *testing.T, status int, body string) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("upc") == "" {
			t.Errorf("upc query param missing: %s", r.URL)
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	old := controller.UPCItemDBURL
	controller.UPCItemDBURL = srv.URL
	t.Cleanup(func() { controller.UPCItemDBURL = old })
}

func TestLookupBarcode(t *testing.T) {
	ctrl := &controller.Controller{}

	stubUPCItemDB(t, http.StatusOK, `{"code":"OK","total":1,"items":[{"ean":"0883929106646","title":"Inception (Blu-ray) [Blu-ray]","brand":"Warner Bros."}]}`)
	items, err := ctrl.LookupBarcode(context.Background(), "883929106646")
	if err != nil || len(items) != 1 || items[0].Title != "Inception (Blu-ray) [Blu-ray]" {
		t.Fatalf("found: items=%v err=%v", items, err)
	}

	stubUPCItemDB(t, http.StatusOK, `{"code":"OK","total":0,"items":[]}`)
	items, err = ctrl.LookupBarcode(context.Background(), "0000000000000")
	if err != nil || items == nil || len(items) != 0 {
		t.Fatalf("unknown barcode should be an empty list: items=%v err=%v", items, err)
	}

	stubUPCItemDB(t, http.StatusTooManyRequests, `{"code":"TOO_FAST","message":"Please slow down!"}`)
	if _, err = ctrl.LookupBarcode(context.Background(), "883929106646"); !errors.Is(err, controller.ErrBarcodeRateLimited) {
		t.Fatalf("rate limit should surface as an error, got %v", err)
	}

	stubUPCItemDB(t, http.StatusOK, `<html>moved</html>`)
	if _, err = ctrl.LookupBarcode(context.Background(), "883929106646"); err == nil {
		t.Fatal("an HTML page should be an error")
	}
}
