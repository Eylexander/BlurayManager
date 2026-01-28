package models

// Statistics represents collection statistics
type Statistics struct {
	TotalBlurays         int            `json:"total_blurays"`
	TotalMovies          int            `json:"total_movies"`
	TotalSeries          int            `json:"total_series"`
	TotalSeasons         int            `json:"total_seasons"`
	TotalEpisodes        int            `json:"total_episodes"`
	TotalSpent           float64        `json:"total_spent"`
	AveragePrice         float64        `json:"average_price"`
	PhysicalVolumeLiters float64        `json:"physical_volume_liters"`
	PhysicalStorageGB    float64        `json:"physical_storage_gb"`
	TotalRuntimeMinutes  int            `json:"total_runtime_minutes"`
	MostExpensive        *BlurayStats   `json:"most_expensive"`
	OldestBluray         *BlurayStats   `json:"oldest_bluray"`
	NewestBluray         *BlurayStats   `json:"newest_bluray"`
	GenreDistribution    map[string]int `json:"genre_distribution"`
	TagDistribution      map[string]int `json:"tag_distribution"`
	YearDistribution     map[int]int    `json:"year_distribution"`
	AverageRating        float64        `json:"average_rating"`
	TopRated             []BlurayStats  `json:"top_rated"`
}

type SimplifiedStatistics struct {
	TotalBlurays int `json:"total_blurays"`
	TotalMovies  int `json:"total_movies"`
	TotalSeries  int `json:"total_series"`
	TotalSeasons int `json:"total_seasons"`
}

// BlurayStats is a simplified bluray info for statistics
type BlurayStats struct {
	ID            string  `json:"id"`
	Title         string  `json:"title"`
	Type          string  `json:"type"`
	PurchasePrice float64 `json:"purchase_price,omitempty"`
	ReleaseYear   int     `json:"release_year,omitempty"`
	Rating        float64 `json:"rating,omitempty"`
}
