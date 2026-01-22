/**
 * Shared utility functions for Bluray-related components
 */

/**
 * Get localized text from an i18n text object based on locale preference
 * Falls back to available languages if preferred locale is not available
 */
export const getLocalizedText = (
  text: { en?: string; fr?: string } | undefined,
  locale: 'en' | 'fr'
): string => {
  if (!text) return '';
  return text[locale] || text.en || text.fr || '';
};

/**
 * Check if a purchase date string is valid (not null, undefined, or the backend's zero date)
 * The backend returns '0001-01-01T00:00:00Z' for null dates
 */
export const isValidPurchaseDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  // Check if it's the zero date that the backend returns for null dates
  return !dateString.startsWith('0001-01-01');
};

/**
 * Format a purchase date string into a localized date string
 * Returns empty string if date is invalid
 */
export const formatPurchaseDate = (dateString: string | null | undefined): string => {
  if (!isValidPurchaseDate(dateString)) return '';
  return new Date(dateString!).toLocaleDateString();
};

/**
 * Normalize a purchase date from the backend for form input
 * Returns empty string if date is invalid or is the backend's zero date
 */
export const normalizePurchaseDateForInput = (dateString: string | null | undefined): string => {
  if (!isValidPurchaseDate(dateString)) return '';
  return dateString!.split('T')[0];
};
