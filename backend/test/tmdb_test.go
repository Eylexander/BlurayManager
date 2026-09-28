package test

import (
	"context"
	"errors"
	"eylexander/bluraymanager/api"
	"eylexander/bluraymanager/controller"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestFetchTMDBStatusError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	_, err := (&api.API{}).FetchTMDB(context.Background(), srv.URL+"/search/movie?api_key=secret")
	var statusErr *api.TMDBStatusError
	if !errors.As(err, &statusErr) || statusErr.Status != http.StatusUnauthorized {
		t.Fatalf("want a 401 tmdbStatusError, got %v", err)
	}
}

func TestFetchTMDBRedactsAPIKey(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	srv.Close() // connection refused

	_, err := (&api.API{}).FetchTMDB(context.Background(), srv.URL+"/search/movie?api_key=super-secret")
	if err == nil {
		t.Fatal("expected a connection error")
	}
	if strings.Contains(err.Error(), "super-secret") {
		t.Fatalf("error leaks the API key: %v", err)
	}
}

func TestTMDBFailureInvalidKeyMessage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	a := api.NewAPI(controller.NewController(nil, "x"))
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/tmdb/search", nil)

	a.TMDBFailure(c, "tmdb.failedToSearch", &api.TMDBStatusError{Status: http.StatusUnauthorized})

	if w.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", w.Code)
	}
	if !strings.Contains(w.Body.String(), "TMDB_API_KEY") {
		t.Errorf("a rejected key should explain how to fix it, got %s", w.Body.String())
	}
}
