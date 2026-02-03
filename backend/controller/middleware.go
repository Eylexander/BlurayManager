package controller

import (
	"eylexander/bluraymanager/i18n"
	"eylexander/bluraymanager/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// LocaleMiddleware detects language from Accept-Language header and sets i18n in context
func (c *Controller) LocaleMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		acceptLang := ctx.GetHeader("Accept-Language")
		lang := i18n.ParseAcceptLanguage(acceptLang)
		i18nInstance := i18n.NewModule(lang)
		ctx.Set("i18n", i18nInstance)

		// Also store in the request context so it can be accessed by controller methods
		newCtx := i18n.WithI18n(ctx.Request.Context(), i18nInstance)
		ctx.Request = ctx.Request.WithContext(newCtx)

		ctx.Next()
	}
}

// AuthMiddleware validates JWT token and attaches claims to context
func (c *Controller) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		i18n := c.GetI18n(ctx)
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.authorizationHeaderRequired")})
			ctx.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.invalidAuthorizationHeaderFormat")})
			ctx.Abort()
			return
		}

		tokenString := tokenParts[1]
		claims, err := c.ValidateToken(tokenString)
		if err != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.invalid")})
			ctx.Abort()
			return
		}

		// Attach claims to context
		ctx.Set("claims", claims)
		ctx.Set("userID", claims.UserID)
		ctx.Set("username", claims.Username)
		ctx.Set("email", claims.Email)
		ctx.Set("role", claims.Role)

		ctx.Next()
	}
}

// RequireRole checks if user has the required role
func (c *Controller) RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		i18n := c.GetI18n(ctx)
		claimsInterface, exists := ctx.Get("claims")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.unauthorized")})
			ctx.Abort()
			return
		}

		claims := claimsInterface.(*Claims)

		// Check if user role is in allowed roles
		allowed := false
		for _, role := range allowedRoles {
			if claims.Role == role {
				allowed = true
				break
			}
		}

		if !allowed {
			ctx.JSON(http.StatusForbidden, gin.H{"error": i18n.T("jwt.insufficientPermissions")})
			ctx.Abort()
			return
		}

		ctx.Next()
	}
}

// CORSMiddleware handles CORS
func (c *Controller) CORSMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		ctx.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		ctx.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		ctx.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if ctx.Request.Method == "OPTIONS" {
			ctx.AbortWithStatus(204)
			return
		}

		ctx.Next()
	}
}
