package datastore

import (
	"context"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (ds *MongoDatastore) GetStatistics(ctx context.Context) (*models.Statistics, error) {
	stats := &models.Statistics{
		GenreDistribution: make(map[string]int),
		TagDistribution:   make(map[string]int),
		YearDistribution:  make(map[int]int),
	}

	total, _ := ds.blurays.CountDocuments(ctx, bson.M{})
	stats.TotalBlurays = int(total)

	movieCount, _ := ds.blurays.CountDocuments(ctx, bson.M{"type": "movie"})
	seriesCount, _ := ds.blurays.CountDocuments(ctx, bson.M{"type": "series"})
	stats.TotalMovies = int(movieCount)
	stats.TotalSeries = int(seriesCount)

	cursor, err := ds.blurays.Find(ctx, bson.M{})
	if err != nil {
		return stats, nil
	}
	defer cursor.Close(ctx)

	var blurays []*models.Bluray
	cursor.All(ctx, &blurays)

	var totalPrice, totalRating float64
	var ratingCount int
	var totalRuntime int
	var totalVolumeLiters float64
	var totalStorageGB float64
	var mostExpensive, oldest, newest *models.Bluray

	for _, b := range blurays {
		totalPrice += b.PurchasePrice
		if mostExpensive == nil || b.PurchasePrice > mostExpensive.PurchasePrice {
			mostExpensive = b
		}
		if oldest == nil || b.PurchaseDate.Before(oldest.PurchaseDate) {
			oldest = b
		}
		if newest == nil || b.PurchaseDate.After(newest.PurchaseDate) {
			newest = b
		}
		if b.Rating > 0 {
			totalRating += b.Rating
			ratingCount++
		}
		for _, genre := range b.Genre {
			stats.GenreDistribution[genre]++
		}
		for _, tag := range b.Tags {
			stats.TagDistribution[tag]++
		}
		if b.ReleaseYear > 0 {
			stats.YearDistribution[b.ReleaseYear]++
		}
		switch b.Type {
		case models.MediaTypeSeries:
			stats.TotalSeasons += len(b.Seasons)

			for _, season := range b.Seasons {
				stats.TotalEpisodes += season.EpisodeCount
			}
			// Series: approx 0.3 liters per season and 30GB per season
			totalVolumeLiters += float64(len(b.Seasons)) * 0.3
			totalStorageGB += float64(len(b.Seasons)) * 30.0
		case models.MediaTypeMovie:
			// Movies: approx 0.3 liters and 35GB per movie
			totalVolumeLiters += 0.3
			totalStorageGB += 35.0
			if b.Runtime > 0 {
				totalRuntime += b.Runtime
			}
		}
	}

	stats.TotalSpent = totalPrice
	stats.PhysicalVolumeLiters = totalVolumeLiters
	stats.PhysicalStorageGB = totalStorageGB
	stats.TotalRuntimeMinutes = totalRuntime
	if stats.TotalBlurays > 0 {
		stats.AveragePrice = totalPrice / float64(stats.TotalBlurays)
	}
	if ratingCount > 0 {
		stats.AverageRating = totalRating / float64(ratingCount)
	}

	if mostExpensive != nil {
		stats.MostExpensive = &models.BlurayStats{
			ID:            mostExpensive.ID.Hex(),
			Title:         mostExpensive.Title,
			Type:          string(mostExpensive.Type),
			PurchasePrice: mostExpensive.PurchasePrice,
		}
	}
	if oldest != nil {
		stats.OldestBluray = &models.BlurayStats{
			ID:          oldest.ID.Hex(),
			Title:       oldest.Title,
			Type:        string(oldest.Type),
			ReleaseYear: oldest.ReleaseYear,
		}
	}
	if newest != nil {
		stats.NewestBluray = &models.BlurayStats{
			ID:          newest.ID.Hex(),
			Title:       newest.Title,
			Type:        string(newest.Type),
			ReleaseYear: newest.ReleaseYear,
		}
	}

	opts := options.Find().SetSort(bson.D{{Key: "rating", Value: -1}}).SetLimit(10)
	topCursor, _ := ds.blurays.Find(ctx, bson.M{"rating": bson.M{"$gt": 0}}, opts)
	if topCursor != nil {
		defer topCursor.Close(ctx)
		var topRated []*models.Bluray
		topCursor.All(ctx, &topRated)
		for _, b := range topRated {
			stats.TopRated = append(stats.TopRated, models.BlurayStats{
				ID:     b.ID.Hex(),
				Title:  b.Title,
				Type:   string(b.Type),
				Rating: b.Rating,
			})
		}
	}

	return stats, nil
}

func (ds *MongoDatastore) GetSimplifiedStatistics(ctx context.Context) (*models.SimplifiedStatistics, error) {
	stats := &models.SimplifiedStatistics{}

	total, _ := ds.blurays.CountDocuments(ctx, bson.M{})
	stats.TotalBlurays = int(total)

	movieCount, _ := ds.blurays.CountDocuments(ctx, bson.M{"type": "movie"})
	seriesCount, _ := ds.blurays.CountDocuments(ctx, bson.M{"type": "series"})
	stats.TotalMovies = int(movieCount)
	stats.TotalSeries = int(seriesCount)

	cursor, err := ds.blurays.Find(ctx, bson.M{})
	if err != nil {
		return stats, nil
	}
	defer cursor.Close(ctx)

	var blurays []*models.Bluray
	cursor.All(ctx, &blurays)

	for _, b := range blurays {
		if b.Type == models.MediaTypeSeries {
			stats.TotalSeasons += len(b.Seasons)
		}
	}

	return stats, nil
}
