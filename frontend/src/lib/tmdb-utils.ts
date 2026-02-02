/**
 * TMDB image base URLs
 */
export const TMDB_IMAGE_BASE = {
  POSTER_W500: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_ORIGINAL: 'https://image.tmdb.org/t/p/original',
  POSTER_W92: 'https://image.tmdb.org/t/p/w92',
  POSTER_W300: 'https://image.tmdb.org/t/p/w300',
} as const;

/**
 * Build poster URL from TMDB path
 */
export const buildPosterUrl = (posterPath: string | undefined, size: keyof typeof TMDB_IMAGE_BASE = 'POSTER_W500'): string => {
  return posterPath ? `${TMDB_IMAGE_BASE[size]}${posterPath}` : '';
};

/**
 * Build backdrop URL from TMDB path
 */
export const buildBackdropUrl = (backdropPath: string | undefined): string => {
  return backdropPath ? `${TMDB_IMAGE_BASE.BACKDROP_ORIGINAL}${backdropPath}` : '';
};

/**
 * Extract year from date string
 */
export const extractYear = (dateString: string | undefined): number | undefined => {
  return dateString ? parseInt(dateString.split('-')[0]) : undefined;
};

/**
 * Clean up a product title by removing common DVD/Blu-ray suffixes and format information
 * This helps improve TMDB search accuracy by removing physical media descriptors
 */
export const cleanProductTitle = (title: string): string => {
  return title
    .replace(/\([^)]*(?:Blu-ray|DVD|UHD|4K|Ultra HD|Digital|Bonus)[^)]*\)/gi, '')
    .replace(/\[[^\]]*(?:Blu-ray|DVD|UHD|4K|Ultra HD|Digital|Bonus)[^\]]*\]/gi, '')
    .replace(/\[Blu-ray\]|\[DVD\]|\[UHD\]|\[4K\]|\[Digital\]/gi, '')
    .replace(/[-+]\s*(?:Blu-ray|DVD|UHD|4K Ultra HD|Digital|Bonus).*$/gi, '')
    .replace(/\b(Science Fiction|Action|Drama|Comedy|Horror|Thriller|Adventure|Romance)\b.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};
