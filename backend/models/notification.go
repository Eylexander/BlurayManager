package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NotificationType defines the type of notification
type NotificationType string

const (
	NotificationBlurayAdded   NotificationType = "bluray_added"
	NotificationBlurayRemoved NotificationType = "bluray_removed"
)

// Notification represents a system notification
type Notification struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Type      NotificationType   `bson:"type" json:"type"`
	Message   string             `bson:"message" json:"message"`
	BlurayID  primitive.ObjectID `bson:"bluray_id,omitempty" json:"bluray_id,omitempty"`
	Read      bool               `bson:"read" json:"read"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}
