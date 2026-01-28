package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MediaType defines the type of bluray media
type MediaType string

const (
	MediaTypeMovie  MediaType = "movie"
	MediaTypeSeries MediaType = "series"
)

// I18nText represents text in multiple languages
type I18nText struct {
	En string `bson:"en,omitempty" json:"en,omitempty"`
	Fr string `bson:"fr,omitempty" json:"fr,omitempty"`
}

// Bluray represents a physical bluray in the collection
type Bluray struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title string             `bson:"title" json:"title" binding:"required"`
	Type  MediaType          `bson:"type" json:"type" binding:"required"`

	// For movies
	ReleaseYear int    `bson:"release_year,omitempty" json:"release_year,omitempty"`
	Director    string `bson:"director,omitempty" json:"director,omitempty"`
	Runtime     int    `bson:"runtime,omitempty" json:"runtime,omitempty"` // in minutes

	// For series
	Seasons       []Season `bson:"seasons,omitempty" json:"seasons,omitempty"`
	TotalEpisodes int      `bson:"total_episodes,omitempty" json:"total_episodes,omitempty"`

	// Common fields
	Description   I18nText  `bson:"description" json:"description"`
	Genre         []string  `bson:"genre" json:"genre"`
	CoverImageURL string    `bson:"cover_image_url" json:"cover_image_url"`
	BackdropURL   string    `bson:"backdrop_url" json:"backdrop_url"`
	PurchasePrice float64   `bson:"purchase_price" json:"purchase_price"`
	PurchaseDate  time.Time `bson:"purchase_date" json:"purchase_date"`
	Location      string    `bson:"location" json:"location"` // Physical location in storage
	Tags          []string  `bson:"tags" json:"tags"`
	Rating        float64   `bson:"rating" json:"rating"` // Personal rating

	// External IDs
	TMDBID string `bson:"tmdb_id,omitempty" json:"tmdb_id,omitempty"`
	IMDBID string `bson:"imdb_id,omitempty" json:"imdb_id,omitempty"`

	// Metadata
	AddedBy   primitive.ObjectID `bson:"added_by" json:"added_by"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// SimplifiedBluray is a simplified version of Bluray for listings
type SimplifiedBluray struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title string             `bson:"title" json:"title" binding:"required"`
	Type  MediaType          `bson:"type" json:"type" binding:"required"`

	// For movies
	ReleaseYear int    `bson:"release_year,omitempty" json:"release_year,omitempty"`
	Director    string `bson:"director,omitempty" json:"director,omitempty"`

	// For series
	Seasons       []Season `bson:"seasons,omitempty" json:"seasons,omitempty"`
	TotalEpisodes int      `bson:"total_episodes,omitempty" json:"total_episodes,omitempty"`

	// Common fields
	Genre         []string `bson:"genre" json:"genre"`
	CoverImageURL string   `bson:"cover_image_url" json:"cover_image_url"`
	BackdropURL   string   `bson:"backdrop_url" json:"backdrop_url"`
	Rating        float64  `bson:"rating" json:"rating"`
}

// Season represents a season in a series
type Season struct {
	Number       int      `bson:"number" json:"number"`
	EpisodeCount int      `bson:"episode_count" json:"episode_count"`
	Year         int      `bson:"year,omitempty" json:"year,omitempty"`
	Description  I18nText `bson:"description,omitempty" json:"description,omitempty"`
}

// CreateBlurayRequest is the request body for creating a bluray
type CreateBlurayRequest struct {
	Title         string    `json:"title" binding:"required"`
	Type          MediaType `json:"type" binding:"required"`
	ReleaseYear   int       `json:"release_year,omitempty"`
	Director      string    `json:"director,omitempty"`
	Runtime       int       `json:"runtime,omitempty"`
	Seasons       []Season  `json:"seasons,omitempty"`
	Description   I18nText  `json:"description"`
	Genre         []string  `json:"genre"`
	CoverImageURL string    `json:"cover_image_url"`
	BackdropURL   string    `json:"backdrop_url"`
	PurchasePrice float64   `json:"purchase_price"`
	PurchaseDate  time.Time `json:"purchase_date"`
	Location      string    `json:"location"`
	Tags          []string  `json:"tags"`
	Rating        float64   `json:"rating"`
	TMDBID        string    `json:"tmdb_id,omitempty"`
	IMDBID        string    `json:"imdb_id,omitempty"`
}

// UpdateBlurayRequest is the request body for updating a bluray
type UpdateBlurayRequest struct {
	Title         *string    `json:"title,omitempty"`
	Type          *MediaType `json:"type,omitempty"`
	ReleaseYear   *int       `json:"release_year,omitempty"`
	Director      *string    `json:"director,omitempty"`
	Runtime       *int       `json:"runtime,omitempty"`
	Seasons       *[]Season  `json:"seasons,omitempty"`
	Description   *I18nText  `json:"description,omitempty"`
	Genre         *[]string  `json:"genre,omitempty"`
	CoverImageURL *string    `json:"cover_image_url,omitempty"`
	BackdropURL   *string    `json:"backdrop_url,omitempty"`
	PurchasePrice *float64   `json:"purchase_price,omitempty"`
	PurchaseDate  *time.Time `json:"purchase_date,omitempty"`
	Location      *string    `json:"location,omitempty"`
	Tags          *[]string  `json:"tags,omitempty"`
	Rating        *float64   `json:"rating,omitempty"`
	TMDBID        *string    `json:"tmdb_id,omitempty"`
	IMDBID        *string    `json:"imdb_id,omitempty"`
}
