package datastore

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (ds *MongoDatastore) CreateTag(ctx context.Context, tag *models.Tag) error {
	tag.ID = primitive.NewObjectID()
	tag.CreatedAt = time.Now()
	tag.UpdatedAt = time.Now()
	_, err := ds.tags.InsertOne(ctx, tag)
	return err
}

func (ds *MongoDatastore) GetTagByID(ctx context.Context, id primitive.ObjectID) (*models.Tag, error) {
	var tag models.Tag
	err := ds.tags.FindOne(ctx, bson.M{"_id": id}).Decode(&tag)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("tag not found")
	}
	return &tag, err
}

func (ds *MongoDatastore) GetTagByName(ctx context.Context, name string) (*models.Tag, error) {
	var tag models.Tag
	err := ds.tags.FindOne(ctx, bson.M{"name": name}).Decode(&tag)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("tag not found")
	}
	return &tag, err
}

func (ds *MongoDatastore) UpdateTag(ctx context.Context, tag *models.Tag) error {
	tag.UpdatedAt = time.Now()
	_, err := ds.tags.UpdateOne(ctx, bson.M{"_id": tag.ID}, bson.M{"$set": tag})
	return err
}

func (ds *MongoDatastore) DeleteTag(ctx context.Context, id primitive.ObjectID) error {
	_, err := ds.tags.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (ds *MongoDatastore) ListTags(ctx context.Context) ([]*models.Tag, error) {
	cursor, err := ds.tags.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var tags []*models.Tag
	if err := cursor.All(ctx, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}

// SearchTagsByName searches for tags by name pattern (case-insensitive)
func (ds *MongoDatastore) SearchTagsByName(ctx context.Context, pattern string) ([]*models.Tag, error) {
	regexPattern := bson.M{"$regex": primitive.Regex{Pattern: pattern, Options: "i"}}
	cursor, err := ds.tags.Find(ctx, bson.M{"name": regexPattern})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var tags []*models.Tag
	if err := cursor.All(ctx, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}
