"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, Tv, X, LayoutGrid, List, Plus, ArrowDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { apiClient } from "@/lib/api-client";
import { Bluray } from "@/types/bluray";
import { SimplifiedStatistics } from "@/types/statistics";
import BlurayCard from "@/components/bluray/BlurayCard";
import BlurayListItem from "@/components/bluray/BlurayListItem";
import StatsCard from "@/components/common/StatsCard";
import SortDropdown from "@/components/common/SortDropdown";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import useRouteProtection from "@/hooks/useRouteProtection";
import { Button } from "@/components/common";

type SortOption = "recent" | "name" | "release_date" | "rating";

export default function DashboardPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { viewMode, setViewMode } = useSettingsStore();
  const locale = useLocale() as "en-US" | "fr-FR";

  const [recentBlurays, setRecentBlurays] = useState<Bluray[]>([]);
  const [stats, setStats] = useState<SimplifiedStatistics>();
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const ITEMS_PER_PAGE = 48;

  // Use route protection
  useRouteProtection(pathname);

  // Centralized data fetching function to eliminate duplication
  const fetchData = useCallback(async () => {
    try {
      let bluraysData;

      // Use search API if there's a search query
      if (searchQuery) {
        bluraysData = await apiClient.searchBlurays(searchQuery, 0, 100);
        setHasMore(false); // Disable load more for search
      } else {
        bluraysData = await apiClient.getSimplifiedBlurays({
          limit: ITEMS_PER_PAGE,
          skip: 0,
        });
        setHasMore(bluraysData.length === ITEMS_PER_PAGE);
        setSkip(ITEMS_PER_PAGE);
      }

      const statsData = await apiClient.getSimplifiedStatistics();

      setStats(statsData);
      setRecentBlurays(bluraysData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || searchQuery) return;

    setLoadingMore(true);
    try {
      const moreBlurays = await apiClient.getSimplifiedBlurays({
        limit: ITEMS_PER_PAGE,
        skip: skip,
      });

      if (moreBlurays.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setRecentBlurays((prev) => [...prev, ...moreBlurays]);
      setSkip((prev) => prev + ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Failed to load more blurays:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 380) {
        setViewMode("list");
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode, setViewMode]);

  const handleUpdate = () => {
    // Refetch data when an item is updated or deleted
    setLoading(true);
    fetchData();
  };

  // Sort blurays based on selected option
  const sortedBlurays = [...recentBlurays].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.title.localeCompare(b.title);
      case "release_date":
        const yearA = a.release_year || 0;
        const yearB = b.release_year || 0;
        return yearB - yearA;
      case "rating":
        return b.rating - a.rating; // Highest rating first
      case "recent":
      default:
        return 0; // Keep original order (most recent first)
    }
  });

  // Get title based on sort option
  const getSectionTitle = () => {
    if (searchQuery) return t("common.searchResults");
    switch (sortBy) {
      case "name":
        return t("filter.name");
      case "release_date":
        return t("filter.releaseDate");
      case "rating":
        return t("filter.rating");
      case "recent":
      default:
        return t("filter.recentlyAdded");
    }
  };

  if (loading) {
    return <LoaderCircle />;
  }

  return (
    <div className="w-full overflow-x-hidden space-y-4 sm:space-y-6 md:space-y-8">
      {/* Homepage header */}
      {user?.role === "guest" ? (
        <>
          <div className="hidden md:block jellyfin-gradient rounded-lg p-6 sm:p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">
              {t("welcome.guestGreeting")}
            </h1>
            <p className="text-lg opacity-90">
              {t("welcome.guestSubtitle", {
                movies: stats?.total_movies || 0,
                seasons: stats?.total_seasons || 0,
              })}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:block jellyfin-gradient rounded-lg p-6 sm:p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">
              {t("welcome.greeting", { username: user?.username || "User" })} 👋
            </h1>
            <p className="text-lg opacity-90">
              {t("welcome.subtitle", { count: stats?.total_blurays || 0 })}
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4 sm:gap-4 md:gap-6 lg:gap-4 !mt-0 sm:!mt-2 md:!mt-6">
              <Link href="/dashboard/statistics">
                <StatsCard
                  title={t("statistics.totalMovies")}
                  value={stats.total_movies || 0}
                  icon={<Film className="w-6 h-6 sm:w-8 sm:h-8" />}
                  color="blue"
                />
              </Link>
              <Link href="/dashboard/statistics">
                <StatsCard
                  title={t("statistics.totalSeasons")}
                  value={stats.total_seasons || 0}
                  icon={<Tv className="w-6 h-6 sm:w-8 sm:h-8" />}
                  color="purple"
                />
              </Link>
            </div>
          )}
        </>
      )}

      {/* Recent Blurays */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold truncate">
              {getSectionTitle()}
            </h2>
            {searchQuery && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {t("welcome.resultsFound", {
                  count: recentBlurays.length,
                  query: searchQuery,
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden vsm:flex items-center gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-0.5 sm:p-1 border border-gray-300 dark:border-dark-700">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center justify-between gap-4">
              <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
            </div>
            {searchQuery && (
              <button
                onClick={() => window.history.pushState({}, "", "/dashboard")}
                className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">
                  {t("common.clearSearch")}
                </span>
              </button>
            )}
          </div>
        </div>
        {recentBlurays.length === 0 ? (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {t("common.noResults")}
            </p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="w-full grid grid-cols-1 vsm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 auto-rows-max gap-4 sm:gap-6 sm:p-4 md:p-2">
                {sortedBlurays.map((bluray) => (
                  <BlurayCard
                    key={bluray.id}
                    bluray={bluray}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 p-0 sm:p-1">
                {sortedBlurays.map((bluray) => (
                  <BlurayListItem
                    key={bluray.id}
                    bluray={bluray}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Load More Button */}
        {!searchQuery && hasMore && recentBlurays.length > 0 && (
          <div className="flex justify-center mt-8 p-6">
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="primary"
              className="px-6 py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
              icon={
                <ArrowDown className="w-5 h-5 group-hover:translate-y-[0.1rem] transition-transform duration-300" />
              }
            >
              {loadingMore ? t("common.loading") : t("common.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
