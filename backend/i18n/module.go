package i18n

import (
	"context"
	"strings"
)

type contextKey string

const i18nContextKey contextKey = "i18n"

type I18n struct {
	lang string
}

func NewModule(lang string) *I18n {
	return &I18n{lang: lang}
}

// Func to change language
func (i *I18n) SetLanguage(lang string) {
	i.lang = lang
}

func (i *I18n) T(key string) string {
	if _, ok := Messages[i.lang]; !ok {
		i.lang = "en-US" // Fallback
	}
	return Messages[i.lang][key]
}

// GetI18nFromContext retrieves i18n from standard Go context
func GetI18nFromContext(ctx context.Context) *I18n {
	if i18nInterface := ctx.Value(i18nContextKey); i18nInterface != nil {
		if i18nInstance, ok := i18nInterface.(*I18n); ok {
			return i18nInstance
		}
	}
	// Fallback to en-US if not found
	return NewModule("en-US")
}

// WithI18n adds i18n to the context
func WithI18n(ctx context.Context, i18n *I18n) context.Context {
	return context.WithValue(ctx, i18nContextKey, i18n)
}

// ParseAcceptLanguage extracts the best matching language from Accept-Language header
func ParseAcceptLanguage(acceptLang string) string {
	if acceptLang == "" {
		return "en-US"
	}

	// Split by comma to get all language preferences
	langs := strings.Split(acceptLang, ",")
	for _, lang := range langs {
		// Remove quality factors (e.g., ";q=0.9")
		lang = strings.TrimSpace(strings.Split(lang, ";")[0])

		// Check if we have messages for this language
		if _, ok := Messages[lang]; ok {
			return lang
		}

		// Try without region (e.g., "fr" from "fr-FR")
		if parts := strings.Split(lang, "-"); len(parts) > 1 {
			baseLanguage := parts[0]
			for supportedLang := range Messages {
				if strings.HasPrefix(supportedLang, baseLanguage) {
					return supportedLang
				}
			}
		}
	}

	return "en-US" // Default fallback
}

