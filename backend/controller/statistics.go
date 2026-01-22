package controller

import (
	"context"

	"eylexander/bluraymanager/models"
)

func (c *Controller) GetStatistics(ctx context.Context) (*models.Statistics, error) {
	return c.ds.GetStatistics(ctx)
}
