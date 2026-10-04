package api

import (
	"bytes"
	"eylexander/bluraymanager/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (api *API) CreateBluray(c *gin.Context) {
	var bluray models.Bluray
	if err := c.ShouldBindJSON(&bluray); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)
	id, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	bluray.AddedBy = id

	if err := api.ctrl.CreateBluray(c.Request.Context(), &bluray); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create notification
	i18n := api.GetI18n(c)
	notification := &models.Notification{
		UserID:   id,
		Type:     models.NotificationBlurayAdded,
		Message:  fmt.Sprintf(i18n.T("notification.bluray_added"), bluray.Title),
		BlurayID: bluray.ID,
	}
	// The mutation already succeeded; a missing notification isn't worth failing the request.
	if err := api.ctrl.CreateNotification(c.Request.Context(), notification); err != nil {
		log.Printf("failed to create notification: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{"bluray": bluray})
}

func (api *API) GetBluray(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	bluray, err := api.ctrl.GetBlurayByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "bluray not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bluray": bluray})
}

func (api *API) UpdateBluray(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var bluray models.Bluray
	if err := c.ShouldBindJSON(&bluray); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bluray.ID = id
	if err := api.ctrl.UpdateBluray(c.Request.Context(), &bluray); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bluray": bluray})
}

func (api *API) UpdateBlurayTags(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Tags []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bluray, err := api.ctrl.GetBlurayByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "bluray not found"})
		return
	}

	bluray.Tags = req.Tags
	if err := api.ctrl.UpdateBluray(c.Request.Context(), bluray); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bluray": bluray})
}

func (api *API) DeleteBluray(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Get bluray details before deleting
	bluray, err := api.ctrl.GetBlurayByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "bluray not found"})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := userID.(string)
	uid, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	if err := api.ctrl.DeleteBluray(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create notification
	i18n := api.GetI18n(c)
	notification := &models.Notification{
		UserID:   uid,
		Type:     models.NotificationBlurayRemoved,
		Message:  fmt.Sprintf(i18n.T("notification.bluray_deleted"), bluray.Title),
		BlurayID: id,
	}
	// The mutation already succeeded; a missing notification isn't worth failing the request.
	if err := api.ctrl.CreateNotification(c.Request.Context(), notification); err != nil {
		log.Printf("failed to create notification: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "bluray deleted successfully"})
}

func (api *API) ListBlurays(c *gin.Context) {
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filters := make(map[string]interface{})
	if mediaType := c.Query("type"); mediaType != "" {
		filters["type"] = mediaType
	}
	if genre := c.Query("genre"); genre != "" {
		filters["genre"] = genre
	}
	if tmdbID := c.Query("tmdb_id"); tmdbID != "" {
		filters["tmdb_id"] = tmdbID
	}

	blurays, err := api.ctrl.ListBlurays(c.Request.Context(), filters, skip, limit)
	if err != nil {
		log.Printf("ERROR ListBlurays: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blurays": blurays})
}

func (api *API) SearchBlurays(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query required"})
		return
	}

	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	blurays, err := api.ctrl.SearchBlurays(c.Request.Context(), query, skip, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blurays": blurays})
}

// ExportBlurays downloads the collection as CSV. With ?template=true it
// returns only the header row, as a starting point for hand-made imports.
func (api *API) ExportBlurays(c *gin.Context) {
	ctx := c.Request.Context()
	var blurays []*models.Bluray
	if c.Query("template") != "true" {
		var err error
		blurays, err = api.ctrl.ListBlurays(ctx, map[string]interface{}{}, 0, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Write tag names rather than IDs so the file can be imported elsewhere.
		tags, err := api.ctrl.ListTags(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		resolver := NewTagResolver(tags)
		for i, b := range blurays {
			named := *b
			named.Tags = resolver.Names(b.Tags)
			blurays[i] = &named
		}
	}

	var buf bytes.Buffer
	if err := WriteBluraysCSV(&buf, blurays); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=bluray-collection.csv")
	c.Data(http.StatusOK, "text/csv; charset=utf-8", buf.Bytes())
}

func (api *API) ImportBlurays(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file"})
		return
	}
	defer f.Close()

	content, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	if !utf8.Valid(content) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid UTF-8 encoding in file"})
		return
	}

	records, err := ReadBluraysCSV(bytes.NewReader(content))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	success, failed, skipped, tagsCreated := 0, 0, 0, 0
	errors := []string{}

	tags, err := api.ctrl.ListTags(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tagResolver := NewTagResolver(tags)
	userID, _ := primitive.ObjectIDFromHex(c.GetString("userID"))

	for i, fields := range records {
		// +2: records exclude the header row, and file lines are 1-indexed.
		line := "Line " + strconv.Itoa(i+2) + ": "

		bluray, err := RecordToBluray(fields)
		if err != nil {
			errors = append(errors, line+err.Error())
			failed++
			continue
		}

		// Map tag names (or IDs from older exports) to this instance's tags,
		// creating the ones that don't exist yet.
		tagIDs, missing := tagResolver.Resolve(bluray.Tags)
		for _, name := range missing {
			tag := &models.Tag{Name: name, Color: defaultTagColor, CreatedBy: userID}
			if err := api.ctrl.CreateTag(ctx, tag); err != nil {
				errors = append(errors, line+"tag \""+name+"\": "+err.Error())
				continue
			}
			tagResolver.add(tag)
			tagIDs = append(tagIDs, tag.ID.Hex())
			tagsCreated++
		}
		bluray.Tags = tagIDs

		// Skip duplicates based on title, type, and release year
		filters := map[string]interface{}{
			"title": bluray.Title,
			"type":  string(bluray.Type),
		}
		if bluray.ReleaseYear != 0 {
			filters["release_year"] = bluray.ReleaseYear
		}
		existing, err := api.ctrl.ListBlurays(ctx, filters, 0, 1)
		if err == nil && len(existing) > 0 {
			skipped++
			continue
		}

		if err := api.ctrl.CreateBluray(ctx, bluray); err != nil {
			errors = append(errors, line+err.Error())
			failed++
		} else {
			success++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"failed":  failed,
		"skipped": skipped,
		"errors":  errors,
		// Tags created because the file referenced names this instance lacked
		"tagsCreated": tagsCreated,
	})
}

func (api *API) ListSimplifiedBlurays(c *gin.Context) {
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filters := make(map[string]interface{})
	if mediaType := c.Query("type"); mediaType != "" {
		filters["type"] = mediaType
	}
	if genre := c.Query("genre"); genre != "" {
		filters["genre"] = genre
	}
	if tmdbID := c.Query("tmdb_id"); tmdbID != "" {
		filters["tmdb_id"] = tmdbID
	}

	blurays, err := api.ctrl.ListSimplifiedBlurays(c.Request.Context(), filters, skip, limit)
	if err != nil {
		log.Printf("ERROR ListBlurays: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blurays": blurays})
}
