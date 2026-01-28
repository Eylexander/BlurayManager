package datastore

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"
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
		"location":        bluray.Location,
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
	filter := bson.M{"$text": bson.M{"$search": query}}
	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit))
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
