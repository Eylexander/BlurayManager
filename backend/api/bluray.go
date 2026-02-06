package api

import (
	"eylexander/bluraymanager/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"
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
	api.ctrl.CreateNotification(c.Request.Context(), notification)

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
	api.ctrl.CreateNotification(c.Request.Context(), notification)

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

func (api *API) ExportBlurays(c *gin.Context) {
	blurays, err := api.ctrl.ListBlurays(c.Request.Context(), map[string]interface{}{}, 0, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create CSV content with UTF-8 BOM
	csv := "\xEF\xBB\xBF" + "Title,Type,GenreEn,GenreFr,DescriptionEn,DescriptionFr,Director,ReleaseYear,Runtime,Rating,PurchasePrice,PurchaseDate,CoverImageURL,BackdropURL,TMDBID,Tags,Seasons,TotalEpisodes\n"

	for _, bluray := range blurays {
		// Escape and format fields
		tags := ""
		if len(bluray.Tags) > 0 {
			for i, tag := range bluray.Tags {
				if i > 0 {
					tags += ";"
				}
				tags += tag
			}
		}

		genreEn := ""
		if len(bluray.Genre.En) > 0 {
			for i, g := range bluray.Genre.En {
				if i > 0 {
					genreEn += ";"
				}
				genreEn += g
			}
		}

		genreFr := ""
		if len(bluray.Genre.Fr) > 0 {
			for i, g := range bluray.Genre.Fr {
				if i > 0 {
					genreFr += ";"
				}
				genreFr += g
			}
		}

		releaseYear := ""
		if bluray.ReleaseYear != 0 {
			releaseYear = strconv.Itoa(bluray.ReleaseYear)
		}

		runtime := ""
		if bluray.Runtime != 0 {
			runtime = strconv.Itoa(bluray.Runtime)
		}

		rating := ""
		if bluray.Rating != 0 {
			rating = strconv.FormatFloat(bluray.Rating, 'f', 1, 64)
		}

		purchasePrice := ""
		if bluray.PurchasePrice != 0 {
			purchasePrice = strconv.FormatFloat(bluray.PurchasePrice, 'f', 2, 64)
		}

		// Serialize seasons data (format: "number:episodeCount:year;number:episodeCount:year")
		seasons := ""
		if len(bluray.Seasons) > 0 {
			for i, season := range bluray.Seasons {
				if i > 0 {
					seasons += ";"
				}
				seasons += strconv.Itoa(season.Number) + ":" + strconv.Itoa(season.EpisodeCount)
				if season.Year != 0 {
					seasons += ":" + strconv.Itoa(season.Year)
				}
			}
		}

		totalEpisodes := ""
		if bluray.TotalEpisodes != 0 {
			totalEpisodes = strconv.Itoa(bluray.TotalEpisodes)
		}

		purchaseDate := ""
		if !bluray.PurchaseDate.IsZero() {
			purchaseDate = bluray.PurchaseDate.Format("2006-01-02")
		}

		// Escape quotes in strings
		title := escapeCSV(bluray.Title)
		descEn := escapeCSV(bluray.Description.En)
		descFr := escapeCSV(bluray.Description.Fr)
		director := escapeCSV(bluray.Director)
		coverURL := escapeCSV(bluray.CoverImageURL)
		backdropURL := escapeCSV(bluray.BackdropURL)
		tmdbID := escapeCSV(bluray.TMDBID)
		typeStr := string(bluray.Type)

		csv += title + "," + typeStr + "," + genreEn + "," + genreFr + "," + descEn + "," + descFr + "," + director + "," +
			releaseYear + "," + runtime + "," + rating + "," + purchasePrice + "," +
			purchaseDate + "," + coverURL + "," + backdropURL + "," + tmdbID + "," + tags + "," +
			seasons + "," + totalEpisodes + "\n"
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=bluray-collection.csv")
	c.String(http.StatusOK, csv)
}

func (api *API) ImportBlurays(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	// Open the uploaded file
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file"})
		return
	}
	defer f.Close()

	// Read CSV content
	content, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	// Convert to string and strip UTF-8 BOM if present
	csvContent := string(content)
	if len(csvContent) >= 3 && csvContent[0] == '\xEF' && csvContent[1] == '\xBB' && csvContent[2] == '\xBF' {
		csvContent = csvContent[3:]
	}

	// Validate UTF-8 encoding
	if !utf8.ValidString(csvContent) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid UTF-8 encoding in file"})
		return
	}

	// Parse CSV
	lines := parseCSVLines(csvContent)
	if len(lines) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV file is empty or invalid"})
		return
	}

	success := 0
	failed := 0
	skipped := 0
	errors := []string{}

	// Skip header row
	for i := 1; i < len(lines); i++ {
		fields := lines[i]
		if len(fields) < 18 {
			errors = append(errors, "Line "+strconv.Itoa(i+1)+": insufficient fields")
			failed++
			continue
		}

		// Parse fields
		releaseYear, _ := strconv.Atoi(fields[7])
		runtime, _ := strconv.Atoi(fields[8])
		rating, _ := strconv.ParseFloat(fields[9], 64)
		purchasePrice, _ := strconv.ParseFloat(fields[10], 64)
		totalEpisodes, _ := strconv.Atoi(fields[17])

		// Parse purchase date
		var purchaseDate time.Time
		if fields[11] != "" {
			purchaseDate, _ = time.Parse("2006-01-02", fields[11])
		}

		// Split tags
		var tags []string
		if fields[15] != "" {
			tags = parseCSVTags(fields[15])
		}

		// Split genres
		var genreEn []string
		if fields[2] != "" {
			genreEn = parseCSVTags(fields[2])
		}

		var genreFr []string
		if fields[3] != "" {
			genreFr = parseCSVTags(fields[3])
		}

		// Parse seasons data (format: "number:episodeCount:year;number:episodeCount:year")
		var seasons []models.Season
		if fields[16] != "" {
			seasonParts := parseCSVTags(fields[16])
			for _, part := range seasonParts {
				if part == "" {
					continue
				}
				seasonData := []string{}
				current := ""
				for _, ch := range part {
					if ch == ':' {
						seasonData = append(seasonData, current)
						current = ""
					} else {
						current += string(ch)
					}
				}
				if current != "" {
					seasonData = append(seasonData, current)
				}

				if len(seasonData) >= 2 {
					number, _ := strconv.Atoi(seasonData[0])
					episodeCount, _ := strconv.Atoi(seasonData[1])
					season := models.Season{
						Number:       number,
						EpisodeCount: episodeCount,
					}
					if len(seasonData) >= 3 {
						year, _ := strconv.Atoi(seasonData[2])
						season.Year = year
					}
					seasons = append(seasons, season)
				}
			}
		}

		// Parse media type
		mediaType := models.MediaTypeMovie
		if fields[1] == "series" {
			mediaType = models.MediaTypeSeries
		}

		// Check for duplicates based on title, type, and release year
		filters := map[string]interface{}{
			"title": fields[0],
			"type":  string(mediaType),
		}
		if releaseYear != 0 {
			filters["release_year"] = releaseYear
		}

		existingBlurays, err := api.ctrl.ListBlurays(c.Request.Context(), filters, 0, 1)
		if err == nil && len(existingBlurays) > 0 {
			// Duplicate found, skip this entry
			skipped++
			continue
		}

		bluray := &models.Bluray{
			Title: fields[0],
			Type:  mediaType,
			Genre: models.I18nTextArray{
				En: genreEn,
				Fr: genreFr,
			},
			Description: models.I18nText{
				En: fields[4],
				Fr: fields[5],
			},
			Director:      fields[6],
			ReleaseYear:   releaseYear,
			Runtime:       runtime,
			Rating:        rating,
			PurchasePrice: purchasePrice,
			PurchaseDate:  purchaseDate,
			CoverImageURL: fields[12],
			BackdropURL:   fields[13],
			TMDBID:        fields[14],
			Tags:          tags,
			Seasons:       seasons,
			TotalEpisodes: totalEpisodes,
		}

		if err := api.ctrl.CreateBluray(c.Request.Context(), bluray); err != nil {
			errors = append(errors, "Line "+strconv.Itoa(i+1)+": "+err.Error())
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

	blurays, err := api.ctrl.ListSimplifiedBlurays(c.Request.Context(), filters, skip, limit)
	if err != nil {
		log.Printf("ERROR ListBlurays: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blurays": blurays})
}
