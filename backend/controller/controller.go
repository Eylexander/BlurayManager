package controller

import (
	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/i18n"
)

type Controller struct {
	ds   datastore.Datastore
	i18n *i18n.I18n
}

func NewController(ds datastore.Datastore, i18n *i18n.I18n) *Controller {
	return &Controller{
		ds:   ds,
		i18n: i18n,
	}
}
