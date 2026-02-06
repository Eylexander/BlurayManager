"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Search, Bell, User, X, Film, Tv } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useNotifications, Notification } from "@/hooks/useNotification";
import { ROUTES } from "@/hooks/useRouteProtection";
import { getLocalizedTextArray } from "@/lib/bluray-utils";
import { useLocale } from "use-intl/react";

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

export default function Navbar() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale() as "en-US" | "fr-FR";
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    formatTime,
  } = useNotifications();
  const [searchResults, setSearchResults] = useState<Bluray[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchTips, setShowSearchTips] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If there's exactly one result, navigate directly to its detail page
      if (searchResults.length === 1) {
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
        setSearchQuery("");
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
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setSearchLoading(true);
        setShowSearchTips(false);
        try {
          const query = searchQuery.toLowerCase();
          const filtered = await apiClient.searchBlurays(query, 0, 8);
          setSearchResults(filtered);
          setShowSearchResults(filtered.length > 0);
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

    return () => clearTimeout(delaySearch);
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
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 z-50">
      <div className="h-full px-3 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => router.push(ROUTES.DASHBOARD.HOME)}
          className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 group cursor-pointer transition-all duration-200 active:scale-95 p-4 -m-2 rounded-lg lg:hover:scale-[101%] lg:hover:bg-gray-100 dark:lg:hover:bg-dark-800"
          title="Go to home"
        >
          <div className="text-xl sm:text-2xl lg:group-hover:scale-105 lg:group-hover:rotate-12 transition-all duration-300">
            🎬
          </div>
          <h1 className="hidden sm:block text-base sm:text-xl font-bold text-gray-900 dark:text-white lg:group-hover:text-primary-600 dark:lg:group-hover:text-primary-400 transition-colors">
            {t("common.appName")}
          </h1>
        </button>

        {/* Search Bar - Always visible */}
        <div className="flex flex-1 max-w-2xl mx-2 sm:mx-8" ref={searchRef}>
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true);
                } else {
                  setShowSearchTips(true);
                }
              }}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            {/* Search Tips Dropdown */}
            {showSearchTips &&
              !showSearchResults &&
              searchQuery.trim() === "" && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-dark-700 z-50 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                    {t("common.searchTips.title")}
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        title:inception
                      </code>{" "}
                      - {t("common.searchTips.searchByTitle")}
                    </p>
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        director:nolan
                      </code>{" "}
                      - {t("common.searchTips.searchByDirector")}
                    </p>
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        tag:action
                      </code>{" "}
                      - {t("common.searchTips.searchByTag")}
                    </p>
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        genre:thriller
                      </code>{" "}
                      - {t("common.searchTips.searchByGenre")}
                    </p>
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        year:2010
                      </code>{" "}
                      - {t("common.searchTips.searchByYear")}
                    </p>
                    <p>
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        type:movie
                      </code>{" "}
                      - {t("common.searchTips.filterByType")}
                    </p>
                    <p className="pt-1 text-xs">
                      <span className="font-medium">
                        {t("common.searchTips.combine")}:
                      </span>{" "}
                      <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">
                        title:dark tag:action
                      </code>
                    </p>
                  </div>
                </div>
              )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-dark-700 z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
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
                        className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center gap-3 transition-colors text-left"
                      >
                        {bluray.cover_image_url ? (
                          <Image
                            src={bluray.cover_image_url}
                            alt={bluray.title}
                            width={40}
                            height={56}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-200 dark:bg-dark-700 rounded flex items-center justify-center">
                            {bluray.type === "movie" ? (
                              <Film className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Tv className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {bluray.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="capitalize">{bluray.type}</span>
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
                                      className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                {localizedGenres
                                  .slice(0, 2)
                                  .map((genre, idx) => (
                                    <span
                                      key={`genre-${idx}`}
                                      className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
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
                          setSearchQuery("");
                        }}
                        className="w-full px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-700 border-t border-gray-200 dark:border-dark-700 font-medium text-center"
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
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-lg transition-all duration-300 ${
                showNotifications
                  ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/20 scale-105"
                  : "lg:hover:bg-gray-100 lg:dark:hover:bg-dark-800 text-gray-600 dark:text-gray-400 lg:hover:text-blue-500 lg:dark:hover:text-blue-400"
              } lg:hover:scale-110 active:scale-95`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/50 scale-110">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="fixed sm:absolute right-0 sm:mt-3 left-0 sm:left-auto top-16 sm:top-auto w-full sm:w-96 max-w-md bg-white dark:bg-dark-800 rounded-b-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-dark-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-dark-700 flex-shrink-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
                    {t("notifications.title")}
                  </h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <X className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="overflow-y-auto hide-scrollbar-mobile flex-1">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                      {t("notifications.noNotifications")}
                    </div>
                  ) : (
                    notifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-3 sm:p-4 border-b border-gray-200 dark:border-dark-700 ${
                          !notification.read
                            ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-dark-700"
                        } transition-all duration-200 cursor-pointer active:scale-95 transform hover:pl-4 sm:hover:pl-5 active:bg-opacity-75`}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mt-1.5 sm:mt-2 flex-shrink-0 shadow-lg shadow-blue-500/50"></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs sm:text-sm ${!notification.read ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"} mb-1 line-clamp-2`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 sm:p-3 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 rounded-b-2xl sm:rounded-none flex-shrink-0">
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-white text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 enabled:bg-gradient-to-r enabled:from-blue-500 enabled:to-blue-600 enabled:hover:from-blue-600 enabled:hover:to-blue-700 enabled:hover:shadow-lg enabled:hover:shadow-blue-500/30 enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:bg-gray-400"
                  >
                    {t("notifications.markAllAsRead")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {user?.role === "guest" ? (
            <div
              className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 opacity-60"
              title="Profile unavailable for guests"
            >
              <User className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {user?.username}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">
                  {user?.role}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push(ROUTES.DASHBOARD.SETTINGS)}
              className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-600/10 dark:hover:from-blue-500/20 dark:hover:to-blue-600/20 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            >
              <User className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {user?.username}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">
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
