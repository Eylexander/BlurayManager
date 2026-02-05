package datastore

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (ds *MongoDatastore) CreateBluray(ctx context.Context, bluray *models.Bluray) error {
	bluray.ID = primitive.NewObjectID()
	bluray.CreatedAt = time.Now()
	bluray.UpdatedAt = time.Now()
	_, err := ds.blurays.InsertOne(ctx, bluray)
	return err
}

func (ds *MongoDatastore) GetBlurayByID(ctx context.Context, id primitive.ObjectID) (*models.Bluray, error) {
	var bluray models.Bluray
	err := ds.blurays.FindOne(ctx, bson.M{"_id": id}).Decode(&bluray)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("bluray not found")
	}
	return &bluray, err
}

func (ds *MongoDatastore) UpdateBluray(ctx context.Context, bluray *models.Bluray) error {
	bluray.UpdatedAt = time.Now()

	// Build update document excluding created_at to preserve original creation time
	update := bson.M{
		"title":           bluray.Title,
		"type":            bluray.Type,
		"release_year":    bluray.ReleaseYear,
		"director":        bluray.Director,
		"runtime":         bluray.Runtime,
		"seasons":         bluray.Seasons,
		"total_episodes":  bluray.TotalEpisodes,
		"description":     bluray.Description,
		"genre":           bluray.Genre,
		"cover_image_url": bluray.CoverImageURL,
		"backdrop_url":    bluray.BackdropURL,
		"purchase_price":  bluray.PurchasePrice,
		"purchase_date":   bluray.PurchaseDate,
		"tags":            bluray.Tags,
		"rating":          bluray.Rating,
		"tmdb_id":         bluray.TMDBID,
		"imdb_id":         bluray.IMDBID,
		"updated_at":      bluray.UpdatedAt,
	}

	_, err := ds.blurays.UpdateOne(ctx, bson.M{"_id": bluray.ID}, bson.M{"$set": update})
	return err
}

func (ds *MongoDatastore) DeleteBluray(ctx context.Context, id primitive.ObjectID) error {
	_, err := ds.blurays.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (ds *MongoDatastore) ListBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.Bluray, error) {
	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := ds.blurays.Find(ctx, filters, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var blurays []*models.Bluray
	if err := cursor.All(ctx, &blurays); err != nil {
		return nil, err
	}

	return blurays, nil
}

func (ds *MongoDatastore) SearchBlurays(ctx context.Context, query string, skip, limit int) ([]*models.Bluray, error) {
	// Parse search parameters (e.g., "title:inception tag:action")
	filters := parseSearchQuery(query)

	// Build the MongoDB filter
	var filter bson.M
	if len(filters) > 0 {
		// Advanced search with parameters
		andConditions := []bson.M{}

		for _, f := range filters {
			regexPattern := bson.M{"$regex": primitive.Regex{Pattern: f.Value, Options: "i"}}

			switch f.Field {
			case "title":
				andConditions = append(andConditions, bson.M{"title": regexPattern})
			case "director":
				andConditions = append(andConditions, bson.M{"director": regexPattern})
			case "tag":
				andConditions = append(andConditions, bson.M{"tags": regexPattern})
			case "genre":
				andConditions = append(andConditions, bson.M{
					"$or": []bson.M{
						{"genre.en-US": regexPattern},
						{"genre.fr-FR": regexPattern},
					},
				})
			case "year":
				if year, err := strconv.Atoi(f.Value); err == nil {
					andConditions = append(andConditions, bson.M{"release_year": year})
				}
			case "type":
				andConditions = append(andConditions, bson.M{"type": f.Value})
			case "description":
				andConditions = append(andConditions, bson.M{
					"$or": []bson.M{
						{"description.en-US": regexPattern},
						{"description.fr-FR": regexPattern},
					},
				})
			}
		}

		if len(andConditions) > 0 {
			filter = bson.M{"$and": andConditions}
		} else {
			filter = bson.M{}
		}
	} else {
		// Simple search across all fields (backward compatibility)
		regexPattern := bson.M{"$regex": primitive.Regex{Pattern: query, Options: "i"}}
		filter = bson.M{
			"$or": []bson.M{
				{"title": regexPattern},
				{"director": regexPattern},
				{"tags": regexPattern},
				{"genre.en-US": regexPattern},
				{"genre.fr-FR": regexPattern},
				{"description.en-US": regexPattern},
				{"description.fr-FR": regexPattern},
			},
		}
	}

	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := ds.blurays.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var blurays []*models.Bluray
	if err := cursor.All(ctx, &blurays); err != nil {
		return nil, err
	}
	return blurays, nil
}

// SearchFilter represents a parsed search parameter
type SearchFilter struct {
	Field string
	Value string
}

func parseSearchQuery(query string) []SearchFilter {
	var filters []SearchFilter
	words := strings.Fields(query)

	for _, word := range words {
		if strings.Contains(word, ":") {
			parts := strings.SplitN(word, ":", 2)
			if len(parts) == 2 && parts[1] != "" {
				filters = append(filters, SearchFilter{
					Field: strings.ToLower(parts[0]),
					Value: parts[1],
				})
			}
		}
	}

	return filters
}

func (ds *MongoDatastore) ListSimplifiedBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.SimplifiedBluray, error) {
	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := ds.blurays.Find(ctx, filters, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var blurays []*models.SimplifiedBluray
	if err := cursor.All(ctx, &blurays); err != nil {
		return nil, err
	}
	return blurays, nil
}
