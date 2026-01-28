package datastore

import (
	"context"
	"time"

	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Datastore defines the interface for all database operations
type Datastore interface {
	// User operations
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	DeleteUser(ctx context.Context, id primitive.ObjectID) error
	ListUsers(ctx context.Context, skip, limit int) ([]*models.User, error)
	EnsureGuestUser(ctx context.Context) (bool, error)

	// Bluray operations
	CreateBluray(ctx context.Context, bluray *models.Bluray) error
	GetBlurayByID(ctx context.Context, id primitive.ObjectID) (*models.Bluray, error)
	UpdateBluray(ctx context.Context, bluray *models.Bluray) error
	DeleteBluray(ctx context.Context, id primitive.ObjectID) error
	ListBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.Bluray, error)
	SearchBlurays(ctx context.Context, query string, skip, limit int) ([]*models.Bluray, error)
	ListSimplifiedBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.SimplifiedBluray, error)

	// Tag operations
	CreateTag(ctx context.Context, tag *models.Tag) error
	GetTagByID(ctx context.Context, id primitive.ObjectID) (*models.Tag, error)
	GetTagByName(ctx context.Context, name string) (*models.Tag, error)
	UpdateTag(ctx context.Context, tag *models.Tag) error
	DeleteTag(ctx context.Context, id primitive.ObjectID) error
	ListTags(ctx context.Context) ([]*models.Tag, error)

	// Statistics operations
	GetStatistics(ctx context.Context) (*models.Statistics, error)
	GetSimplifiedStatistics(ctx context.Context) (*models.SimplifiedStatistics, error)

	// Notification operations
	CreateNotification(ctx context.Context, notification *models.Notification) error
	GetUserNotifications(ctx context.Context, userID primitive.ObjectID, limit int) ([]*models.Notification, error)
	MarkNotificationAsRead(ctx context.Context, notificationID primitive.ObjectID) error
	MarkAllNotificationsAsRead(ctx context.Context, userID primitive.ObjectID) error

	// Password reset operations
	CreatePasswordResetToken(userID, token string, expiresAt time.Time) error
	VerifyPasswordResetToken(token string) (string, error)
	DeletePasswordResetToken(token string) error
	UpdateUserPassword(userID, newPassword string) error

	// Close connection
	Close(ctx context.Context) error
}
