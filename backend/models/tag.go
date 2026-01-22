package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Tag represents a tag that can be applied to blurays
type Tag struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name" binding:"required"`
	Color       string             `bson:"color" json:"color"` // Hex color code
	Description string             `bson:"description" json:"description"`
	CreatedBy   primitive.ObjectID `bson:"created_by" json:"created_by"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

// CreateTagRequest is the request body for creating a tag
type CreateTagRequest struct {
	Name        string `json:"name" binding:"required"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

// UpdateTagRequest is the request body for updating a tag
type UpdateTagRequest struct {
	Name        *string `json:"name,omitempty"`
	Color       *string `json:"color,omitempty"`
	Description *string `json:"description,omitempty"`
}
