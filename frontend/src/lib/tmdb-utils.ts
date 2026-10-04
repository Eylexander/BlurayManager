import type { TMDBDetails } from '@/types/tmdb';
import type { MediaType } from '@/types/bluray';

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

/** Words that start the retail part of a product title ("Inception Steelbook Blu-ray") */
const MEDIA_WORDS =
  "blu-?ray|dvd|uhd|4k|ultra hd|hd dvd|digital|steelbook|widescreen|full ?screen|collector'?s?|" +
  "(?:ultimate|limited|special|deluxe|anniversary|director'?s cut) edition|[ée]dition|coffret|combo|box ?set|bonus|version longue|vf|vost";

/**
 * Splits a retail product title, as returned by the barcode lookup, into the
 * title to search TMDB with and any year or season it mentions:
 * "The Office: Season 2 [Blu-ray] [2006]" → { title: "The Office", year: "2006", season: 2 }
 */
export const parseProductTitle = (raw: string): { title: string; year?: string; season?: number } => {
  const year = raw.match(/[[(]((?:19|20)\d{2})[\])]/)?.[1];
  const seasonMatch = raw.match(/\b(?:saison|season|s[ée]rie|series)\s*(\d{1,2})\b/i) || raw.match(/\bS(\d{1,2})\b/);

  const title = raw
    // Drop every [...] and (...) group after the start: formats, years,
    // "(Widescreen)". A leading one is part of the title: "(500) Days of Summer"
    .replace(/(?<=\S)\s*[[(][^\])]*[\])]/g, " ")
    // Cut from the first season marker or retail word to the end
    .replace(/\s*[-–:,/|]?\s*\b(?:saison|season|s[ée]rie|series)\s*\d{1,2}\b.*$/i, "")
    .replace(/\s*[-–:,/|]?\s*\bS\d{1,2}\b.*$/, "")
    .replace(new RegExp(`\\s*[-–:,/|+]?\\s*(?<!\\w)(?:${MEDIA_WORDS})(?![\\w'-]).*$`, "i"), "")
    .replace(/[\s\-–:,/|]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return { title: title || raw.trim(), year, season: seasonMatch ? parseInt(seasonMatch[1]) : undefined };
};

export interface PurchaseInfo {
  purchaseDate?: string;
  purchasePrice?: string;
  tags?: string[];
}

/**
 * Builds the create request for a TMDB movie or series, from details fetched
 * through our backend (which adds the French title, overview and genres
 * under `fr`). Series get the given seasons, or all of them.
 */
export const buildBlurayFromTMDB = (
  details: TMDBDetails,
  type: MediaType,
  { purchaseDate, purchasePrice, tags = [] }: PurchaseInfo = {},
  seasons?: number[],
) => {
  const names = (genres?: { name: string }[]) => genres?.map((g) => g.name) ?? [];
  const allSeasons = (details.seasons ?? []).filter((s) => s.season_number > 0);
  const picked = seasons?.length ? allSeasons.filter((s) => seasons.includes(s.season_number)) : allSeasons;

  return {
    title: details.original_title || details.original_name || details.title || details.name || "Unknown Title",
    titles: { "en-US": details.title || details.name, "fr-FR": details.fr?.title },
    type,
    description: { "en-US": details.overview || "", "fr-FR": details.fr?.overview || "" },
    director: details.director || "",
    genre: { "en-US": names(details.genres), "fr-FR": names(details.fr?.genres) },
    cover_image_url: buildPosterUrl(details.poster_path),
    backdrop_url: buildBackdropUrl(details.backdrop_path),
    purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : null,
    purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
    rating: details.vote_average || 0,
    tags,
    tmdb_id: details.id?.toString(),
    release_year: extractYear(details.release_date || details.first_air_date),
    ...(type === "movie"
      ? { runtime: details.runtime || 0 }
      : {
          seasons: picked.map((s) => ({
            number: s.season_number,
            episode_count: s.episode_count || 0,
            year: extractYear(s.air_date),
          })),
        }),
  };
};
