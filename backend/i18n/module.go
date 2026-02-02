package i18n

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
		"user.emailAlreadyRegistered":             "Email is already registered.",
		"user.usernameAlreadyTaken":               "Username is already taken.",
		"user.invalidCredentials":                 "Invalid credentials.",
	},
	"fr-FR": {
		"notification.bluray_added":                "Le bluray '%s' a été ajouté à votre collection.",
		"notification.bluray_updated":              "Le bluray '%s' a été mis à jour.",
		"notification.bluray_deleted":              "Le bluray '%s' a été supprimé de votre collection.",
		"bluray.duplicateTMDBID":                   "Un bluray avec le même ID TMDB existe déjà.",
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
		"user.emailAlreadyRegistered":              "L'email est déjà enregistré.",
		"user.usernameAlreadyTaken":                "Le nom d'utilisateur est déjà pris.",
		"user.invalidCredentials":                  "Identifiants invalides.",
	},
}
