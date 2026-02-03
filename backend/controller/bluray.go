package controller

import (
	"context"
	"errors"

	"eylexander/bluraymanager/i18n"
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (c *Controller) CreateBluray(ctx context.Context, bluray *models.Bluray) error {
	i18n := i18n.GetI18nFromContext(ctx)
	if bluray.Title == "" {
		return errors.New(i18n.T("bluray.titleRequired"))
	}

	// Check for duplicate TMDB ID
	if bluray.TMDBID != "" {
		existingBlurays, err := c.ds.ListBlurays(ctx, map[string]interface{}{"tmdb_id": bluray.TMDBID}, 0, 1)
		if err != nil {
			return err
		}
		if len(existingBlurays) > 0 {
			return errors.New(i18n.T("bluray.duplicateTMDBID"))
		}
	}

	return c.ds.CreateBluray(ctx, bluray)
}

func (c *Controller) GetBlurayByID(ctx context.Context, id primitive.ObjectID) (*models.Bluray, error) {
	return c.ds.GetBlurayByID(ctx, id)
}

func (c *Controller) UpdateBluray(ctx context.Context, bluray *models.Bluray) error {
	i18n := i18n.GetI18nFromContext(ctx)
	if bluray.Title == "" {
		return errors.New(i18n.T("bluray.titleRequired"))
	}
	return c.ds.UpdateBluray(ctx, bluray)
}

func (c *Controller) DeleteBluray(ctx context.Context, id primitive.ObjectID) error {
	return c.ds.DeleteBluray(ctx, id)
}

func (c *Controller) ListBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.Bluray, error) {
	return c.ds.ListBlurays(ctx, filters, skip, limit)
}

func (c *Controller) SearchBlurays(ctx context.Context, query string, skip, limit int) ([]*models.Bluray, error) {
	return c.ds.SearchBlurays(ctx, query, skip, limit)
}

func (c *Controller) ListSimplifiedBlurays(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*models.SimplifiedBluray, error) {
	return c.ds.ListSimplifiedBlurays(ctx, filters, skip, limit)
}
