package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
)

const tmdbBaseURL = "https://api.themoviedb.org/3"

// SearchTMDB handles the search endpoint
func (api *API) SearchTMDB(c *gin.Context) {
	i18n := api.GetI18n(c)
	mediaType := c.Query("type")
	query := c.Query("query")
	year := c.Query("year")
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		lang = "en-US"
	}

	if mediaType == "" || query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("tmdb.typeAndQueryRequired")})
		return
	}

	isTVSeries := mediaType == "series"
	if isTVSeries {
		mediaType = "tv"
	}

	params := url.Values{}
	params.Add("api_key", os.Getenv("TMDB_API_KEY"))
	params.Add("query", query)
	params.Add("language", lang)

	// Add year filter if provided
	if year != "" {
		if isTVSeries {
			params.Add("first_air_date_year", year)
		} else {
			params.Add("year", year)
		}
	}

	reqURL := fmt.Sprintf("%s/search/%s?%s", tmdbBaseURL, mediaType, params.Encode())

	result, err := api.fetchTMDB(reqURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToSearch")})
		return
	}

	// Filter results by exact year match if year parameter was provided
	if year != "" {
		if results, ok := result["results"].([]interface{}); ok {
			filteredResults := make([]interface{}, 0)
			for _, item := range results {
				if resultMap, ok := item.(map[string]interface{}); ok {
					// Get release date based on media type
					var releaseDate string
					if isTVSeries {
						if date, ok := resultMap["first_air_date"].(string); ok {
							releaseDate = date
						}
					} else {
						if date, ok := resultMap["release_date"].(string); ok {
							releaseDate = date
						}
					}

					// Extract year from date (format: YYYY-MM-DD)
					if len(releaseDate) >= 4 {
						resultYear := releaseDate[:4]
						if resultYear == year {
							filteredResults = append(filteredResults, item)
						}
					}
				}
			}

			// Only use filtered results if we found matches
			if len(filteredResults) > 0 {
				result["results"] = filteredResults
				result["total_results"] = len(filteredResults)
			}
		}
	}

	c.JSON(http.StatusOK, result)
}

// GetTMDBDetails handles the details endpoint for movies and tv
func (api *API) GetTMDBDetails(c *gin.Context) {
	i18n := api.GetI18n(c)
	mediaType := c.Param("type")
	id := c.Param("id")
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		lang = "en-US"
	}

	if mediaType == "" || id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("tmdb.typeAndIDRequired")})
		return
	}

	if mediaType == "series" {
		mediaType = "tv"
	}

	if mediaType != "movie" && mediaType != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("tmdb.invalidType")})
		return
	}

	apiKey := os.Getenv("TMDB_API_KEY")

	params := url.Values{}
	params.Add("api_key", apiKey)
	params.Add("language", lang)
	if mediaType == "movie" {
		params.Add("append_to_response", "credits")
	}

	reqURL := fmt.Sprintf("%s/%s/%s?%s", tmdbBaseURL, mediaType, id, params.Encode())

	result, err := api.fetchTMDB(reqURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToFetchDetails")})
		return
	}

	result, err = api.enrichWithLocalization(result, mediaType, id, lang, apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToEnrichDetails")})
		return
	}

	switch mediaType {
	case "movie":
		extractMovieDirector(result)
		delete(result, "credits")
	case "tv":
		extractTVCreator(result)
		if name, ok := result["name"]; ok {
			result["title"] = name
		}
	}

	c.JSON(http.StatusOK, result)
}

