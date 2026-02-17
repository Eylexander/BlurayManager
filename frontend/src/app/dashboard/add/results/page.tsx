"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import toast from "react-hot-toast";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import {
  Film,
  ChevronLeft,
  Check,
  Calendar,
  Clock,
  Star,
  Users,
  List,
} from "lucide-react";
import { TMDBDetails } from "@/types/tmdb";
import { LoaderCircle } from "@/components/common/LoaderCircle";

type MediaType = "movie" | "series";

const buildBlurayData = (
  details: TMDBDetails,
  type: MediaType,
  purchaseDate: string,
  purchasePrice: string,
  selectedTags: string[],
  year?: string,
  seasons?: number[],
): any => {
  const blurayData: any = {
    title:
      details.original_title ||
      details.original_name ||
      details.title ||
      details.name ||
      "Unknown Title",
    type,
    description: {
      "en-US": details.overview || "",
      "fr-FR": details.fr?.overview || "",
    },
    director: details.director || "",
    genre: {
      "en-US": details.genres ? details.genres.map((g) => g.name) : [],
      "fr-FR": details.fr?.genres ? details.fr.genres.map((g) => g.name) : [],
    },
    cover_image_url: details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : null,
    backdrop_url: details.backdrop_path
      ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
      : null,
    purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : null,
    purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
    rating: details.vote_average || 0,
    tags: selectedTags,
    tmdb_id: details.id?.toString(),
  };

  if (type === "movie") {
    blurayData.release_year = details.release_date
      ? parseInt(details.release_date.split("-")[0])
      : year
        ? parseInt(year)
        : undefined;
    blurayData.runtime = details.runtime || 0;
  } else if (type === "series") {
    if (seasons && seasons.length > 0) {
      blurayData.seasons = seasons.map((seasonNum) => {
        const season = details.seasons?.find(
          (s) => s.season_number === seasonNum,
        );
        return {
          number: seasonNum,
          episode_count: season?.episode_count || 0,
          year: season?.air_date
            ? parseInt(season.air_date.split("-")[0])
            : undefined,
        };
      });
    } else if (details.seasons) {
      // Auto-add all seasons if none specified
      blurayData.seasons = details.seasons
        .filter((s) => s.season_number > 0)
        .map((season) => ({
          number: season.season_number,
          episode_count: season.episode_count || 0,
          year: season.air_date
            ? parseInt(season.air_date.split("-")[0])
            : undefined,
        }));
    }
    blurayData.release_year =
      details.first_air_date && details.last_air_date
        ? parseInt(
            details.first_air_date.split("-")[0] +
              "-" +
              details.last_air_date?.split("-")[0],
          )
        : year
          ? parseInt(year)
          : undefined;
  }

  return blurayData;
};

