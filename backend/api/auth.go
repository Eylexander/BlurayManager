package api

import (
	"eylexander/bluraymanager/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (api *API) Register(c *gin.Context) {
	i18n := api.GetI18n(c)
	var req struct {
		Username string          `json:"username" binding:"required"`
		Email    string          `json:"email" binding:"required,email"`
		Password string          `json:"password" binding:"required,min=6"`
		Role     models.UserRole `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default to user role if not specified
	if req.Role == "" {
		req.Role = models.RoleUser
	}

	user, err := api.ctrl.RegisterUser(c.Request.Context(), req.Username, req.Email, req.Password, req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Don't send password in response
	user.PasswordHash = ""

	token, err := api.ctrl.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("api.failedToGenerateToken")})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":  user,
		"token": token,
	})
}

func (api *API) Login(c *gin.Context) {
	i18n := api.GetI18n(c)
	var req struct {
		Identifier string `json:"identifier"` // email or username
		Password   string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.identifierRequired")})
		return
	}

	user, err := api.ctrl.Login(c.Request.Context(), req.Identifier, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Don't send password in response
	user.PasswordHash = ""

	token, err := api.ctrl.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("api.failedToGenerateToken")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

func (api *API) GetCurrentUser(c *gin.Context) {
	i18n := api.GetI18n(c)
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)

	id, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidUserID")})
		return
	}

	user, err := api.ctrl.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("user.notFound")})
		return
	}

	// Don't send password in response
	user.PasswordHash = ""

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (api *API) UpdateUserSettings(c *gin.Context) {
	i18n := api.GetI18n(c)
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)

	id, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidUserID")})
		return
	}

	var settings models.UserSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.ctrl.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("user.notFound")})
		return
	}

	user.Settings = settings
	if err := api.ctrl.UpdateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T("api.settingsUpdatedSuccessfully"), "settings": settings})
}

func (api *API) UpdateUsername(c *gin.Context) {
	i18n := api.GetI18n(c)
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)

	id, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidUserID")})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required,min=3,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.ctrl.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("user.notFound")})
		return
	}

	// Check if username is already taken
	existingUser, _ := api.ctrl.GetUserByUsername(c.Request.Context(), req.Username)
	if existingUser != nil && existingUser.ID != user.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("user.usernameAlreadyTaken")})
		return
	}

	user.Username = req.Username
	if err := api.ctrl.UpdateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.PasswordHash = ""
	c.JSON(http.StatusOK, gin.H{"message": i18n.T("api.usernameUpdatedSuccessfully"), "user": user})
}

func (api *API) UpdatePassword(c *gin.Context) {
	i18n := api.GetI18n(c)
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)

	id, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("api.invalidUserID")})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.ctrl.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("user.notFound")})
		return
	}

	// Verify current password
	if err := api.ctrl.VerifyPassword(user, req.CurrentPassword); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("api.invalidCurrentPassword")})
		return
	}

	// Update password
	if err := api.ctrl.UpdatePassword(c.Request.Context(), user, req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T("api.passwordUpdatedSuccessfully")})
}
