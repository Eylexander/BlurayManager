package controller

import (
	"context"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (c *Controller) CreateNotification(ctx context.Context, notification *models.Notification) error {
	return c.ds.CreateNotification(ctx, notification)
}

func (c *Controller) GetUserNotifications(ctx context.Context, userID primitive.ObjectID, limit int) ([]*models.Notification, error) {
	return c.ds.GetUserNotifications(ctx, userID, limit)
}

func (c *Controller) MarkNotificationAsRead(ctx context.Context, notificationID primitive.ObjectID) error {
	return c.ds.MarkNotificationAsRead(ctx, notificationID)
}

func (c *Controller) MarkAllNotificationsAsRead(ctx context.Context, userID primitive.ObjectID) error {
	return c.ds.MarkAllNotificationsAsRead(ctx, userID)
}
