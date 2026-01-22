package datastore

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

func (ds *MongoDatastore) CreatePasswordResetToken(userID, token string, expiresAt time.Time) error {
	ctx := context.Background()
	resetToken := models.PasswordResetToken{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}

	resetTokensCollection := ds.db.Collection("password_reset_tokens")
	_, err := resetTokensCollection.InsertOne(ctx, resetToken)
	return err
}

func (ds *MongoDatastore) VerifyPasswordResetToken(token string) (string, error) {
	ctx := context.Background()
	resetTokensCollection := ds.db.Collection("password_reset_tokens")

	var resetToken models.PasswordResetToken
	err := resetTokensCollection.FindOne(ctx, bson.M{"token": token}).Decode(&resetToken)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return "", errors.New("invalid token")
		}
		return "", err
	}

	// Check if token is expired
	if time.Now().After(resetToken.ExpiresAt) {
		ds.DeletePasswordResetToken(token)
		return "", errors.New("token expired")
	}

	return resetToken.UserID, nil
}

func (ds *MongoDatastore) DeletePasswordResetToken(token string) error {
	ctx := context.Background()
	resetTokensCollection := ds.db.Collection("password_reset_tokens")
	_, err := resetTokensCollection.DeleteOne(ctx, bson.M{"token": token})
	return err
}

func (ds *MongoDatastore) UpdateUserPassword(userID, newPassword string) error {
	ctx := context.Background()

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	_, err = ds.users.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{
			"password_hash": string(hashedPassword),
			"updated_at":    time.Now(),
		}},
	)
	return err
}

func (ds *MongoDatastore) Close(ctx context.Context) error {
	return ds.client.Disconnect(ctx)
}
