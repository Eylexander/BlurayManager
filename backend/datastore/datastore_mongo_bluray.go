package datastore

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"
	"strconv"
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
	// Parse search parameters (e.g., "director:David Yates tag:4k potter")
	filters, freeText := parseSearchQuery(query)

	andConditions := []bson.M{}
	for _, f := range filters {
		regexPattern := bson.M{"$regex": containsPattern(f.Value)}

		switch f.Field {
		case "title":
			andConditions = append(andConditions, bson.M{"title": regexPattern})
		case "director":
			andConditions = append(andConditions, bson.M{"director": regexPattern})
		case "tag":
			// Search for tags by name first, then search blurays by tag IDs
			tagIDs, err := ds.tagIDsMatching(ctx, f.Value)
			if err != nil {
				return nil, err
			}
			// With no matching tag, $in on an empty list correctly matches nothing.
			andConditions = append(andConditions, bson.M{"tags": bson.M{"$in": tagIDs}})
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

	// Plain words search every text field, alone or next to filters.
	if freeText != "" {
		regexPattern := bson.M{"$regex": containsPattern(freeText)}
		orConditions := []bson.M{
			{"title": regexPattern},
			{"director": regexPattern},
			{"genre.en-US": regexPattern},
			{"genre.fr-FR": regexPattern},
			{"description.en-US": regexPattern},
			{"description.fr-FR": regexPattern},
		}
		tagIDs, err := ds.tagIDsMatching(ctx, freeText)
		if err != nil {
			return nil, err
		}
		if len(tagIDs) > 0 {
			orConditions = append(orConditions, bson.M{"tags": bson.M{"$in": tagIDs}})
		}
		andConditions = append(andConditions, bson.M{"$or": orConditions})
	}

	filter := bson.M{}
	if len(andConditions) > 0 {
		filter = bson.M{"$and": andConditions}
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
// tagIDsMatching returns the IDs of tags whose name contains name.
func (ds *MongoDatastore) tagIDsMatching(ctx context.Context, name string) ([]string, error) {
	tags, err := ds.SearchTagsByName(ctx, name)
	if err != nil {
		return nil, err
	}
	ids := make([]string, len(tags))
	for i, tag := range tags {
		ids[i] = tag.ID.Hex()
	}
	return ids, nil
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