var Messages = map[string]map[string]string{
	"en-US": {
		"notification.bluray_added":               "Bluray '%s' has been added to your collection.",
		"notification.bluray_updated":             "Bluray '%s' has been updated.",
		"notification.bluray_deleted":             "Bluray '%s' has been deleted from your collection.",
		"bluray.duplicateTMDBID":                  "A bluray with the same TMDB ID already exists.",
		"bluray.titleRequired":                    "Title is required.",
		"jwt.invalid":                             "Invalid JWT token.",
		"jwt.authorizationHeaderRequired":         "Authorization header is required.",
		"jwt.invalidAuthorizationHeaderFormat":    "Invalid authorization header format.",
		"jwt.unauthorized":                        "Unauthorized.",
		"jwt.insufficientPermissions":             "Insufficient permissions.",
		"passwordReset.invalidRequest":            "Invalid password reset request.",
		"passwordReset.emailServiceNotConfigured": "Email service is not configured.",
		"passwordReset.resetLinkSent":             "If an account with that email exists, a reset link has been sent.",
		"passwordReset.failedToCreateResetToken":  "Failed to create reset token.",
		"passwordReset.failedToSendResetEmail":    "Failed to send reset email.",
		"passwordReset.invalidOrExpiredToken":     "Invalid or expired reset token.",
		"passwordReset.failedToUpdatePassword":    "Failed to update password.",
		"passwordReset.passwordResetSuccessfully": "Password has been reset successfully.",
		"tag.nameRequired":                        "Tag name is required.",
		"tag.duplicateTagName":                    "A tag with that name already exists.",
		"tag.notFound":                            "Tag not found.",
		"tag.deletedSuccessfully":                 "Tag deleted successfully.",
		"user.emailAlreadyRegistered":             "Email is already registered.",
		"user.usernameAlreadyTaken":               "Username is already taken.",
		"user.invalidCredentials":                 "Invalid credentials.",
		"user.notFound":                           "User not found.",
		"api.invalidUserID":                       "Invalid user ID.",
		"api.invalidID":                           "Invalid ID.",
		"api.identifierRequired":                  "Identifier is required.",
		"api.failedToGenerateToken":               "Failed to generate token.",
		"api.settingsUpdatedSuccessfully":         "Settings updated successfully.",
		"api.usernameUpdatedSuccessfully":         "Username updated successfully.",
		"api.emailUpdatedSuccessfully":            "Email updated successfully.",
		"api.passwordUpdatedSuccessfully":         "Password updated successfully.",
		"api.currentPasswordRequired":             "Current password is required.",
		"api.invalidCurrentPassword":              "Invalid current password.",
		"setup.adminAlreadyExists":                "Admin already exists.",
		"setup.setupCompletedSuccessfully":        "Setup completed successfully.",
		"tmdb.typeAndQueryRequired":               "Type and query parameters are required.",
		"tmdb.failedToSearch":                     "Failed to search TMDB.",
		"tmdb.typeAndIDRequired":                  "Type and ID are required.",
		"tmdb.invalidType":                        "Type must be 'movie' or 'tv'.",
		"tmdb.failedToFetchDetails":               "Failed to fetch TMDB details.",
		"tmdb.failedToEnrichDetails":              "Failed to enrich TMDB details with localization.",
	},
	"fr-FR": {
		"notification.bluray_added":                "Le Bluray '%s' a été ajouté à votre collection.",
		"notification.bluray_updated":              "Le Bluray '%s' a été mis à jour.",
		"notification.bluray_deleted":              "Le Bluray '%s' a été supprimé de votre collection.",
		"bluray.duplicateTMDBID":                   "Un Bluray avec le même ID TMDB existe déjà.",
		"bluray.titleRequired":                     "Le titre est obligatoire.",
		"jwt.invalid":                              "Jeton JWT invalide.",
		"jwt.authorizationHeaderRequired":          "L'en-tête d'autorisation est requis.",
		"jwt.jwt.invalidAuthorizationHeaderFormat": "Format d'en-tête d'autorisation invalide.",
		"jwt.unauthorized":                         "Non autorisé.",
		"jwt.insufficientPermissions":              "Permissions insuffisantes.",
		"passwordReset.invalidRequest":             "Demande de réinitialisation du mot de passe invalide.",
		"passwordReset.emailServiceNotConfigured":  "Le service de messagerie n'est pas configuré.",
		"passwordReset.resetLinkSent":              "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.",
		"passwordReset.failedToCreateResetToken":   "Échec de la création du jeton de réinitialisation.",
		"passwordReset.failedToSendResetEmail":     "Échec de l'envoi de l'email de réinitialisation.",
		"passwordReset.invalidOrExpiredToken":      "Jeton de réinitialisation invalide ou expiré.",
		"passwordReset.failedToUpdatePassword":     "Échec de la mise à jour du mot de passe.",
		"passwordReset.passwordResetSuccessfully":  "Le mot de passe a été réinitialisé avec succès.",
		"tag.nameRequired":                         "Le nom de la balise est obligatoire.",
		"tag.duplicateTagName":                     "Une balise avec ce nom existe déjà.",
		"tag.notFound":                             "Balise non trouvée.",
		"tag.deletedSuccessfully":                  "Balise supprimée avec succès.",
		"user.emailAlreadyRegistered":              "L'email est déjà enregistré.",
		"user.usernameAlreadyTaken":                "Le nom d'utilisateur est déjà pris.",
		"user.invalidCredentials":                  "Identifiants invalides.",
		"user.notFound":                            "Utilisateur non trouvé.",
		"api.invalidUserID":                        "ID utilisateur invalide.",
		"api.invalidID":                            "ID invalide.",
		"api.identifierRequired":                   "L'identifiant est requis.",
		"api.failedToGenerateToken":                "Échec de la génération du jeton.",
		"api.settingsUpdatedSuccessfully":          "Paramètres mis à jour avec succès.",
		"api.usernameUpdatedSuccessfully":          "Nom d'utilisateur mis à jour avec succès.",
		"api.emailUpdatedSuccessfully":             "Email mis à jour avec succès.",
		"api.passwordUpdatedSuccessfully":          "Mot de passe mis à jour avec succès.",
		"api.currentPasswordRequired":              "Le mot de passe actuel est requis.",
		"api.invalidCurrentPassword":               "Mot de passe actuel invalide.",
		"setup.adminAlreadyExists":                 "L'administrateur existe déjà.",
		"setup.setupCompletedSuccessfully":         "Configuration terminée avec succès.",
		"tmdb.typeAndQueryRequired":                "Les paramètres type et query sont requis.",
		"tmdb.failedToSearch":                      "Échec de la recherche TMDB.",
		"tmdb.typeAndIDRequired":                   "Les paramètres type et ID sont requis.",
		"tmdb.invalidType":                         "Le type doit être 'movie' ou 'tv'.",
		"tmdb.failedToFetchDetails":                "Échec de la récupération des détails TMDB.",
		"tmdb.failedToEnrichDetails":               "Échec de l'enrichissement des détails TMDB avec la localisation.",
	},
}