export default function AddResultsPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const language = user?.settings?.language || 'en-US';

  useRouteProtection(pathname);

  const [details, setDetails] = useState<TMDBDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);

  const type = (searchParams.get("type") as MediaType) || "movie";
  const id = searchParams.get("id");
  const source = searchParams.get("source") || "tmdb"; // 'tmdb' or 'imdb'
  const year = searchParams.get("year") || "";
  const purchaseDate = searchParams.get("purchaseDate") || "";
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    if (!id) {
      router.push(ROUTES.DASHBOARD.ADD.ADD);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        let data: TMDBDetails;
        
        // If source is IMDB, first find the TMDB ID
        if (source === "imdb") {
          const findResult = await apiClient.findByExternalID(id, "imdb_id", type);
          const tmdbId = findResult.id;
          const detectedType = findResult.media_type === "tv" ? "series" : findResult.media_type;
          
          // Now fetch full details using the TMDB ID
          data = await apiClient.getTMDBDetails(detectedType, tmdbId);
        } else {
          // Direct TMDB ID lookup
          data = await apiClient.getTMDBDetails(type, parseInt(id));
        }
        
        setDetails(data);

        if (type === "series" && data.seasons) {
          setSelectedSeasons(
            data.seasons
              .filter((s) => s.season_number > 0)
              .map((s) => s.season_number),
          );
        }
      } catch (error) {
        console.error("Failed to fetch details:", error);
        toast.error(t("add.failedToFetchDetails"));
        router.push(ROUTES.DASHBOARD.ADD.ADD);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type, router, t]);

  const toggleSeason = (seasonNumber: number) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonNumber)
        ? prev.filter((n) => n !== seasonNumber)
        : [...prev, seasonNumber],
    );
  };

  const handleSubmit = async () => {
    if (!details) return;
    setSubmitting(true);
    try {
      const blurayData = buildBlurayData(
        details,
        type,
        purchaseDate,
        "",
        tags,
        year,
        selectedSeasons,
      );
      await apiClient.createBluray(blurayData);
      toast.success(t("add.success"));
      router.push(ROUTES.DASHBOARD.HOME);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || t("add.failedToAddToCollection"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !details) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoaderCircle />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all border border-gray-300 dark:border-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t("add.backToResults")}</span>
        </button>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-10">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              {/* Poster Section */}
              <div className="flex-shrink-0 w-full sm:w-64 mx-auto lg:mx-0">
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10 group">
                  {details.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                      alt={details.title || details.name || ""}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 dark:bg-gray-800 flex items-center justify-center">
                      <Film className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                    {details.title || details.name}
                  </h1>

                  <div className="flex flex-wrap gap-4 text-sm font-medium">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-300 dark:border-white/10">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {details.release_date?.split("-")[0] ||
                        details.first_air_date?.split("-")[0]}
                    </span>
                    {details.runtime && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-300 dark:border-white/10">
                        <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {details.runtime} {t("add.minutes")}
                      </span>
                    )}
                    {details.vote_average != null && details.vote_average > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-full border border-yellow-500/20">
                        <Star className="w-4 h-4 fill-current" />
                        {details.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed line-clamp-4 hover:line-clamp-none sm:line-clamp-none transition-all cursor-default">
                  {language === "fr-FR" && details.fr?.overview
                    ? details.fr.overview
                    : details.overview}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-white/10">
                  {details.director && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-500 font-bold">
                        {t("add.director")}
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {details.director}
                      </p>
                    </div>
                  )}
                  {details.genres && details.genres.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-500 font-bold">
                        {t("add.genres")}
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {language === "fr-FR" && details.fr?.genres
                          ? details.fr.genres.map((g) => g.name).join(", ")
                          : details.genres.map((g) => g.name).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Season Selection - Only for Series */}
            {type === "series" && details.seasons && (
              <div className="mt-12 space-y-6">
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t("add.selectSeasons")}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {details.seasons
                    .filter((s) => s.season_number > 0)
                    .map((season) => {
                      const isSelected = selectedSeasons.includes(
                        season.season_number,
                      );
                      return (
                        <button
                          key={season.season_number}
                          type="button"
                          onClick={() => toggleSeason(season.season_number)}
                          className={`relative p-4 rounded-2xl border transition-all duration-300 text-left group
                            ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                                : "border-gray-300 dark:border-white/5 bg-gray-100 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-200 dark:hover:bg-white/10"
                            }`}
                        >
                          <div
                            className={`text-sm font-bold mb-1 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}
                          >
                            {t("add.season")} {season.season_number}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-500">
                            {season.episode_count} {t("add.episodes")}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (type === "series" && selectedSeasons.length === 0)
                }
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:text-gray-600 dark:disabled:text-gray-600 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                {submitting ? <LoaderCircle /> : <Check className="w-5 h-5" />}
                <span>
                  {submitting ? t("add.adding") : t("add.addToCollection")}
                </span>
              </button>

              <button
                onClick={() => router.push(ROUTES.DASHBOARD.HOME)}
                className="px-8 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold transition-all"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
