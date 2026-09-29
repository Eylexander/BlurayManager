package controller

import (
	"context"
	"errors"

	"eylexander/bluraymanager/i18n"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (c *Controller) CreateTag(ctx context.Context, tag *models.Tag) error {
	i18n := i18n.GetI18nFromContext(ctx)
	if tag.Name == "" {
		return errors.New(i18n.T("tag.nameRequired"))
	}
	// Check if tag already exists
	if _, err := c.ds.GetTagByName(ctx, tag.Name); err == nil {
		return errors.New(i18n.T("tag.duplicateTagName"))
	}
	return c.ds.CreateTag(ctx, tag)
}

func (c *Controller) GetTagByID(ctx context.Context, id primitive.ObjectID) (*models.Tag, error) {
	return c.ds.GetTagByID(ctx, id)
}

func (c *Controller) GetTagByName(ctx context.Context, name string) (*models.Tag, error) {
	return c.ds.GetTagByName(ctx, name)
}

// UpdateTag applies the non-nil fields of req to the existing tag and returns the updated tag
func (c *Controller) UpdateTag(ctx context.Context, id primitive.ObjectID, req *models.UpdateTagRequest) (*models.Tag, error) {
	i18n := i18n.GetI18nFromContext(ctx)
	tag, err := c.ds.GetTagByID(ctx, id)
	if err != nil {
		return nil, errors.New(i18n.T("tag.notFound"))
	}
	if req.Name != nil {
		tag.Name = *req.Name
	}
	if req.Color != nil {
		tag.Color = *req.Color
	}
	if req.Description != nil {
		tag.Description = *req.Description
	}
	if tag.Name == "" {
		return nil, errors.New(i18n.T("tag.nameRequired"))
	}
	if err := c.ds.UpdateTag(ctx, tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (c *Controller) DeleteTag(ctx context.Context, id primitive.ObjectID) error {
	return c.ds.DeleteTag(ctx, id)
}

func (c *Controller) ListTags(ctx context.Context) ([]*models.Tag, error) {
	return c.ds.ListTags(ctx)
}
