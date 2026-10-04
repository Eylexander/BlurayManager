package datastore

import (
	"context"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// statsItem is a bluray as projected by the statistics highlight facets.
type statsItem struct {
	ID            primitive.ObjectID `bson:"_id"`
	Title         string             `bson:"title"`
	Titles        models.I18nText    `bson:"titles"`
	Type          string             `bson:"type"`
	ReleaseYear   int                `bson:"release_year"`
	PurchasePrice float64            `bson:"purchase_price"`
	Rating        float64            `bson:"rating"`
}

func (i statsItem) toStats() *models.BlurayStats {
	return &models.BlurayStats{
		ID:            i.ID.Hex(),
		Title:         i.Title,
		Titles:        i.Titles,
		Type:          i.Type,
		ReleaseYear:   i.ReleaseYear,
		PurchasePrice: i.PurchasePrice,
		Rating:        i.Rating,
	}
}

// GetStatistics computes the collection statistics. Genres are counted in
// lang ("en-US" or "fr-FR"), falling back to English where a bluray has none.
func (ds *MongoDatastore) GetStatistics(ctx context.Context, lang string) (*models.Statistics, error) {
	if lang != "fr-FR" {
		lang = "en-US"
	}

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
				"genres": bson.M{"$ifNull": bson.A{"$genre." + lang, "$genre.en-US"}},
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
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "titles": 1, "type": 1, "release_year": 1, "purchase_date": 1}},
				},
				"newest": bson.A{
					bson.M{"$match": bson.M{"release_year": bson.M{"$gt": 0}}},
					bson.M{"$sort": bson.M{"release_year": -1}},
					bson.M{"$limit": 1},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "titles": 1, "type": 1, "release_year": 1, "purchase_date": 1}},
				},
				"mostExpensive": bson.A{
					bson.M{"$sort": bson.M{"purchase_price": -1}},
					bson.M{"$limit": 1},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "titles": 1, "type": 1, "purchase_price": 1}},
				},
				"topRated": bson.A{
					bson.M{"$match": bson.M{"rating": bson.M{"$gt": 0}}},
					bson.M{"$sort": bson.M{"rating": -1}},
					bson.M{"$limit": 10},
					bson.M{"$project": bson.M{"_id": 1, "title": 1, "titles": 1, "type": 1, "rating": 1}},
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
		Oldest        []statsItem `bson:"oldest"`
		Newest        []statsItem `bson:"newest"`
		MostExpensive []statsItem `bson:"mostExpensive"`
		TopRated      []statsItem `bson:"topRated"`
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
	// Tags are stored by ID; report them by name. IDs of deleted tags are skipped.
	if len(result.Tags) > 0 {
		tags, err := ds.ListTags(ctx)
		if err != nil {
			return stats, err
		}
		names := make(map[string]string, len(tags))
		for _, tag := range tags {
			names[tag.ID.Hex()] = tag.Name
		}
		for _, t := range result.Tags {
			if name, ok := names[t.ID]; ok {
				stats.TagDistribution[name] += t.Count
			}
		}
	}

	if len(result.Oldest) > 0 {
		stats.OldestBluray = result.Oldest[0].toStats()
	}
	if len(result.Newest) > 0 {
		stats.NewestBluray = result.Newest[0].toStats()
	}
	if len(result.MostExpensive) > 0 {
		stats.MostExpensive = result.MostExpensive[0].toStats()
	}
	for _, b := range result.TopRated {
		stats.TopRated = append(stats.TopRated, *b.toStats())
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
		return nil, err
	}
	defer cursor.Close(ctx)

	var blurays []*models.Bluray
	if err := cursor.All(ctx, &blurays); err != nil {
		return nil, err
	}

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
