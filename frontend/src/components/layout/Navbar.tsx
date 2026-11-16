"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Bell, User, X, Film, Tv } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useNotifications } from "@/hooks/useNotification";
import { ROUTES } from "@/hooks/useRouteProtection";
import { getLocalizedTextArray, getTitle } from "@/lib/bluray-utils";
import { useLocale } from "next-intl";
import { TagChip } from "@/components/common";

interface Bluray {
  id: string;
  title: string;
  type: "movie" | "series";
  release_year?: number;
  cover_image_url?: string;
  director?: string;
  tags?: string[];
  genre?: {
    "en-US"?: string[];
    "fr-FR"?: string[];
  };
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const SEARCH_TIPS = [
  ["title", "inception", "searchByTitle"],
  ["director", "nolan", "searchByDirector"],
  ["tag", "action", "searchByTag"],
  ["genre", "thriller", "searchByGenre"],
  ["year", "2010", "searchByYear"],
  ["type", "movie", "filterByType"],
] as const;

export default function Navbar() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale() as "en-US" | "fr-FR";
  const { user } = useAuthStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch =
    pathname === ROUTES.DASHBOARD.HOME ? searchParams.get("search") ?? "" : "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  // Keep the active search in the bar so it can be edited
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchQuery(urlSearch);
  }
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    notifications,
    unreadCount, markAsRead,
    markAllAsRead,
    formatTime,
  } = useNotifications();
  const [searchResults, setSearchResults] = useState<Bluray[]>([]);
  // Query the current results belong to; they lag behind the input while debouncing
  const [resultsQuery, setResultsQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchTips, setShowSearchTips] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyTip = (key: string) => {
    setSearchQuery(`${key}:`);
    inputRef.current?.focus();
  };

  // Suggest tag names while a "tag:" value is being typed at the end of the query
  const tagMatch = searchQuery.match(/(?:^|\s)tag:([^:]*)$/i);
  const tagPartial = tagMatch?.[1].trim().toLowerCase() ?? "";
  const tagSuggestions = tagMatch
    ? allTags
        .filter((tag) => {
          const name = tag.name.toLowerCase();
          return name.includes(tagPartial) && name !== tagPartial;
        })
        .slice(0, 8)
    : [];
  const showTagSuggestions = searchFocused && tagSuggestions.length > 0;

  const applyTag = (name: string) => {
    setSearchQuery(
      `${searchQuery.slice(0, searchQuery.length - tagMatch![1].length)}${name} `,
    );
    inputRef.current?.focus();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If there's exactly one result, navigate directly to its detail page
      if (resultsQuery === searchQuery && searchResults.length === 1) {
        router.push(
          ROUTES.DASHBOARD.BLURAYS.DETAIL.replace("[id]", searchResults[0].id),
        );
        setShowSearchResults(false);
        setSearchQuery("");
      } else {
        // Otherwise, show all results on dashboard
        router.push(
          `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(searchQuery.trim())}`,
        );
        setShowSearchResults(false);
      }
    }
  };

  // Fetch all tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await apiClient.getTags();
        setAllTags(Array.isArray(tags) ? tags : []);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, []);

  // Debounced search
  useEffect(() => {
    let stale = false;
    const delaySearch = setTimeout(async () => {
      if (/\w+:$/.test(searchQuery.trim())) return;
      if (searchQuery.trim().length >= 1) {
        setSearchLoading(true);
        setShowSearchTips(false);
        try {
          const query = searchQuery.toLowerCase();
          const filtered = await apiClient.searchBlurays(query, 0, 8);
          // A slower answer to an older query must not replace a newer one
          if (stale) return;
          setSearchResults(filtered);
          setResultsQuery(searchQuery);
          setShowSearchResults(
            filtered.length > 0 && document.activeElement === inputRef.current,
          );
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => {
      stale = true;
      clearTimeout(delaySearch);
    };
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
        setShowSearchTips(false);
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-background/75 backdrop-blur-xl border-b border-border z-50">
      <div className="h-full px-3 sm:px-6 flex items-center justify-between">
        <button
          onClick={() => router.push(ROUTES.DASHBOARD.HOME)}
          className="flex items-center gap-2 shrink-0 group cursor-pointer px-2 py-1 rounded-md active:translate-y-px"
          title={t("nav.home")}
        >
          <Image
            src="/logo_small.png"
            alt=""
            width={48}
            height={48}
            className="w-[40px] h-auto object-contain transition-transform duration-500 ease-out lg:group-hover:rotate-[-12deg]"
          />
          <span className="hidden sm:block font-display text-2xl text-foreground lg:group-hover:text-primary transition-colors">
            {t('common.appName')}
          </span>
        </button>

        {/* Search Bar - Always visible */}
        <div className="flex flex-1 max-w-2xl mx-2 sm:mx-8" ref={searchRef}>
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                if (searchResults.length > 0) {
                  setShowSearchResults(true);
                } else {
                  setShowSearchTips(true);
                }
              }}
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 text-sm sm:text-base rounded-full border border-transparent bg-muted placeholder:text-muted-foreground transition-[border-color,box-shadow,background-color] focus:outline-hidden focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/20"
            />

            {/* Search Tips Dropdown */}
            {showSearchTips &&
              !showSearchResults &&
              searchQuery.trim() === "" && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-md shadow-xl border border-border z-50 animate-in p-4">
                  <h4 className="label-caps text-muted-foreground mb-2.5">
                    {t("common.searchTips.title")}
                  </h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {SEARCH_TIPS.map(([key, example, label]) => (
                      <p key={key}>
                        <button
                          type="button"
                          onClick={() => applyTip(key)}
                          className="bg-muted px-1 rounded font-mono hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {key}:{example}
                        </button>{" "}
                        - {t(`common.searchTips.${label}`)}
                      </p>
                    ))}
                    <p className="pt-1 text-xs">
                      <span className="font-medium">
                        {t("common.searchTips.combine")}:
                      </span>{" "}
                      <code className="bg-muted px-1 rounded">
                        title:dark tag:action
                      </code>
                    </p>
                  </div>
                </div>
              )}

            {/* Tag Suggestions Dropdown */}
            {showTagSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-md shadow-xl border border-border z-50 animate-in p-3 flex flex-wrap gap-2">
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => applyTag(tag.name)}
                    className="rounded-sm hover:opacity-80"
                  >
                    <TagChip name={tag.name} color={tag.color} />
                  </button>
                ))}
              </div>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && !showTagSuggestions && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-md shadow-xl border border-border z-50 animate-in max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="disc w-6 aspect-square animate-disc mx-auto" />
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((bluray) => (
                      <button
                        key={bluray.id}
                        onClick={() => {
                          router.push(
                            ROUTES.DASHBOARD.BLURAYS.DETAIL.replace(
                              "[id]",
                              bluray.id,
                            ),
                          );
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }}
                        className="w-full px-4 py-3 hover:bg-accent flex items-center gap-3 transition-colors text-left"
                      >
                        {bluray.cover_image_url ? (
                          <Image
                            src={bluray.cover_image_url}
                            alt={getTitle(bluray, locale)}
                            width={40}
                            height={56}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                            {bluray.type === "movie" ? (
                              <Film className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <Tv className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {getTitle(bluray, locale)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{t(`common.${bluray.type}`)}</span>
                            {bluray.release_year && (
                              <>
                                <span>•</span>
                                <span>{bluray.release_year}</span>
                              </>
                            )}
                            {bluray.director && (
                              <>
                                <span>•</span>
                                <span className="truncate">
                                  {bluray.director}
                                </span>
                              </>
                            )}
                          </div>
                          {/* Show matching tags or genres if present */}
                          {(() => {
                            const localizedGenres = getLocalizedTextArray(
                              bluray.genre,
                              locale,
                            );
                            const resolvedTags = bluray.tags
                              ?.map((tagId) => allTags.find((t) => t.id === tagId))
                              .filter((tag): tag is Tag => tag !== undefined) || [];
                            const hasTags = resolvedTags.length > 0;
                            const hasGenres = localizedGenres.length > 0;

                            return hasTags || hasGenres ? (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {resolvedTags
                                  .slice(0, 3)
                                  .map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="px-1.5 py-0.5 text-xs rounded-sm bg-muted text-muted-foreground"
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                {localizedGenres
                                  .slice(0, 2)
                                  .map((genre, idx) => (
                                    <span
                                      key={`genre-${idx}`}
                                      className="px-1.5 py-0.5 text-xs rounded-sm bg-muted text-muted-foreground"
                                    >
                                      {genre}
                                    </span>
                                  ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </button>
                    ))}
                    {searchQuery.trim().length >= 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(
                            `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(searchQuery.trim())}`,
                          );
                          setShowSearchResults(false);
                        }}
                        className="w-full px-4 py-3 text-sm text-primary hover:bg-accent border-t border-border font-medium text-center"
                      >
                        {t("welcome.viewAllResults", { searchQuery })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-md transition-colors active:translate-y-px ${showNotifications
                ? "bg-foreground text-background"
                : "text-muted-foreground lg:hover:text-foreground lg:hover:bg-accent"
                }`}
              title={t("notifications.title")}
              aria-label={t("notifications.title")}
              aria-expanded={showNotifications}
            >
              <Bell key={unreadCount} className={`w-5 h-5 origin-top ${unreadCount > 0 ? "motion-safe:animate-ring" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 bg-sticker text-sticker-foreground text-[11px] font-bold tabular-nums rounded-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="fixed sm:absolute right-0 sm:mt-3 left-0 sm:left-auto top-16 sm:top-auto w-full sm:w-96 max-w-md bg-card rounded-b-lg sm:rounded-lg shadow-2xl border-t sm:border border-border z-50 animate-in max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
                  <h3 className="font-bold text-foreground text-lg">
                    {t("notifications.title")}
                  </h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    aria-label={t("common.close")}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                  >
                    <X className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="overflow-y-auto hide-scrollbar-mobile flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                      {t("notifications.noNotifications")}
                    </div>
                  ) : (
                    notifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-3 sm:p-4 border-b border-border border-l-[3px] cursor-pointer transition-colors hover:bg-accent shelf-in ${!notification.read
                          ? "border-l-primary bg-primary/5"
                          : "border-l-transparent"
                          }`}
                        style={{ "--i": index } as React.CSSProperties}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs sm:text-sm ${!notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"} mb-1 line-clamp-2`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-border bg-muted/40 shrink-0">
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm key-edge transition-[filter,transform,box-shadow] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("notifications.markAllAsRead")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {user?.role === "guest" ? (
            <div
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-border text-muted-foreground"
            >
              <User className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-semibold text-foreground leading-tight">
                  {user?.username}
                </div>
                <div className="label-caps text-[0.625rem] text-muted-foreground mt-0.5">
                  {user?.role}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push(ROUTES.DASHBOARD.SETTINGS)}
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-border text-left text-muted-foreground hover:text-primary transition-colors"
            >
              <User className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-semibold text-foreground leading-tight">
                  {user?.username}
                </div>
                <div className="label-caps text-[0.625rem] text-muted-foreground mt-0.5">
                  {user?.role}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
