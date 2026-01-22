package api

import (
	"eylexander/bluraymanager/controller"
)

type API struct {
	ctrl *controller.Controller
}

func NewAPI(ctrl *controller.Controller) *API {
	return &API{ctrl: ctrl}
}
