package controller

import (
	"eylexander/bluraymanager/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (c *Controller) ParseObjectID(id string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(id)
}

func (c *Controller) CanUserModify(user *models.User) bool {
	return user.Role == models.RoleAdmin || user.Role == models.RoleModerator
}

func (c *Controller) IsAdmin(user *models.User) bool {
	return user.Role == models.RoleAdmin
}
