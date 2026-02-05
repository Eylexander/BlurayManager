package datastore

import (
	"context"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ds *MongoDatastore) GetStatistics(ctx context.Context) (*models.Statistics, error) {
	stats := &models.Statistics{
		GenreDistribution: make(map[string]int),
		TagDistribution:   make(map[string]int),
		TopRated:          []models.BlurayStats{},
	}

	pipeline := []bson.M{
		{
			"$addFields": bson.M{
				"seasonCount": bson.M{"$size": bson.M{"$ifNull": bson.A{"$seasons", bson.A{}}}},
				"seriesPhysicalCount": bson.M{
					"$cond": bson.A{
						bson.M{"$eq": bson.A{"$type", "series"}},
						bson.M{"$max": bson.A{1, bson.M{"$size": bson.M{"$ifNull": bson.A{"$seasons", bson.A{}}}}}},
						0,
					},
				},
				"moviePhysicalCount": bson.M{
					"$cond": bson.A{
						bson.M{"$eq": bson.A{"$type", "movie"}},
						1,
						0,
					},
				},
				"totalSeriesEpisodes": bson.M{
					"$sum": "$seasons.episode_count",
				},
				"genres": "$genre.en-US",
			},
		},
		{
			"$facet": bson.M{
				"counts": bson.A{
					bson.M{"$group": bson.M{
						"_id":           nil,
						"totalBlurays":  bson.M{"$sum": bson.M{"$add": bson.A{"$seriesPhysicalCount", "$moviePhysicalCount"}}},
						"totalMovies":   bson.M{"$sum": "$moviePhysicalCount"},
						"totalSeries":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$type", "series"}}, 1, 0}}},
						"totalSeasons":  bson.M{"$sum": "$seriesPhysicalCount"},
						"totalEpisodes": bson.M{"$sum": "$totalSeriesEpisodes"},
						"totalSpent":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$gt": bson.A{"$purchase_price", 0}}, "$purchase_price", 4}}},
						"totalRating":   bson.M{"$sum": "$rating"},
						"ratingCount":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$gt": bson.A{"$rating", 0}}, 1, 0}}},
						"totalRuntime":  bson.M{"$sum": "$runtime"}, // Only movies have runtime field usually populated at root, check model
						"seriesFactor":  bson.M{"$sum": "$seriesPhysicalCount"},
						"movieFactor":   bson.M{"$sum": "$moviePhysicalCount"},
					}},
				},
				"genres": bson.A{
					bson.M{"$unwind": "$genres"},
					bson.M{"$group": bson.M{"_id": "$genres", "count": bson.M{"$sum": 1}}},
				},
				"tags": bson.A{
					bson.M{"$unwind": "$tags"},
					bson.M{"$group": bson.M{"_id": "$tags", "count": bson.M{"$sum": 1}}},
				},
				"oldest": bson.A{
					bson.M{"$match": bson.M{"release_year": bson.M{"$gt": 0}}},
					bson.M{"$sort": bson.M{"release_year": 1}},
					bson.M{"$limit": 1},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "type": 1, "release_year": 1, "purchase_date": 1}},
				},
				"newest": bson.A{
					bson.M{"$match": bson.M{"release_year": bson.M{"$gt": 0}}},
					bson.M{"$sort": bson.M{"release_year": -1}},
					bson.M{"$limit": 1},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "type": 1, "release_year": 1, "purchase_date": 1}},
				},
				"mostExpensive": bson.A{
					bson.M{"$sort": bson.M{"purchase_price": -1}},
					bson.M{"$limit": 1},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "type": 1, "purchase_price": 1}},
				},
				"topRated": bson.A{
					bson.M{"$match": bson.M{"rating": bson.M{"$gt": 0}}},
					bson.M{"$sort": bson.M{"rating": -1}},
					bson.M{"$limit": 10},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "type": 1, "rating": 1}},
				},
			},
		},
	}

	cursor, err := ds.blurays.Aggregate(ctx, pipeline)
	if err != nil {
		return stats, err
	}
	defer cursor.Close(ctx)

	if !cursor.Next(ctx) {
		return stats, nil
	}

	var result struct {
		Counts []struct {
			TotalBlurays  int     `bson:"totalBlurays"`
			TotalMovies   int     `bson:"totalMovies"`
			TotalSeries   int     `bson:"totalSeries"`
			TotalSeasons  int     `bson:"totalSeasons"`
			TotalEpisodes int     `bson:"totalEpisodes"`
			TotalSpent    float64 `bson:"totalSpent"`
			TotalRating   float64 `bson:"totalRating"`
			RatingCount   int     `bson:"ratingCount"`
			TotalRuntime  int     `bson:"totalRuntime"`
			SeriesFactor  int     `bson:"seriesFactor"`
			MovieFactor   int     `bson:"movieFactor"`
		} `bson:"counts"`
		Genres []struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		} `bson:"genres"`
		Tags []struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		} `bson:"tags"`
		Oldest []struct {
			ID          primitive.ObjectID `bson:"_id"`
			Title       string             `bson:"title"`
			Type        string             `bson:"type"`
			ReleaseYear int                `bson:"release_year"`
		} `bson:"oldest"`
		Newest []struct {
			ID          primitive.ObjectID `bson:"_id"`
			Title       string             `bson:"title"`
			Type        string             `bson:"type"`
			ReleaseYear int                `bson:"release_year"`
		} `bson:"newest"`
		MostExpensive []struct {
			ID            primitive.ObjectID `bson:"_id"`
			Title         string             `bson:"title"`
			Type          string             `bson:"type"`
			PurchasePrice float64            `bson:"purchase_price"`
		} `bson:"mostExpensive"`
		TopRated []struct {
			ID     primitive.ObjectID `bson:"_id"`
			Title  string             `bson:"title"`
			Type   string             `bson:"type"`
			Rating float64            `bson:"rating"`
		} `bson:"topRated"`
	}

	if err := cursor.Decode(&result); err != nil {
		return stats, err
	}

	// Populate Stats
	if len(result.Counts) > 0 {
		c := result.Counts[0]
		stats.TotalBlurays = c.TotalBlurays
		stats.TotalMovies = c.TotalMovies
		stats.TotalSeries = c.TotalSeries
		stats.TotalSeasons = c.TotalSeasons
		stats.TotalEpisodes = c.TotalEpisodes
		stats.TotalSpent = c.TotalSpent
		stats.TotalRuntimeMinutes = c.TotalRuntime

		if c.TotalBlurays > 0 {
			stats.AveragePrice = c.TotalSpent / float64(c.TotalMovies+c.TotalSeries)
		}
		if c.RatingCount > 0 {
			stats.AverageRating = c.TotalRating / float64(c.RatingCount)
		}

		// Calculate storage and volume
		stats.PhysicalVolumeLiters = float64(c.SeriesFactor)*0.3 + float64(c.MovieFactor)*0.3
		stats.PhysicalStorageGB = float64(c.SeriesFactor)*30.0 + float64(c.MovieFactor)*35.0
	}

	for _, g := range result.Genres {
		stats.GenreDistribution[g.ID] = g.Count
	}
	for _, t := range result.Tags {
		stats.TagDistribution[t.ID] = t.Count
	}

	if len(result.Oldest) > 0 {
		stats.OldestBluray = &models.BlurayStats{
			ID:          result.Oldest[0].ID.Hex(),
			Title:       result.Oldest[0].Title,
			Type:        result.Oldest[0].Type,
			ReleaseYear: result.Oldest[0].ReleaseYear,
		}
	}
	if len(result.Newest) > 0 {
		stats.NewestBluray = &models.BlurayStats{
			ID:          result.Newest[0].ID.Hex(),
			Title:       result.Newest[0].Title,
			Type:        result.Newest[0].Type,
			ReleaseYear: result.Newest[0].ReleaseYear,
		}
	}
	if len(result.MostExpensive) > 0 {
		stats.MostExpensive = &models.BlurayStats{
			ID:            result.MostExpensive[0].ID.Hex(),
			Title:         result.MostExpensive[0].Title,
			Type:          result.MostExpensive[0].Type,
			PurchasePrice: result.MostExpensive[0].PurchasePrice,
		}
	}
	for _, b := range result.TopRated {
		stats.TopRated = append(stats.TopRated, models.BlurayStats{
			ID:     b.ID.Hex(),
			Title:  b.Title,
			Type:   b.Type,
			Rating: b.Rating,
		})
	}

	return stats, nil
}

func (ds *MongoDatastore) GetSimplifiedStatistics(ctx context.Context) (*models.SimplifiedStatistics, error) {
	stats := &models.SimplifiedStatistics{}

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

	var physicalBlurayCount int
	for _, b := range blurays {
		if b.Type == models.MediaTypeSeries {
			seasonCount := len(b.Seasons)
			if seasonCount == 0 {
				seasonCount = 1 // Count series with no seasons as 1 bluray
			}
			stats.TotalSeasons += seasonCount
			physicalBlurayCount += seasonCount // Each season is 1 physical bluray
		} else {
			physicalBlurayCount++ // Each movie is 1 physical bluray
		}
	}

	stats.TotalBlurays = physicalBlurayCount

	return stats, nil
}
