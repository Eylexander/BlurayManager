package test

import (
	"context"
	"errors"
	"eylexander/bluraymanager/controller"
	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/models"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRateLimiterWindow(t *testing.T) {
	rl := controller.NewRateLimiter(2, time.Minute)
	now := time.Now()

	for i := range 2 {
		if !rl.Allow("1.2.3.4", now) {
			t.Fatalf("request %d should pass", i+1)
		}
	}
	if rl.Allow("1.2.3.4", now) {
		t.Fatal("third request inside the window should be rejected")
	}
	if !rl.Allow("5.6.7.8", now) {
		t.Fatal("limits must be tracked per IP")
	}
	if !rl.Allow("1.2.3.4", now.Add(2*time.Minute)) {
		t.Fatal("the counter should reset once the window has passed")
	}
	if rl.Size() != 1 {
		t.Fatalf("expired visitors should be swept, have %d", rl.Size())
	}
}

func TestDenyRole(t *testing.T) {
	c := &controller.Controller{}
	for _, tc := range []struct {
		role models.UserRole
		want int
	}{
		{models.RoleGuest, http.StatusForbidden},
		{models.RoleUser, http.StatusOK},
		{models.RoleAdmin, http.StatusOK},
	} {
		r := gin.New()
		r.GET("/", func(ctx *gin.Context) { ctx.Set("role", tc.role) }, c.DenyRole(models.RoleGuest), func(ctx *gin.Context) {
			ctx.Status(http.StatusOK)
		})

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
		if w.Code != tc.want {
			t.Errorf("role %q: got %d, want %d", tc.role, w.Code, tc.want)
		}
	}
}

func TestCORSMiddleware(t *testing.T) {
	c := &controller.Controller{}
	serve := func(allowed []string, origin string) *httptest.ResponseRecorder {
		r := gin.New()
		r.Use(c.CORSMiddleware(allowed))
		r.GET("/", func(ctx *gin.Context) { ctx.Status(http.StatusOK) })
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	if got := serve(nil, "https://any.example").Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("no allow-list: got %q, want *", got)
	}
	allowed := []string{"https://bluray.example"}
	if got := serve(allowed, "https://bluray.example").Header().Get("Access-Control-Allow-Origin"); got != "https://bluray.example" {
		t.Errorf("allowed origin: got %q", got)
	}
	if got := serve(allowed, "https://evil.example").Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("disallowed origin should get no CORS header, got %q", got)
	}
}

// userStore is a Datastore stub serving a single user; any other method panics.
type userStore struct {
	datastore.Datastore
	user *models.User
	err  error
}

func (s userStore) GetUserByID(_ context.Context, id primitive.ObjectID) (*models.User, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.user == nil || s.user.ID != id {
		return nil, datastore.ErrUserNotFound
	}
	return s.user, nil
}

func TestAuthMiddlewareUsesCurrentRole(t *testing.T) {
	user := &models.User{ID: primitive.NewObjectID(), Username: "eylexander", Role: models.RoleUser}
	signer := controller.NewController(nil, "test-secret")
	token, err := signer.GenerateToken(user) // token claims role "user"
	if err != nil {
		t.Fatal(err)
	}

	serve := func(store datastore.Datastore) int {
		c := controller.NewController(store, "test-secret")
		r := gin.New()
		r.GET("/admin", c.AuthMiddleware(), c.RequireRole(models.RoleAdmin), func(ctx *gin.Context) {
			ctx.Status(http.StatusOK)
		})
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Code
	}

	promoted := *user
	promoted.Role = models.RoleAdmin
	if got := serve(userStore{user: &promoted}); got != http.StatusOK {
		t.Errorf("user promoted after login: got %d, want 200", got)
	}
	if got := serve(userStore{user: user}); got != http.StatusForbidden {
		t.Errorf("non-admin: got %d, want 403", got)
	}
	if got := serve(userStore{}); got != http.StatusUnauthorized {
		t.Errorf("deleted user: got %d, want 401", got)
	}
	if got := serve(userStore{err: errors.New("connection refused")}); got != http.StatusInternalServerError {
		t.Errorf("database outage must not look like a logout: got %d, want 500", got)
	}
}
