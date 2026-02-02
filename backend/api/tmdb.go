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
	mediaType := c.Query("type")
	query := c.Query("query")
	lang := api.getRequestedLanguage(c)

	if mediaType == "" || query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and query parameters are required"})
		return
	}
	if mediaType == "series" {
		mediaType = "tv"
	}

	params := url.Values{}
	params.Add("api_key", os.Getenv("TMDB_API_KEY"))
	params.Add("query", query)
	params.Add("language", lang)

	reqURL := fmt.Sprintf("%s/search/%s?%s", tmdbBaseURL, mediaType, params.Encode())

	result, err := api.fetchTMDB(reqURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search TMDB"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTMDBDetails handles the details endpoint for movies and tv
func (api *API) GetTMDBDetails(c *gin.Context) {
	mediaType := c.Param("type")
	id := c.Param("id")
	lang := api.getRequestedLanguage(c)

	if mediaType == "" || id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and id are required"})
		return
	}

	if mediaType == "series" {
		mediaType = "tv"
	}

	if mediaType != "movie" && mediaType != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'movie' or 'tv'"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch TMDB details"})
		return
	}

	result, err = api.enrichWithLocalization(result, mediaType, id, lang, apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enrich TMDB details with localization"})
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
