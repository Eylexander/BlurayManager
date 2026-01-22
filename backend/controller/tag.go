package controller

import (
	"context"
	"errors"

	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (c *Controller) CreateTag(ctx context.Context, tag *models.Tag) error {
	if tag.Name == "" {
		return errors.New("tag name is required")
	}
	// Check if tag already exists
	if _, err := c.ds.GetTagByName(ctx, tag.Name); err == nil {
		return errors.New("tag already exists")
	}
	return c.ds.CreateTag(ctx, tag)
}

func (c *Controller) GetTagByID(ctx context.Context, id primitive.ObjectID) (*models.Tag, error) {
	return c.ds.GetTagByID(ctx, id)
}

func (c *Controller) GetTagByName(ctx context.Context, name string) (*models.Tag, error) {
	return c.ds.GetTagByName(ctx, name)
}

func (c *Controller) UpdateTag(ctx context.Context, tag *models.Tag) error {
	if tag.Name == "" {
		return errors.New("tag name is required")
	}
	return c.ds.UpdateTag(ctx, tag)
}

func (c *Controller) DeleteTag(ctx context.Context, id primitive.ObjectID) error {
	return c.ds.DeleteTag(ctx, id)
}

func (c *Controller) ListTags(ctx context.Context) ([]*models.Tag, error) {
	return c.ds.ListTags(ctx)
}
