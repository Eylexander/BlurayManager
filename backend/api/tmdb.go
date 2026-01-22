package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const tmdbBaseURL = "https://api.themoviedb.org/3"

// SearchTMDB searches for movies or TV shows on TMDB
func (api *API) SearchTMDB(c *gin.Context) {
	mediaType := c.Query("type") // "movie" or "tv"
	query := c.Query("query")    // search query

	if mediaType == "" || query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and query parameters are required"})
		return
	}

	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TMDB API key not configured"})
		return
	}

	// Make request to TMDB
	url := fmt.Sprintf("%s/search/%s?api_key=%s&query=%s", tmdbBaseURL, mediaType, apiKey, query)
	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search TMDB"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read TMDB response"})
		return
	}

	// Forward the response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse TMDB response"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTMDBDetails gets detailed information about a movie or TV show
func (api *API) GetTMDBDetails(c *gin.Context) {
	mediaType := c.Param("type") // "movie" or "tv"
	id := c.Param("id")          // TMDB ID

	if mediaType == "" || id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and id are required"})
		return
	}

	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TMDB API key not configured"})
		return
	}

	// Fetch English version
	urlEn := fmt.Sprintf("%s/%s/%s?api_key=%s&language=en-US&append_to_response=credits", tmdbBaseURL, mediaType, id, apiKey)
	respEn, err := http.Get(urlEn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch TMDB details"})
		return
	}
	defer respEn.Body.Close()

	bodyEn, err := io.ReadAll(respEn.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read TMDB response"})
		return
	}

	var resultEn map[string]interface{}
	if err := json.Unmarshal(bodyEn, &resultEn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse TMDB response"})
		return
	}

	// Fetch French version for description
	urlFr := fmt.Sprintf("%s/%s/%s?api_key=%s&language=fr-FR", tmdbBaseURL, mediaType, id, apiKey)
	respFr, err := http.Get(urlFr)
	if err == nil {
		defer respFr.Body.Close()
		bodyFr, err := io.ReadAll(respFr.Body)
		if err == nil {
			var resultFr map[string]interface{}
			if err := json.Unmarshal(bodyFr, &resultFr); err == nil {
				// Add French description to the result
				if overviewFr, ok := resultFr["overview"].(string); ok && overviewFr != "" {
					resultEn["overview_fr"] = overviewFr
				}
			}
		}
	}

	c.JSON(http.StatusOK, resultEn)
}
