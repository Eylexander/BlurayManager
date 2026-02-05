export type MediaType = 'movie' | 'series';

export interface I18nText {
  "en-US"?: string;
  "fr-FR"?: string;
}

export interface I18nTextArray {
  "en-US"?: string[];
  "fr-FR"?: string[];
}

export interface Season {
  number: number;
  episode_count: number;
  year?: number;
  description?: I18nText;
}

export interface Bluray {
  id: string;
  title: string;
  type: MediaType;
  release_year?: number;
  director?: string;
  runtime?: number;
  seasons?: Season[];
  total_episodes?: number;
  description: I18nText;
  genre: I18nTextArray;
  cover_image_url: string;
  backdrop_url: string;
  purchase_price: number;
  purchase_date: string;
  tags: string[];
  rating: number;
  tmdb_id?: string;
  imdb_id?: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlurayRequest {
  title: string;
  type: MediaType;
  release_year?: number;
  director?: string;
  runtime?: number;
  seasons?: Season[];
  description: I18nText;
  genre: I18nTextArray;
  cover_image_url: string;
  backdrop_url: string;
  purchase_price: number;
  purchase_date: string;
  tags: string[];
  rating: number;
  tmdb_id?: string;
  imdb_id?: string;
}

export interface UpdateBlurayRequest extends Partial<CreateBlurayRequest> {}
