package controller

import (
	"crypto/rand"
	"log"
	"net/http"
	"strings"
	"time"

	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/services"

	"github.com/gin-gonic/gin"
)

type PasswordResetHandler struct {
	store        datastore.Datastore
	emailService *services.EmailService
	ctrl         *Controller
	appURL       string
}

type RequestPasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// NewPasswordResetHandler builds the reset flow. appURL is the public
// frontend URL used in reset links; when empty, the request's Origin header
// is used instead, which a caller can forge to point the emailed link (and
// its token) at another host, so APP_URL should be set in production.
func (c *Controller) NewPasswordResetHandler(store datastore.Datastore, emailService *services.EmailService, appURL string) *PasswordResetHandler {
	return &PasswordResetHandler{
		store:        store,
		emailService: emailService,
		ctrl:         c,
		appURL:       strings.TrimRight(appURL, "/"),
	}
}

// RequestPasswordReset handles password reset requests
func (h *PasswordResetHandler) RequestPasswordReset(ctx *gin.Context) {
	i18n := h.ctrl.GetI18n(ctx)
	var req RequestPasswordResetRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("passwordReset.invalidRequest")})
		return
	}

	// Check if SMTP is configured
	if !h.emailService.IsConfigured() {
		ctx.JSON(http.StatusServiceUnavailable, gin.H{"error": i18n.T("passwordReset.emailServiceNotConfigured")})
		return
	}

	// Get user by email
	user, err := h.store.GetUserByEmail(ctx.Request.Context(), req.Email)
	if err != nil {
		// Don't reveal if email exists or not for security
		ctx.JSON(http.StatusOK, gin.H{"message": i18n.T("passwordReset.resetLinkSent")})
		return
	}

	token := rand.Text()
	expiresAt := time.Now().Add(1 * time.Hour)

	// Store reset token
	err = h.store.CreatePasswordResetToken(user.ID.Hex(), token, expiresAt)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("passwordReset.failedToCreateResetToken")})
		return
	}

	// Send email
	appURL := h.appURL
	if appURL == "" {
		appURL = ctx.GetHeader("Origin")
	}
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	err = h.emailService.SendPasswordResetEmail(user.Email, token, appURL)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("passwordReset.failedToSendResetEmail")})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": i18n.T("passwordReset.resetLinkSent")})
}

// ResetPassword handles password reset with token
func (h *PasswordResetHandler) ResetPassword(ctx *gin.Context) {
	i18n := h.ctrl.GetI18n(ctx)
	var req ResetPasswordRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("passwordReset.invalidRequest")})
		return
	}

	// Verify reset token
	userID, err := h.store.VerifyPasswordResetToken(req.Token)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("passwordReset.invalidOrExpiredToken")})
		return
	}

	// Update password
	err = h.store.UpdateUserPassword(userID, req.NewPassword)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("passwordReset.failedToUpdatePassword")})
		return
	}

	// The password is already changed; a leftover token just expires on its own.
	if err := h.store.DeletePasswordResetToken(req.Token); err != nil {
		log.Printf("failed to delete used password reset token: %v", err)
	}

	ctx.JSON(http.StatusOK, gin.H{"message": i18n.T("passwordReset.passwordResetSuccessfully")})
}
