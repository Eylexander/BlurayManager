package controller

import (
	"context"

	"eylexander/bluraymanager/models"
)

func (c *Controller) GetStatistics(ctx context.Context, lang string) (*models.Statistics, error) {
	return c.ds.GetStatistics(ctx, lang)
}

func (c *Controller) GetSimplifiedStatistics(ctx context.Context) (*models.SimplifiedStatistics, error) {
	return c.ds.GetSimplifiedStatistics(ctx)
}
