package datastore

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoDatastore struct {
	client        *mongo.Client
	db            *mongo.Database
	users         *mongo.Collection
	blurays       *mongo.Collection
	tags          *mongo.Collection
	notifications *mongo.Collection
}

func NewMongoDatastore(ctx context.Context, uri, dbName string) (*MongoDatastore, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	db := client.Database(dbName)

	ds := &MongoDatastore{
		client:        client,
		db:            db,
		users:         db.Collection("users"),
		blurays:       db.Collection("blurays"),
		tags:          db.Collection("tags"),
		notifications: db.Collection("notifications"),
	}

	if err := ds.createIndexes(ctx); err != nil {
		return nil, err
	}

	return ds, nil
}

func (ds *MongoDatastore) createIndexes(ctx context.Context) error {
	_, err := ds.users.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	if err != nil {
		return err
	}

	_, err = ds.blurays.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "title", Value: "text"}, {Key: "description", Value: "text"}}},
		{Keys: bson.D{{Key: "type", Value: 1}}},
		{Keys: bson.D{{Key: "tags", Value: 1}}},
		{Keys: bson.D{{Key: "genre", Value: 1}}},
	})
	if err != nil {
		return err
	}

	_, err = ds.tags.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = ds.notifications.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "read", Value: 1}}},
	})

	return err
}
