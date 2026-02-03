package api

import (
	"eylexander/bluraymanager/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (api *API) CreateTag(c *gin.Context) {
	i18n := api.GetI18n(c)
	var tag models.Tag
	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDstr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("user.notFound")})
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDstr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidUserID")})
		return
	}

	tag.CreatedBy = userID

	if err := api.ctrl.CreateTag(c.Request.Context(), &tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"tag": tag})
}

func (api *API) GetTag(c *gin.Context) {
	i18n := api.GetI18n(c)
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidID")})
		return
	}

	tag, err := api.ctrl.GetTagByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("tag.notFound")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tag": tag})
}

func (api *API) UpdateTag(c *gin.Context) {
	i18n := api.GetI18n(c)
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidID")})
		return
	}

	var tag models.Tag
	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag.ID = id
	if err := api.ctrl.UpdateTag(c.Request.Context(), &tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tag": tag})
}

func (api *API) DeleteTag(c *gin.Context) {
	i18n := api.GetI18n(c)
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidID")})
		return
	}

	if err := api.ctrl.DeleteTag(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T("tag.deletedSuccessfully")})
}

func (api *API) ListTags(c *gin.Context) {
	tags, err := api.ctrl.ListTags(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tags": tags})
}
