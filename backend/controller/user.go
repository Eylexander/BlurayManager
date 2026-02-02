package controller

import (
	"context"
	"errors"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func (c *Controller) RegisterUser(ctx context.Context, username, email, password string, role models.UserRole) (*models.User, error) {
	// Check if user already exists
	if _, err := c.ds.GetUserByEmail(ctx, email); err == nil {
		return nil, errors.New(c.i18n.T("user.emailAlreadyRegistered"))
	}
	if _, err := c.ds.GetUserByUsername(ctx, username); err == nil {
		return nil, errors.New(c.i18n.T("user.usernameAlreadyTaken"))
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         role,
	}

	if err := c.ds.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (c *Controller) Login(ctx context.Context, identifier, password string) (*models.User, error) {
	// Try to find user by email or username
	var user *models.User
	var err error

	user, err = c.ds.GetUserByEmail(ctx, identifier)
	if err != nil {
		user, err = c.ds.GetUserByUsername(ctx, identifier)
		if err != nil {
			return nil, errors.New(c.i18n.T("user.invalidCredentials"))
		}
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New(c.i18n.T("user.invalidCredentials"))
	}

	return user, nil
}

func (c *Controller) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	return c.ds.GetUserByID(ctx, id)
}

func (c *Controller) UpdateUser(ctx context.Context, user *models.User) error {
	return c.ds.UpdateUser(ctx, user)
}

func (c *Controller) VerifyPassword(user *models.User, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
}

func (c *Controller) UpdatePassword(ctx context.Context, user *models.User, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return c.ds.UpdateUser(ctx, user)
}

func (c *Controller) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	return c.ds.GetUserByUsername(ctx, username)
}

func (c *Controller) DeleteUser(ctx context.Context, id primitive.ObjectID) error {
	return c.ds.DeleteUser(ctx, id)
}

func (c *Controller) ListUsers(ctx context.Context, skip, limit int) ([]*models.User, error) {
	return c.ds.ListUsers(ctx, skip, limit)
}
