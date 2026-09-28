"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, Tv, X, LayoutGrid, List } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api-client";
import { Bluray } from "@/types/bluray";
import { SimplifiedStatistics } from "@/types/statistics";
import BlurayCard from "@/components/bluray/BlurayCard";
import BlurayListItem from "@/components/bluray/BlurayListItem";
import StatsCard from "@/components/common/StatsCard";
import SortDropdown from "@/components/common/SortDropdown";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";

type SortOption = "recent" | "name" | "release_date" | "rating";

export default function DashboardPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, viewMode, setViewMode } = useAuthStore();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const locale = useLocale() as "en-US" | "fr-FR";

  const [recentBlurays, setRecentBlurays] = useState<Bluray[]>([]);
  const [stats, setStats] = useState<SimplifiedStatistics>();
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 32;
  const observerTarget = useRef<HTMLDivElement>(null);

  // Use route protection
  useRouteProtection(pathname);

  // Initial data fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let bluraysData;

      // Use search API if there's a search query
      if (searchQuery) {
        bluraysData = await apiClient.searchBlurays(searchQuery, 0, 100);
        setHasMore(false);
      } else {
        bluraysData = await apiClient.getSimplifiedBlurays({
          limit: ITEMS_PER_PAGE,
          skip: 0,
        });
        setHasMore(bluraysData.length === ITEMS_PER_PAGE);
      }

      const statsData = await apiClient.getSimplifiedStatistics();
      setStats(statsData);
      setRecentBlurays(bluraysData);
      setPage(1);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Load more items for infinite scroll
  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery) return;

    setLoadingMore(true);
    try {
      const moreBlurays = await apiClient.getSimplifiedBlurays({
        limit: ITEMS_PER_PAGE,
        skip: page * ITEMS_PER_PAGE,
      });

      if (moreBlurays.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (moreBlurays.length > 0) {
        setRecentBlurays((prev) => [...prev, ...moreBlurays]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to load more blurays:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, searchQuery, page]);

  // Fetch initial data when search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchData();
  }, [fetchData]);

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || searchQuery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreItems();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, loadingMore, loadMoreItems, searchQuery]);

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

  const isGuest = user?.role === "guest";

  return (
    <div className="w-full overflow-x-hidden space-y-4 sm:space-y-6 md:space-y-8">
      {/* Welcome banner (desktop) */}
      <section className="hidden md:block relative overflow-hidden rounded-xl brand-gradient text-white p-8">
        <div aria-hidden className="absolute inset-0 noise opacity-60 mix-blend-overlay" />
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        {/* Faint disc, echoing the logo */}
        <div aria-hidden className="absolute -right-10 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-[28px] border-white/10" />
        <div className="relative">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
            {isGuest
              ? t("welcome.guestGreeting")
              : `${t("welcome.greeting", { username: user?.username || "" })} 👋`}
          </h1>
          <p className="text-base lg:text-lg text-white/85">
            {isGuest
              ? t("welcome.guestSubtitle", { movies: stats?.total_movies || 0, seasons: stats?.total_seasons || 0 })
              : t("welcome.subtitle", { count: stats?.total_blurays || 0 })}
          </p>
        </div>
      </section>

      {!isGuest && stats && (
        <div className="grid grid-cols-2 gap-4 md:gap-6 !mt-0 sm:!mt-2 md:!mt-6">
          <Link href={`/dashboard?search=${encodeURIComponent("type:movie")}`}>
            <StatsCard
              title={t("statistics.totalMovies")}
              value={stats.total_movies || 0}
              icon={<Film className="w-6 h-6 sm:w-8 sm:h-8" />}
              color="blue"
            />
          </Link>
          <Link href={`/dashboard?search=${encodeURIComponent("type:series")}`}>
            <StatsCard
              title={t("statistics.totalSeasons")}
              value={stats.total_seasons || 0}
              icon={<Tv className="w-6 h-6 sm:w-8 sm:h-8" />}
              color="purple"
            />
          </Link>
        </div>
      )}

      {/* Recent Blurays */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold truncate">
              {getSectionTitle()}
            </h2>
            {searchQuery && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t("welcome.resultsFound", {
                  count: recentBlurays.length,
                  query: searchQuery,
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden vsm:flex items-center gap-1 bg-muted rounded-lg p-0.5 sm:p-1 border border-border">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
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
                className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm sm:text-base text-muted-foreground">
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

        {/* Infinite scroll trigger */}
        {!searchQuery && recentBlurays.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-8">
            {loadingMore && hasMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                <span>{t("common.loading")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
