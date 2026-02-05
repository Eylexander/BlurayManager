package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// LookupBarcode handles barcode lookup requests
func (api *API) LookupBarcode(c *gin.Context) {
	barcode := c.Param("barcode")

	if barcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Barcode is required"})
		return
	}

	// Call controller to perform the lookup
	items, err := api.ctrl.LookupBarcode(c.Request.Context(), barcode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return in format expected by frontend
	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": len(items),
	})
}
