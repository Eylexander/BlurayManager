package api

import (
	"eylexander/bluraymanager/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CheckSetup checks if the system needs initial setup (no admin exists)
func (api *API) CheckSetup(c *gin.Context) {
	ctx := c.Request.Context()

	// Try to find an admin user
	users, err := api.ctrl.ListUsers(ctx, 0, 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	needsSetup := true
	if len(users) > 0 {
		// Check if any admin exists
		allUsers, _ := api.ctrl.ListUsers(ctx, 0, 100)
		for _, user := range allUsers {
			if user.Role == models.RoleAdmin {
				needsSetup = false
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"needsSetup": needsSetup})
}

// InitialSetup creates the first admin user
func (api *API) InitialSetup(c *gin.Context) {
	ctx := c.Request.Context()

	// Check if any admin already exists
	allUsers, _ := api.ctrl.ListUsers(ctx, 0, 100)
	for _, user := range allUsers {
		if user.Role == models.RoleAdmin {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Admin already exists"})
			return
		}
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
