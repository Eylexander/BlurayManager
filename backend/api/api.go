package api

import (
	"eylexander/bluraymanager/controller"
	"strings"

	"github.com/gin-gonic/gin"
)

type API struct {
	ctrl *controller.Controller
}

func NewAPI(ctrl *controller.Controller) *API {
	return &API{ctrl: ctrl}
}

func (api *API) getRequestedLanguage(c *gin.Context) string {
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		return "en-US"
	}
	// Take the first language if it's a list (e.g., "fr-FR,fr;q=0.9")
	return strings.Split(lang, ",")[0]
}
