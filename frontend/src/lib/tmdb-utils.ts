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

/**
 * Extract season number from DVDFr item data
 * Checks cover URL, title, and edition fields for season information
 * Option A: Auto-detect season from barcode scan
 */
export const extractSeasonNumber = (dvdfrItem: any): number | null => {
  if (!dvdfrItem) return null;

  // Check cover URL: "saison_1", "season_1", "s1", etc.
  if (dvdfrItem.cover) {
    const coverMatch = dvdfrItem.cover.match(/(?:saison|season)[_\s-]?(\d+)/i);
    if (coverMatch) return parseInt(coverMatch[1]);
    
    // Check for compact format: s1, s01, etc.
    const compactMatch = dvdfrItem.cover.match(/[_\s-]s(\d{1,2})(?:[_\s-]|\.jpg)/i);
    if (compactMatch) return parseInt(compactMatch[1]);
  }

  // Check title: "The Office - Saison 1", "Season 1", "S1", etc.
  if (dvdfrItem.title) {
    const titleMatch = dvdfrItem.title.match(/(?:saison|season|série)\s*(\d+)/i);
    if (titleMatch) return parseInt(titleMatch[1]);
    
    // Check for format like "S1" or "S01"
    const compactTitleMatch = dvdfrItem.title.match(/\bS(\d{1,2})\b/i);
    if (compactTitleMatch) return parseInt(compactTitleMatch[1]);
  }

  // Check edition field if it exists
  if (dvdfrItem.edition) {
    const editionMatch = dvdfrItem.edition.match(/(?:saison|season)\s*(\d+)/i);
    if (editionMatch) return parseInt(editionMatch[1]);
  }

  return null;
};

/**
 * Clean series title by removing season information
 * Used to extract base series name from season-specific titles
 */
export const cleanSeriesTitle = (title: string): string => {
  return title
    .replace(/[-:]\s*(?:saison|season|série|series)\s*\d+/gi, '')
    .replace(/\s*[-:]\s*S\d{1,2}\b/gi, '')
    .replace(/\s*\(saison\s*\d+\)/gi, '')
    .replace(/\s*\[saison\s*\d+\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};
