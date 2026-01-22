package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (api *API) GetStatistics(c *gin.Context) {
	stats, err := api.ctrl.GetStatistics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"statistics": stats})
}