// fetchTMDB handles the HTTP GET and JSON decoding
func (api *API) fetchTMDB(url string) (map[string]interface{}, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB returned status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// enrichWithLocalization handles the logic for swapping EN/FR data
func (api *API) enrichWithLocalization(result map[string]interface{}, mediaType, id, currentLang, apiKey string) (map[string]interface{}, error) {
	if currentLang != "en-US" && currentLang != "fr-FR" {
		return result, nil
	}

	otherLang := "en-US"
	if currentLang == "en-US" {
		otherLang = "fr-FR"
	}

	params := url.Values{}
	params.Add("api_key", apiKey)
	params.Add("language", otherLang)

	urlLocalized := fmt.Sprintf("%s/%s/%s?%s", tmdbBaseURL, mediaType, id, params.Encode())

	localizedResult, err := api.fetchTMDB(urlLocalized)
	if err != nil {
		return result, nil // Silently fail on localization fetch to preserve main result
	}

	frData := make(map[string]interface{})

	if otherLang == "fr-FR" {
		// Current is English, we fetched French
		frData["overview"] = localizedResult["overview"]
		if genres, ok := localizedResult["genres"]; ok {
			frData["genres"] = genres
		}
	} else {
		// Current is French, we fetched English
		frData["overview"] = result["overview"]
		frData["genres"] = result["genres"]

		// Overwrite with localized English data
		result["title"] = localizedResult["title"]
		if result["title"] == nil {
			result["title"] = localizedResult["name"]
		}
		result["poster_path"] = localizedResult["poster_path"]
		result["overview"] = localizedResult["overview"]
		if genres, ok := localizedResult["genres"]; ok {
			result["genres"] = genres
		}
	}

	result["fr"] = frData
	return result, nil
}

func extractMovieDirector(result map[string]interface{}) {
	creditsRaw, ok := result["credits"].(map[string]interface{})
	if !ok {
		return
	}
	crew, ok := creditsRaw["crew"].([]interface{})
	if !ok {
		return
	}
	for _, member := range crew {
		crewMember, ok := member.(map[string]interface{})
		if !ok {
			continue
		}
		job, okJob := crewMember["job"].(string)
		name, okName := crewMember["name"].(string)
		if okJob && okName && job == "Director" {
			result["director"] = name
			return
		}
	}
}

func extractTVCreator(result map[string]interface{}) {
	createdBy, ok := result["created_by"].([]interface{})
	if !ok || len(createdBy) == 0 {
		return
	}
	creator, ok := createdBy[0].(map[string]interface{})
	if !ok {
		return
	}
	if name, ok := creator["name"].(string); ok {
		result["director"] = name
	}
}

// FindByExternalID handles finding media by external ID (IMDB or TMDB)
func (api *API) FindByExternalID(c *gin.Context) {
	i18n := api.GetI18n(c)
	externalID := c.Param("external_id")
	source := c.Query("source")
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		lang = "en-US"
	}

	if externalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T("tmdb.externalIDRequired")})
		return
	}

	// Default to imdb_id if not specified
	if source == "" {
		source = "imdb_id"
	}

	// If source is tmdb_id, directly get details
	if source == "tmdb_id" {
		// Need to determine if it's a movie or TV show
		// Try movie first, then TV
		mediaType := c.Query("type")
		if mediaType == "" {
			mediaType = "movie"
		}
		if mediaType == "series" {
			mediaType = "tv"
		}

		apiKey := os.Getenv("TMDB_API_KEY")
		params := url.Values{}
		params.Add("api_key", apiKey)
		params.Add("language", lang)
		if mediaType == "movie" {
			params.Add("append_to_response", "credits")
		}

		reqURL := fmt.Sprintf("%s/%s/%s?%s", tmdbBaseURL, mediaType, externalID, params.Encode())
		result, err := api.fetchTMDB(reqURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToFetchDetails")})
			return
		}

		result, err = api.enrichWithLocalization(result, mediaType, externalID, lang, apiKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToEnrichDetails")})
			return
		}

		switch mediaType {
		case "movie":
			extractMovieDirector(result)
			delete(result, "credits")
		case "tv":
			extractTVCreator(result)
			if name, ok := result["name"]; ok {
				result["title"] = name
			}
		}

		result["media_type"] = mediaType
		c.JSON(http.StatusOK, result)
		return
	}

	// For IMDB ID, use TMDB's find endpoint
	apiKey := os.Getenv("TMDB_API_KEY")
	params := url.Values{}
	params.Add("api_key", apiKey)
	params.Add("language", lang)
	params.Add("external_source", source)

	reqURL := fmt.Sprintf("%s/find/%s?%s", tmdbBaseURL, externalID, params.Encode())

	result, err := api.fetchTMDB(reqURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T("tmdb.failedToFind")})
		return
	}

	// The find endpoint returns movie_results and tv_results arrays
	movieResults, hasMovies := result["movie_results"].([]interface{})
	tvResults, hasTVs := result["tv_results"].([]interface{})

	var foundResult map[string]interface{}
	var mediaType string

	if hasMovies && len(movieResults) > 0 {
		foundResult, _ = movieResults[0].(map[string]interface{})
		mediaType = "movie"
	} else if hasTVs && len(tvResults) > 0 {
		foundResult, _ = tvResults[0].(map[string]interface{})
		mediaType = "tv"
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("tmdb.noResultsFound")})
		return
	}

	if foundResult == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T("tmdb.noResultsFound")})
		return
	}

	// Add media_type to the result
	foundResult["media_type"] = mediaType

	c.JSON(http.StatusOK, foundResult)
}
