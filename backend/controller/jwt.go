package controller

import (
	"errors"
	"eylexander/bluraymanager/models"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Claims struct {
	UserID   string          `json:"user_id"`
	Username string          `json:"username"`
	Email    string          `json:"email"`
	Role     models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func (c *Controller) GenerateToken(user *models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-this-in-production"
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:   user.ID.Hex(),
		Username: user.Username,
		Email:    user.Email,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (c *Controller) ValidateToken(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-this-in-production"
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New(c.i18n.T("jwt.invalid"))
	}

	return claims, nil
}

func (c *Controller) GetUserIDFromClaims(claims *Claims) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(claims.UserID)
}
