package controller

import (
	"eylexander/bluraymanager/datastore"
)

type Controller struct {
	ds datastore.Datastore
}

func NewController(ds datastore.Datastore) *Controller {
	return &Controller{ds: ds}
}
