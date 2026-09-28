package controller

import (
	"errors"
	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/i18n"
	"eylexander/bluraymanager/models"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

		// Refresh identity and role from the database: a token lives for 24h,
		// and a role change or account deletion must apply immediately rather
		// than when the token expires.
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.invalid")})
			ctx.Abort()
			return
		}
		user, err := c.ds.GetUserByID(ctx.Request.Context(), userID)
		if errors.Is(err, datastore.ErrUserNotFound) {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T("jwt.invalid")})
			ctx.Abort()
			return
		}
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		claims.Username = user.Username
		claims.Email = user.Email
		claims.Role = user.Role

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

// DenyRole rejects callers with any of the given roles. Used to keep the
// shared guest account from changing its own credentials, which would lock
// everyone else out of guest access.
func (c *Controller) DenyRole(deniedRoles ...models.UserRole) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		role, _ := ctx.Get("role")
		if slices.Contains(deniedRoles, role.(models.UserRole)) {
			ctx.JSON(http.StatusForbidden, gin.H{"error": c.GetI18n(ctx).T("jwt.insufficientPermissions")})
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}

// CORSMiddleware handles CORS. With no allowed origins configured every
// origin is accepted, which is safe because auth travels in the
// Authorization header rather than in cookies. In production the frontend
// and API share one origin behind the reverse proxy, so CORS never applies.
func (c *Controller) CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		header := ctx.Writer.Header()
		if len(allowedOrigins) == 0 {
			header.Set("Access-Control-Allow-Origin", "*")
		} else {
			header.Add("Vary", "Origin")
			if origin := ctx.GetHeader("Origin"); slices.Contains(allowedOrigins, origin) {
				header.Set("Access-Control-Allow-Origin", origin)
			}
		}
		header.Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, Accept-Language, Authorization, accept, origin, Cache-Control, X-Requested-With")
		header.Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if ctx.Request.Method == http.MethodOptions {
			ctx.AbortWithStatus(http.StatusNoContent)
			return
		}

		ctx.Next()
	}
}

// SecurityHeaders sets baseline hardening headers on every response.
func SecurityHeaders() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		header := ctx.Writer.Header()
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-Frame-Options", "DENY")
		header.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		ctx.Next()
	}
}

// MaxBodySize rejects request bodies larger than the given number of bytes.
func MaxBodySize(limit int64) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Request.Body = http.MaxBytesReader(ctx.Writer, ctx.Request.Body, limit)
		ctx.Next()
	}
}

// RateLimiter caps requests per client IP within a fixed window. It is
// in-memory and per-instance, which is enough for a single-replica deployment.
type RateLimiter struct {
	mu       sync.Mutex
	max      int
	window   time.Duration
	visitors map[string]*visitor
}

type visitor struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{max: maxRequests, window: window, visitors: map[string]*visitor{}}
}

func (rl *RateLimiter) allow(ip string, now time.Time) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, ok := rl.visitors[ip]
	if !ok || now.After(v.resetAt) {
		// Sweep expired entries on insert so the map can't grow without bound.
		for key, old := range rl.visitors {
			if now.After(old.resetAt) {
				delete(rl.visitors, key)
			}
		}
		v = &visitor{resetAt: now.Add(rl.window)}
		rl.visitors[ip] = v
	}
	v.count++
	return v.count <= rl.max
}

func (c *Controller) RateLimit(rl *RateLimiter) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if !rl.allow(ctx.ClientIP(), time.Now()) {
			ctx.JSON(http.StatusTooManyRequests, gin.H{"error": c.GetI18n(ctx).T("api.tooManyRequests")})
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
