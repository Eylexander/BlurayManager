package server

import (
	"eylexander/bluraymanager/api"
	"eylexander/bluraymanager/controller"
	"eylexander/bluraymanager/datastore"
	"eylexander/bluraymanager/models"
	"eylexander/bluraymanager/services"

	"github.com/gin-gonic/gin"
)

// Server handles HTTP routing
type Server struct {
	router               *gin.Engine
	api                  *api.API
	ctrl                 *controller.Controller
	passwordResetHandler *controller.PasswordResetHandler
}

// NewServer creates a new server
func NewServer(ds datastore.Datastore) *Server {
	gin.SetMode(gin.ReleaseMode)

	ctrl := controller.NewController(ds)
	apiHandler := api.NewAPI(ctrl)
	emailService := services.NewEmailService()
	passwordResetHandler := ctrl.NewPasswordResetHandler(ds, emailService)

	router := gin.Default()
	router.Use(ctrl.CORSMiddleware())
	router.Use(ctrl.LocaleMiddleware())

	s := &Server{
		router:               router,
		api:                  apiHandler,
		ctrl:                 ctrl,
		passwordResetHandler: passwordResetHandler,
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// Health check
	s.router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1
	v1 := s.router.Group("/api/v1")
	{
		// Setup routes (public, for initial installation)
		setup := v1.Group("/setup")
		{
			setup.GET("/check", s.api.CheckSetup)
			setup.POST("/install", s.api.InitialSetup)
		}

		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", s.api.Register)
			auth.POST("/login", s.api.Login)
			auth.POST("/forgot-password", s.passwordResetHandler.RequestPasswordReset)
			auth.POST("/reset-password", s.passwordResetHandler.ResetPassword)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(s.ctrl.AuthMiddleware())
		{
			// User routes
			user := protected.Group("/user")
			{
				user.GET("/me", s.api.GetCurrentUser)
				user.PUT("/settings", s.api.UpdateUserSettings)
				user.PUT("/username", s.api.UpdateUsername)
				user.PUT("/password", s.api.UpdatePassword)
			}

			// Bluray routes (all users can view)
			blurays := protected.Group("/blurays")
			{
				blurays.GET("", s.api.ListBlurays)
				blurays.GET("/simplified", s.api.ListSimplifiedBlurays)
				blurays.GET("/search", s.api.SearchBlurays)
				blurays.GET("/:id", s.api.GetBluray)
				blurays.GET("/export", s.api.ExportBlurays)

				// Only admins and moderators can create/update/delete
				blurays.POST("", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.CreateBluray)
				blurays.POST("/import", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.ImportBlurays)
				blurays.PUT("/:id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.UpdateBluray)
				blurays.PUT("/:id/tags", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.UpdateBlurayTags)
				blurays.DELETE("/:id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.DeleteBluray)
			}

			// Tag routes
			tags := protected.Group("/tags")
			{
				tags.GET("", s.api.ListTags)
				tags.GET("/:id", s.api.GetTag)

				// Only and admins and moderators can create/update/delete tags
				tags.POST("", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.CreateTag)
				tags.PUT("/:id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.UpdateTag)
				tags.DELETE("/:id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.DeleteTag)
			}

			// Statistics routes (all authenticated users can view)
			stats := protected.Group("/statistics")
			{
				stats.GET("", s.api.GetStatistics)
				stats.GET("/simplified", s.api.GetSimplifiedStatistics)
			}

			// TMDB routes (only authenticated users who can add blurays can use)
			tmdb := protected.Group("/tmdb")
			{
				tmdb.GET("/search", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.SearchTMDB)
				tmdb.GET("/find/:external_id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.FindByExternalID)
				tmdb.GET("/:type/:id", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.GetTMDBDetails)
			}

			// Barcode lookup route (only authenticated users who can add blurays can use)
			protected.GET("/barcode/:barcode", s.ctrl.RequireRole(models.RoleAdmin, models.RoleModerator), s.api.LookupBarcode)

			// Notification routes
			notifications := protected.Group("/notifications")
			{
				notifications.GET("", s.api.GetNotifications)
				notifications.PUT("/:id/read", s.api.MarkNotificationRead)
				notifications.PUT("/read-all", s.api.MarkAllNotificationsRead)
			}

			// Admin-only routes
			admin := protected.Group("/admin")
			admin.Use(s.ctrl.RequireRole("admin"))
			{
				users := admin.Group("/users")
				{
					users.GET("", s.api.ListUsers)
					users.GET("/:id", s.api.GetUser)
					users.POST("", s.api.CreateUser)
					users.PUT("/:id", s.api.UpdateUser)
					users.DELETE("/:id", s.api.DeleteUser)
					users.PUT("/:id/role", s.api.UpdateUserRole)
				}
			}
		}
	}

	s.router.NoRoute(s.DefaultResponse)
}

// Start starts the HTTP server
func (s *Server) Start(port string) error {
	return s.router.Run(":" + port)
}

// Default response return for unhandled routes
func (s *Server) DefaultResponse(c *gin.Context) {
	c.JSON(404, gin.H{"error": "not found"})
}
