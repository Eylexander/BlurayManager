package datastore

import (
	"context"
	"eylexander/bluraymanager/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (ds *MongoDatastore) CreateNotification(ctx context.Context, notification *models.Notification) error {
	notification.ID = primitive.NewObjectID()
	notification.CreatedAt = time.Now()
	notification.Read = false
	_, err := ds.notifications.InsertOne(ctx, notification)
	return err
}

func (ds *MongoDatastore) GetUserNotifications(ctx context.Context, userID primitive.ObjectID, limit int) ([]*models.Notification, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit))
	cursor, err := ds.notifications.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	if err := cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}
	return notifications, nil
}

func (ds *MongoDatastore) MarkNotificationAsRead(ctx context.Context, notificationID primitive.ObjectID) error {
	_, err := ds.notifications.UpdateOne(
		ctx,
		bson.M{"_id": notificationID},
		bson.M{"$set": bson.M{"read": true}},
	)
	return err
}

func (ds *MongoDatastore) MarkAllNotificationsAsRead(ctx context.Context, userID primitive.ObjectID) error {
	_, err := ds.notifications.UpdateMany(
		ctx,
		bson.M{"user_id": userID, "read": false},
		bson.M{"$set": bson.M{"read": true}},
	)
	return err
}
