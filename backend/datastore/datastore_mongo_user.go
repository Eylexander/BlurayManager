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
	"golang.org/x/crypto/bcrypt"
)

func (ds *MongoDatastore) CreateUser(ctx context.Context, user *models.User) error {
	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	_, err := ds.users.InsertOne(ctx, user)
	return err
}

func (ds *MongoDatastore) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := ds.users.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("user not found")
	}
	return &user, err
}

func (ds *MongoDatastore) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := ds.users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("user not found")
	}
	return &user, err
}

func (ds *MongoDatastore) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := ds.users.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("user not found")
	}
	return &user, err
}

func (ds *MongoDatastore) UpdateUser(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()
	_, err := ds.users.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": user})
	return err
}

func (ds *MongoDatastore) DeleteUser(ctx context.Context, id primitive.ObjectID) error {
	_, err := ds.users.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (ds *MongoDatastore) ListUsers(ctx context.Context, skip, limit int) ([]*models.User, error) {
	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit))
	cursor, err := ds.users.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var users []*models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

// EnsureGuestUser creates a guest user if it doesn't exist
// Returns true if the user was created, false if it already existed
func (ds *MongoDatastore) EnsureGuestUser(ctx context.Context) (bool, error) {
	// Check if guest user already exists
	_, err := ds.GetUserByEmail(ctx, "guest@bluray-manager.local")
	if err == nil {
		// Guest user already exists
		return false, nil
	}

	// Create guest user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("guest"), bcrypt.DefaultCost)
	if err != nil {
		return false, err
	}

	guestUser := &models.User{
		Username:     "guest",
		Email:        "guest@bluray-manager.local",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleGuest,
		Settings: models.UserSettings{
			Theme:    "dark",
			Language: "en",
		},
	}

	err = ds.CreateUser(ctx, guestUser)
	return err == nil, err
}
