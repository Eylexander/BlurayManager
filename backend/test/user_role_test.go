package models

import "testing"

func TestUserRoleValid(t *testing.T) {
	for _, r := range []UserRole{RoleAdmin, RoleModerator, RoleUser, RoleGuest} {
		if !r.Valid() {
			t.Errorf("%q should be valid", r)
		}
	}
	for _, r := range []UserRole{"", "superuser", "Admin"} {
		if r.Valid() {
			t.Errorf("%q should be invalid", r)
		}
	}
}
