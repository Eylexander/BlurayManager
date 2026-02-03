package api

import (
	"eylexander/bluraymanager/controller"
	"eylexander/bluraymanager/i18n"

	"github.com/gin-gonic/gin"
)

type API struct {
	ctrl *controller.Controller
}

func NewAPI(ctrl *controller.Controller) *API {
	return &API{ctrl: ctrl}
}

// GetI18n retrieves the i18n instance from the Gin context
func (api *API) GetI18n(c *gin.Context) *i18n.I18n {
	return api.ctrl.GetI18n(c)
}
