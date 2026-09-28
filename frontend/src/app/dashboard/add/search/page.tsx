"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import toast from "react-hot-toast";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient, getApiError } from "@/lib/api-client";
import { Button } from "@/components/common";
import {
  Film,
  Tv,
  ChevronLeft,
  Plus,
  Search,
  Calendar,
  Star,
} from "lucide-react";
import { TMDBResult } from "@/types/tmdb";
import { LoaderCircle } from "@/components/common/LoaderCircle";

type MediaType = "movie" | "series";

export default function AddSearchPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useRouteProtection(pathname);

  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);

  const type = (searchParams.get("type") as MediaType) || "movie";
  const name = searchParams.get("name") || "";
  const year = searchParams.get("year") || "";
  const purchaseDate = searchParams.get("purchaseDate") || "";
  const tags = searchParams.get("tags")?.split(",") || [];

  useEffect(() => {
    if (!name) {
      router.push(ROUTES.DASHBOARD.ADD.ADD);
      return;
    }

    const searchTMDB = async () => {
      setLoading(true);
      try {
        const response = await apiClient.searchTMDB(
          type,
          name,
          year || undefined,
        );
        setSearchResults(response.results || []);
      } catch (error) {
        console.error("Search error:", error);
        toast.error(t("add.failedToSearchTMDB"));
      } finally {
        setLoading(false);
      }
    };

    searchTMDB();
  }, [name, year, type, router, t]);

  const handleSelectResult = (result: TMDBResult) => {
    const params = new URLSearchParams({
      type,
      id: result.id.toString(),
      ...(purchaseDate && { purchaseDate }),
      ...(year && { year }),
      ...(tags.length > 0 && { tags: tags.join(",") }),
    });
    router.push(`${ROUTES.DASHBOARD.ADD.RESULTS}?${params.toString()}`);
  };

  const handleQuickAdd = async (result: TMDBResult, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(result.id);
    try {
      const details = await apiClient.getTMDBDetails(type, result.id);

      // Data mapping remains the same as your original logic
      const blurayData = {
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
          "en-US": details.genres ? details.genres.map((g: any) => g.name) : [],
          "fr-FR": details.fr?.genres
            ? details.fr.genres.map((g: any) => g.name)
            : [],
        },
        cover_image_url: details.poster_path
          ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
          : null,
        backdrop_url: details.backdrop_path
          ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
          : null,
        purchase_date: purchaseDate
          ? new Date(purchaseDate).toISOString()
          : null,
        rating: details.vote_average || 0,
        tags,
        tmdb_id: details.id?.toString(),
        ...(type === "movie" && {
          release_year: details.release_date
            ? parseInt(details.release_date.split("-")[0])
            : year
              ? parseInt(year)
              : undefined,
          runtime: details.runtime || 0,
        }),
        ...(type === "series" &&
          details.seasons && {
            seasons: details.seasons
              .filter((s: any) => s.season_number > 0)
              .map((season: any) => ({
                number: season.season_number,
                episode_count: season.episode_count || 0,
                year: season.air_date
                  ? parseInt(season.air_date.split("-")[0])
                  : undefined,
              })),
            release_year: details.first_air_date
              ? parseInt(details.first_air_date.split("-")[0])
              : year
                ? parseInt(year)
                : undefined,
          }),
      };

      await apiClient.createBluray(blurayData);
      toast.success(t("add.addedToCollection", { title: blurayData.title }));
      router.push(ROUTES.DASHBOARD.HOME);
    } catch (error: any) {
      toast.error(
        getApiError(error, t("add.failedToAddToCollection")),
      );
    } finally {
      setAdding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 pt-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-ring/20">
            {type === "movie" ? (
              <Film className="w-6 h-6 text-primary" />
            ) : (
              <Tv className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {t("add.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
              <Search className="w-3 h-3" />
              {t("common.searchResults")} &ldquo;{name}&rdquo;
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(ROUTES.DASHBOARD.ADD.ADD)}
          className="flex items-center w-fit gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all border border-transparent hover:border-border"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t("add.backToSearch")}</span>
        </button>
      </div>

      {/* Results Container */}
      <div className="relative group">
        {/* Decorative glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>

        <div className="relative bg-card backdrop-blur-xl rounded-3xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("add.foundResults", { count: searchResults.length })}
              </h2>
            </div>

            <div className="grid gap-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {t("add.noResults")}
                  </p>
                </div>
              ) : (
                searchResults.slice(0, 8).map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="group/card relative flex items-center gap-4 p-3 bg-background hover:bg-accent rounded-2xl border border-border hover:border-border transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    {/* Media Image */}
                    <div className="relative w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 overflow-hidden rounded-xl shadow-lg">
                      {result.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
                          alt={result.title || result.name || ""}
                          fill
                          className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-border flex items-center justify-center">
                          {type === "movie" ? (
                            <Film className="w-6 h-6 text-muted-foreground" />
                          ) : (
                            <Tv className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-base sm:text-lg truncate group-hover/card:text-primary transition-colors">
                          {result.title || result.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {result.release_date?.split("-")[0] ||
                            result.first_air_date?.split("-")[0] ||
                            "N/A"}
                        </span>
                        {result.vote_average && result.vote_average > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500/90">
                            <Star className="w-3 h-3 fill-current" />
                            {result.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {result.overview}
                      </p>
                    </div>

                    {/* Quick Add Button */}
                    <Button
                      inline
                      onClick={(e) => handleQuickAdd(result, e)}
                      loading={adding === result.id}
                      aria-label={t("add.addToCollection")}
                      title={t("add.addToCollection")}
                      className="relative z-10 self-center w-11 h-11 !px-0"
                    >
                      <Plus />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
