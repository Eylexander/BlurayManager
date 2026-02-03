package controller

import (
	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/i18n"

	"github.com/gin-gonic/gin"
)

type Controller struct {
	ds datastore.Datastore
}

func NewController(ds datastore.Datastore) *Controller {
	return &Controller{
		ds: ds,
	}
}

// GetI18n retrieves the i18n instance from the context
func (c *Controller) GetI18n(ctx *gin.Context) *i18n.I18n {
	if i18nInterface, exists := ctx.Get("i18n"); exists {
		if i18nInstance, ok := i18nInterface.(*i18n.I18n); ok {
			return i18nInstance
		}
	}
	// Fallback to en-US if not found in context
	return i18n.NewModule("en-US")
}
