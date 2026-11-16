"use client";

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from "react";
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
import { BlurayCardSkeleton, BlurayRowSkeleton, Skeleton } from "@/components/common";
import { getTitle } from "@/lib/bluray-utils";
import useRouteProtection from "@/hooks/useRouteProtection";

type SortOption = "recent" | "name" | "release_date" | "rating";

const ITEMS_PER_PAGE = 32;

const GRID_CLASSES =
  "w-full grid grid-cols-1 vsm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 auto-rows-max gap-x-4 gap-y-7 sm:gap-x-6 sm:gap-y-9";

// Below the grid's two-column breakpoint (`vsm`) a single huge cover per row
// is useless, so the list is shown whatever the saved preference.
const NARROW = "(max-width: 379px)";
const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export default function DashboardPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, viewMode: savedViewMode, setViewMode } = useAuthStore();
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const viewMode = narrow ? "list" : savedViewMode;
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
          sort: sortBy,
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
  }, [searchQuery, sortBy]);

  // Load more items for infinite scroll
  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery) return;

    setLoadingMore(true);
    try {
      const moreBlurays = await apiClient.getSimplifiedBlurays({
        limit: ITEMS_PER_PAGE,
        skip: page * ITEMS_PER_PAGE,
        sort: sortBy,
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
  }, [loadingMore, hasMore, searchQuery, page, sortBy]);

  // Fetch initial data when the search or the sort order changes
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

  const handleUpdate = () => {
    // Refetch data when an item is updated or deleted
    setLoading(true);
    fetchData();
  };

  // The paged collection comes sorted from the server: sorting one page at a
  // time would shuffle rows as more load. Search results arrive in one piece
  // and unsorted, so those are ordered here.
  const sortedBlurays = !searchQuery ? recentBlurays : [...recentBlurays].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return getTitle(a, locale).localeCompare(getTitle(b, locale), locale);
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
    return (
      <div className="w-full space-y-4 sm:space-y-6 md:space-y-8" aria-busy>
        <Skeleton className="hidden md:block h-44 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <Skeleton className="h-24 sm:h-28 rounded-lg" />
          <Skeleton className="h-24 sm:h-28 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-56" />
        {viewMode === "grid" ? (
          <div className={GRID_CLASSES}>
            {Array.from({ length: 12 }, (_, i) => (
              <BlurayCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div>
            {Array.from({ length: 6 }, (_, i) => (
              <BlurayRowSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isGuest = user?.role === "guest";

  return (
    <div className="w-full overflow-x-hidden space-y-4 sm:space-y-6 md:space-y-8">
      {/* Welcome banner (desktop): a flat slab of the brand blue, with a
          disc turning slowly at its edge */}
      <section className="hidden md:block relative overflow-hidden rounded-lg bg-brand text-white px-8 py-9 animate-in">
        <div
          aria-hidden
          className="disc absolute -right-14 top-1/2 -mt-36 w-72 aspect-square opacity-90 motion-safe:animate-disc-slow"
        />
        <div className="relative max-w-[70%]">
          <p className="label-caps text-white/70">{t("common.appName")}</p>
          <h1 className="mt-2 font-display italic uppercase text-4xl lg:text-5xl">
            {isGuest ? t("welcome.guestGreeting") : t("welcome.greeting", { username: user?.username || "" })}
          </h1>
          <p className="mt-3 text-base lg:text-lg text-white/85">
            {isGuest
              ? t("welcome.guestSubtitle", { movies: stats?.total_movies || 0, seasons: stats?.total_seasons || 0 })
              : t("welcome.subtitle", { count: stats?.total_blurays || 0 })}
          </p>
        </div>
      </section>

      {!isGuest && stats && (
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <Link href={`/dashboard?search=${encodeURIComponent("type:movie")}`}>
            <StatsCard
              title={t("statistics.totalMovies")}
              value={stats.total_movies || 0}
              icon={<Film />}
              color="blue"
            />
          </Link>
          <Link href={`/dashboard?search=${encodeURIComponent("type:series")}`}>
            <StatsCard
              title={t("statistics.totalSeasons")}
              value={stats.total_seasons || 0}
              icon={<Tv />}
              color="purple"
            />
          </Link>
        </div>
      )}

      {/* Recent Blurays */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-7 pb-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="font-display italic uppercase text-2xl sm:text-3xl truncate">
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
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden vsm:flex items-center rounded-md border border-input overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                className={`p-2 sm:p-2.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={`p-2 sm:p-2.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:text-foreground"
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
          <div className="flex flex-col items-center gap-5 py-12 sm:py-16 animate-in">
            <div aria-hidden className="disc w-24 aspect-square opacity-60" />
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("common.noResults")}
            </p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className={GRID_CLASSES}>
                {sortedBlurays.map((bluray, i) => (
                  <BlurayCard
                    key={bluray.id}
                    bluray={bluray}
                    onUpdate={handleUpdate}
                    index={i % ITEMS_PER_PAGE}
                  />
                ))}
                {loadingMore && Array.from({ length: 6 }, (_, i) => <BlurayCardSkeleton key={`more-${i}`} />)}
              </div>
            ) : (
              <div>
                {sortedBlurays.map((bluray, i) => (
                  <BlurayListItem
                    key={bluray.id}
                    bluray={bluray}
                    onUpdate={handleUpdate}
                    index={i % ITEMS_PER_PAGE}
                  />
                ))}
                {loadingMore && Array.from({ length: 3 }, (_, i) => <BlurayRowSkeleton key={`more-${i}`} />)}
              </div>
            )}
          </>
        )}

        {/* Infinite scroll trigger */}
        {!searchQuery && recentBlurays.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-8">
            {loadingMore && hasMore && (
              <span role="status" className="sr-only">
                {t("common.loading")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
