package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/server"

	"github.com/joho/godotenv"
)

// getEnv returns the first non-empty value among the given variables, or fallback.
func getEnv(fallback string, keys ...string) string {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, item := range strings.Split(s, ",") {
		if item = strings.TrimSpace(item); item != "" {
			out = append(out, item)
		}
	}
	return out
}

// healthcheck probes the local /api/health endpoint. The runtime image is
// distroless (no shell, curl or wget), so container healthchecks run the
// server binary itself: `bluray-server healthcheck`.
func healthcheck() int {
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:" + getEnv("8080", "PORT") + "/api/health")
	if err != nil {
		log.Printf("healthcheck: %v", err)
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("healthcheck: status %d", resp.StatusCode)
		return 1
	}
	return 0
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	mongoURI := getEnv("mongodb://localhost:27017", "MONGODB_URI")
	// DB_NAME is the documented name; DATABASE_NAME is kept for older setups.
	dbName := getEnv("bluray_manager", "DB_NAME", "DATABASE_NAME")

	cfg := server.Config{
		Port:           getEnv("8080", "PORT"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		AppURL:         os.Getenv("APP_URL"),
		AllowedOrigins: splitList(os.Getenv("CORS_ALLOWED_ORIGINS")),
	}
	// Refuse to start rather than sign tokens with a guessable default.
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET must be set")
	}
	if cfg.AppURL == "" {
		log.Println("Warning: APP_URL is not set; password reset links will use the request's Origin header")
	}

	// Initialize MongoDB datastore
	connectCtx, cancelConnect := context.WithTimeout(context.Background(), 10*time.Second)
	ds, err := datastore.NewMongoDatastore(connectCtx, mongoURI, dbName)
	cancelConnect()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	log.Println("Successfully connected to MongoDB")

	// Initialize guest user
	created, err := ds.EnsureGuestUser(context.Background())
	if err != nil {
		log.Printf("Warning: Failed to create guest user: %v", err)
	} else if created {
		log.Println("Guest user initialized")
	}

	srv := server.NewServer(ds, cfg)

	serveErr := make(chan error, 1)
	go func() {
		log.Printf("Bluray Manager Server starting on port %s...", cfg.Port)
		serveErr <- srv.Start()
	}()

	stop, cancelSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancelSignals()

	select {
	case err := <-serveErr:
		if err != nil {
			log.Printf("Server error: %v", err)
		}
	case <-stop.Done():
		log.Println("Shutting down...")
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	if err := ds.Close(shutdownCtx); err != nil {
		log.Printf("MongoDB disconnect error: %v", err)
	}
}
