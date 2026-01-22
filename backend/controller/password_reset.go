package controller

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/services"

	"github.com/gin-gonic/gin"
)

type PasswordResetHandler struct {
	store        datastore.Datastore
	emailService *services.EmailService
}

type RequestPasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (c *Controller) NewPasswordResetHandler(store datastore.Datastore, emailService *services.EmailService) *PasswordResetHandler {
	return &PasswordResetHandler{
		store:        store,
		emailService: emailService,
	}
}

// RequestPasswordReset handles password reset requests
func (h *PasswordResetHandler) RequestPasswordReset(ctx *gin.Context) {
	var req RequestPasswordResetRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if SMTP is configured
	if !h.emailService.IsConfigured() {
		ctx.JSON(http.StatusServiceUnavailable, gin.H{"error": "Email service is not configured"})
		return
	}

	// Get user by email
	user, err := h.store.GetUserByEmail(ctx.Request.Context(), req.Email)
	if err != nil {
		// Don't reveal if email exists or not for security
		ctx.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
		return
	}

	// Generate reset token
	token := generateResetToken()
	expiresAt := time.Now().Add(1 * time.Hour)

	// Store reset token
	err = h.store.CreatePasswordResetToken(user.ID.Hex(), token, expiresAt)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reset token"})
		return
	}

	// Send email
	appURL := ctx.GetHeader("Origin")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	err = h.emailService.SendPasswordResetEmail(user.Email, token, appURL)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send reset email"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
}

// ResetPassword handles password reset with token
func (h *PasswordResetHandler) ResetPassword(ctx *gin.Context) {
	var req ResetPasswordRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify reset token
	userID, err := h.store.VerifyPasswordResetToken(req.Token)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Update password
	err = h.store.UpdateUserPassword(userID, req.NewPassword)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Delete used token
	h.store.DeletePasswordResetToken(req.Token)

	ctx.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func generateResetToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
