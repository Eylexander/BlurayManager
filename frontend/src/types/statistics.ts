export interface BlurayStats {
  id: string;
  title: string;
  type: string;
  purchase_price?: number;
  release_year?: number;
  rating?: number;
}

export interface Statistics {
  total_blurays: number;
  total_movies: number;
  total_series: number;
  total_seasons: number;
  total_episodes: number;
  total_spent: number;
  average_price: number;
  physical_volume_liters: number;
  physical_storage_gb: number;
  total_runtime_minutes: number;
  most_expensive: BlurayStats | null;
  oldest_bluray: BlurayStats | null;
  newest_bluray: BlurayStats | null;
  genre_distribution: Record<string, number>;
  tag_distribution: Record<string, number>;
  average_rating: number;
  top_rated: BlurayStats[];
}

export interface SimplifiedStatistics {
  total_blurays: number;
  total_movies: number;
  total_series: number;
  total_seasons: number;
}
