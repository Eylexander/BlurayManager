/**
 * Shared utility functions for TMDB integration
 */

export interface TMDBDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  overview_fr?: string;
  vote_average?: number;
  runtime?: number;
  genres?: { id: number; name: string }[];
  director?: string;
  number_of_seasons?: number;
  seasons?: Array<{
    season_number: number;
    episode_count: number;
    name: string;
    air_date?: string;
  }>;
  credits?: {
    crew?: Array<{ job: string; name: string }>;
  };
}

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  media_type: 'movie' | 'tv';
}

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
 * Extract director name from TMDB credits
 */
export const extractDirectorFromCredits = (details: TMDBDetails): string => {
  if (details.credits?.crew) {
    const director = details.credits.crew.find((c: any) => c.job === 'Director');
    return director?.name || '';
  }
  return '';
};

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
