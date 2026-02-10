export interface TMDBDetails {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    last_air_date?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    vote_average?: number;
    vote_count?: number;
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
    fr?: {
        overview?: string;
        genres?: { id: number; name: string }[];
    }
}

export interface TMDBResult {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    director?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    vote_average?: number;
    vote_count?: number;
}