package test

import (
	"eylexander/bluraymanager/models"
	"testing"
)

func TestUserRoleValid(t *testing.T) {
	for _, r := range []models.UserRole{models.RoleAdmin, models.RoleModerator, models.RoleUser, models.RoleGuest} {
		if !r.Valid() {
			t.Errorf("%q should be valid", r)
		}
	}
	for _, r := range []models.UserRole{"", "superuser", "Admin"} {
		if r.Valid() {
			t.Errorf("%q should be invalid", r)
		}
	}
}
