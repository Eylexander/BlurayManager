package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/server"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Get configuration from environment
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("DATABASE_NAME")
	if dbName == "" {
		dbName = "bluray_manager"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize MongoDB datastore
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ds, err := datastore.NewMongoDatastore(ctx, mongoURI, dbName)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer ds.Close(context.Background())

	log.Println("Successfully connected to MongoDB")

	// Initialize guest user
	created, err := ds.EnsureGuestUser(context.Background())
	if err != nil {
		log.Printf("Warning: Failed to create guest user: %v", err)
	} else if created {
		log.Println("Guest user initialized")
	}

	// Initialize and start server
	srv := server.NewServer(ds)

	fmt.Printf("Bluray Manager Server starting on port %s...\n", port)
	if err := srv.Start(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
