package api

import (
	"eylexander/bluraymanager/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CheckSetup checks if the system needs initial setup (no admin exists)
func (api *API) CheckSetup(c *gin.Context) {
	hasAdmin, err := api.ctrl.HasAdmin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"needsSetup": !hasAdmin})
}

// InitialSetup creates the first admin user
func (api *API) InitialSetup(c *gin.Context) {
	i18n := api.GetI18n(c)
	ctx := c.Request.Context()

	hasAdmin, err := api.ctrl.HasAdmin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if hasAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("setup.adminAlreadyExists")})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required,min=3"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create admin user
	user, err := api.ctrl.RegisterUser(ctx, req.Username, req.Email, req.Password, models.RoleAdmin)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.PasswordHash = ""

	c.JSON(http.StatusCreated, gin.H{
		"message": "Admin account created successfully",
		"user":    user,
	})
}
