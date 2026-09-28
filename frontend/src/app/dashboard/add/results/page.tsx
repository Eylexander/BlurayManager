"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import toast from "react-hot-toast";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient, getApiError } from "@/lib/api-client";
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
import { Button } from "@/components/common";
import SeasonGrid from "@/components/bluray/SeasonGrid";
import { extractYear } from "@/lib/tmdb-utils";

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
  }, [id, type, source, router, t]);

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
        getApiError(error, t("add.failedToAddToCollection")),
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all border border-border"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t("add.backToResults")}</span>
        </button>

        {/* Main Content Card */}
        <div className="bg-card backdrop-blur-2xl rounded-[2.5rem] border border-border overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-10">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              {/* Poster Section */}
              <div className="flex-shrink-0 w-full sm:w-64 mx-auto lg:mx-0">
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-border group">
                  {details.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                      alt={details.title || details.name || ""}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-border flex items-center justify-center">
                      <Film className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-4 sm:space-y-6">
                <div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
                    {details.title || details.name}
                  </h1>

                  <div className="flex flex-wrap gap-4 text-sm font-medium">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full border border-border">
                      <Calendar className="w-4 h-4 text-primary" />
                      {details.release_date?.split("-")[0] ||
                        details.first_air_date?.split("-")[0]}
                    </span>
                    {details.runtime && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full border border-border">
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

                <p className="text-foreground/80 text-lg leading-relaxed line-clamp-4 hover:line-clamp-none sm:line-clamp-none transition-all cursor-default">
                  {language === "fr-FR" && details.fr?.overview
                    ? details.fr.overview
                    : details.overview}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                  {details.director && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                        {t("add.director")}
                      </p>
                      <p className="text-foreground font-medium">
                        {details.director}
                      </p>
                    </div>
                  )}
                  {details.genres && details.genres.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                        {t("add.genres")}
                      </p>
                      <p className="text-foreground font-medium">
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
              <div className="mt-12 space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">
                    {t("add.selectSeasons")}
                  </h3>
                </div>

                <SeasonGrid
                  seasons={details.seasons
                    .filter((s) => s.season_number > 0)
                    .map((s) => ({ number: s.season_number, episode_count: s.episode_count, year: extractYear(s.air_date) }))}
                  isSelected={(n) => selectedSeasons.includes(n)}
                  onToggle={toggleSeason}
                  className="md:grid-cols-4 lg:grid-cols-5"
                />
              </div>
            )}

            {/* Action Footer */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleSubmit}
                loading={submitting}
                loadingText={t("add.adding")}
                disabled={type === "series" && selectedSeasons.length === 0}
                icon={<Check />}
                className="flex-1"
              >
                {t("add.addToCollection")}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push(ROUTES.DASHBOARD.HOME)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
