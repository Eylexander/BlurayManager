"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient } from "@/lib/api-client";
import {
  Film,
  Tv,
  Calendar,
  DollarSign,
  Star,
  MapPin,
  Tag as TagIcon,
  Clock,
  User,
  Edit,
  Trash2,
  ArrowLeft,
  Check,
  X,
  Plus,
  ExternalLink,
  Hash,
  Euro,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import AddTagModal from "@/components/modals/AddTagModal";
import SeasonSelectorModal from "@/components/modals/SeasonSelectorModal";
import PurchaseInfoModal from "@/components/modals/PurchaseInfoModal";
import { Bluray, Season } from "@/types/bluray";
import {
  getLocalizedText,
  getLocalizedTextArray,
  isValidPurchaseDate,
  formatPurchaseDate,
} from "@/lib/bluray-utils";
import { Button } from "@/components/common";
import { LoaderCircle } from "@/components/common/LoaderCircle";

export default function BlurayDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale() as "en-US" | "fr-FR";
  const { user } = useAuthStore();

  const [bluray, setBluray] = useState<Bluray | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [editingSeasons, setEditingSeasons] = useState(false);
  const [editingPurchaseInfo, setEditingPurchaseInfo] = useState(false);

  const [allTags, setAllTags] = useState<
    { id: string; name: string; color: string }[]
  >([]);

  const canModify = user?.role === "admin" || user?.role === "moderator";

  // Use route protection
  useRouteProtection(pathname);

  useEffect(() => {
    const fetchBluray = async () => {
      try {
        const data = await apiClient.getBluray(params.id as string);
        setBluray(data);
      } catch (error) {
        console.error("Failed to fetch bluray:", error);
        toast.error("Failed to load item details");
      } finally {
        setLoading(false);
      }
    };

    const fetchAllTags = async () => {
      try {
        const tags = await apiClient.getTags();
        setAllTags(Array.isArray(tags) ? tags : []);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    if (params.id) {
      fetchBluray();
      fetchAllTags();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm(t("details.confirmDelete"))) return;

    setDeleting(true);
    try {
      await apiClient.deleteBluray(params.id as string);
      toast.success(t("details.deleteSuccess"));
      router.push(ROUTES.DASHBOARD.HOME);
    } catch (error) {
      console.error("Failed to delete bluray:", error);
      toast.error(t("details.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshFromTMDB = async () => {
    if (!bluray?.tmdb_id) {
      toast.error(t("details.noTmdbId"));
      return;
    }

    if (!confirm(t("details.confirmRefresh"))) return;

    setRefreshing(true);
    try {
      // Preserve user-edited data
      const preservedData = {
        tags: bluray.tags,
        seasons: bluray.seasons,
        purchase_price: bluray.purchase_price,
        purchase_date: bluray.purchase_date,
      };

      // Fetch fresh data from TMDB through the backend
      const tmdbData = await apiClient.getTMDBDetails(
        bluray.type,
        parseInt(bluray.tmdb_id),
      );

      // Transform TMDB data to match Bluray structure
      const transformedData: Partial<Bluray> = {
        title:
          tmdbData.original_title ||
          tmdbData.original_name ||
          tmdbData.title ||
          tmdbData.name ||
          bluray.title,
        director: tmdbData.director || bluray.director,
        runtime:
          tmdbData.runtime || tmdbData.episode_run_time?.[0] || bluray.runtime,
        rating: tmdbData.vote_average || bluray.rating,
        description: {
          "en-US": tmdbData.overview || "",
          "fr-FR": tmdbData.fr?.overview || tmdbData.overview || "",
        },
        genre: {
          "en-US": tmdbData.genres?.map((g: any) => g.name) || [],
          "fr-FR":
            tmdbData.fr?.genres?.map((g: any) => g.name) ||
            tmdbData.genres?.map((g: any) => g.name) ||
            [],
        },
        cover_image_url: tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
          : bluray.cover_image_url,
        backdrop_url: tmdbData.backdrop_path
          ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
          : bluray.backdrop_url,
        release_year: tmdbData.release_date
          ? new Date(tmdbData.release_date).getFullYear()
          : tmdbData.first_air_date
            ? new Date(tmdbData.first_air_date).getFullYear()
            : bluray.release_year,
      };

      // Merge with existing bluray and preserved user data
      const updatedBluray = {
        ...bluray,
        ...transformedData,
        ...preservedData,
      };

      // Update the bluray in the backend
      await apiClient.updateBluray(bluray.id, updatedBluray);
      setBluray(updatedBluray);
      toast.success(t("details.refreshSuccess"));
    } catch (error) {
      console.error("Failed to refresh from TMDB:", error);
      toast.error(t("details.refreshError"));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSeasons = async (newSeasons: Season[]) => {
    if (!bluray) return;

    try {
      const updatedBluray = { ...bluray, seasons: newSeasons };
      await apiClient.updateBluray(bluray.id, updatedBluray);
      setBluray(updatedBluray);
      setEditingSeasons(false);
      toast.success(t("bluray.seasonsUpdated"));
    } catch (error) {
      console.error("Failed to update seasons:", error);
      toast.error(t("bluray.seasonsUpdateError"));
    }
  };

  if (loading) {
    return <LoaderCircle />;
  }

  if (!bluray) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400">{t("details.notFound")}</p>
        <Button
          variant="primary"
          onClick={() => router.push(ROUTES.DASHBOARD.HOME)}
          className="mt-4"
        >
          {t("details.backToDashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-200 pb-20">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modals */}
        {editingTags && (
          <AddTagModal
            blurayId={params.id as string}
            initialSelectedTags={bluray?.tags || []}
            onClose={() => setEditingTags(false)}
            onSave={(tags) => {
              if (bluray) {
                setBluray({ ...bluray, tags });
              }
            }}
            blurayTitle={bluray?.title}
          />
        )}

        {editingSeasons && bluray?.type === "series" && (
          <SeasonSelectorModal
            onClose={() => setEditingSeasons(false)}
            onSave={handleSaveSeasons}
            currentSeasons={bluray?.seasons || []}
            tmdbId={bluray?.tmdb_id}
            title={bluray?.title || ""}
          />
        )}

        {editingPurchaseInfo && (
          <PurchaseInfoModal
            blurayId={params.id as string}
            bluray={bluray}
            onClose={() => setEditingPurchaseInfo(false)}
            onSave={(price, date) => {
              if (bluray) {
                setBluray({
                  ...bluray,
                  purchase_price: price,
                  purchase_date: date,
                });
              }
            }}
          />
        )}

        {/* Navigation */}
        <div className="py-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            <div className="p-2 rounded-full bg-gray-200 dark:bg-slate-800/50 group-hover:bg-gray-300 dark:group-hover:bg-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm sm:text-base">
              {t("common.back")}
            </span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative group rounded-3xl overflow-hidden bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-12 transition-all duration-500 md:hover:border-gray-300 dark:md:hover:border-white/20">
          {/* Action Buttons */}
          <div className="absolute top-6 right-6 z-30 flex gap-3">
            <a
              href={
                bluray.tmdb_id
                  ? `https://www.themoviedb.org/${bluray.type === "movie" ? "movie" : "tv"}/${bluray.tmdb_id}`
                  : `https://www.themoviedb.org/search?query=${encodeURIComponent(bluray.title)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-gray-100 dark:bg-slate-900/60 md:hover:bg-gray-200 dark:md:hover:bg-slate-800/80 backdrop-blur-xl text-gray-700 dark:text-slate-300 md:hover:text-gray-900 dark:md:hover:text-white rounded-xl transition-all duration-300 border border-gray-200 dark:border-white/10 md:hover:border-blue-500/50 shadow-lg md:hover:shadow-blue-500/20 group/btn"
              title={t("details.tmdb")}
            >
              <ExternalLink className="w-5 h-5 transition-transform md:group-hover/btn:scale-110" />
            </a>
            {canModify && (
              <>
                <button
                  onClick={handleRefreshFromTMDB}
                  disabled={refreshing || !bluray.tmdb_id}
                  className="p-3 bg-gray-100 dark:bg-slate-900/60 md:hover:bg-green-500/20 backdrop-blur-xl text-gray-700 dark:text-slate-300 md:hover:text-green-600 dark:md:hover:text-green-400 rounded-xl transition-all duration-300 border border-gray-200 dark:border-white/10 md:hover:border-green-500/50 shadow-lg md:hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  title={t("details.refreshFromTmdb")}
                >
                  {refreshing ? (
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5 transition-transform md:group-hover/btn:scale-110" />
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-3 bg-gray-100 dark:bg-slate-900/60 md:hover:bg-red-500/20 backdrop-blur-xl text-gray-700 dark:text-slate-300 md:hover:text-red-600 dark:md:hover:text-red-400 rounded-xl transition-all duration-300 border border-gray-200 dark:border-white/10 md:hover:border-red-500/50 shadow-lg md:hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  title={t("details.delete")}
                >
                  {deleting ? (
                    <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5 transition-transform md:group-hover/btn:scale-110" />
                  )}
                </button>
              </>
            )}
          </div>

          {/* Hero Backdrop Section */}
          <div className="absolute inset-0 h-[450px] sm:h-[550px] overflow-hidden">
            <div className="relative w-full h-full transition-transform duration-1000 md:group-hover:scale-105 will-change-transform">
              {bluray.backdrop_url ? (
                <Image
                  src={bluray.backdrop_url}
                  alt={bluray.title}
                  fill
                  className="object-cover opacity-50"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-neutral-50/20 dark:from-slate-950 dark:via-slate-950/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r dark:from-slate-950 dark:via-slate-950/5 to-transparent pointer-events-none hidden md:block" />
          </div>

          {/* Main Content */}
          <div className="relative z-20 px-6 sm:px-12 pt-40 sm:pt-64 pb-12">
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-end">
              {/* Poster */}
              <div className="flex-shrink-0 relative -mb-6 md:mb-0">
                <div className="relative w-44 sm:w-56 md:w-64 lg:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/20 transform transition-transform duration-500 md:hover:scale-[1.02] will-change-transform">
                  {bluray.cover_image_url ? (
                    <Image
                      src={bluray.cover_image_url}
                      alt={bluray.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <Film className="w-16 h-16 text-slate-700" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Content */}
              <div className="flex-1 text-center md:text-left space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                    <button
                      onClick={() =>
                        router.push(
                          `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`type:${bluray.type}`)}`,
                        )
                      }
                      className={`px-3 py-[0.3rem] rounded-lg text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 border shadow-sm transition-all hover:scale-[1.02] active:scale-95 ${
                        bluray.type === "movie"
                          ? "bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-400/40 hover:bg-blue-200/50 dark:hover:bg-blue-500/20 hover:border-blue-300 dark:hover:border-blue-400/60"
                          : "bg-purple-100/50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-400/30 hover:bg-purple-200/50 dark:hover:bg-purple-500/20 hover:border-purple-300 dark:hover:border-purple-400/50"
                      }`}
                      title={t("details.searchForType", { type: t(`common.${bluray.type}`) })}
                    >
                      {bluray.type === "movie" ? (
                        <Film className="w-3 h-3" />
                      ) : (
                        <Tv className="w-3 h-3" />
                      )}
                      {t(`common.${bluray.type}`)}
                    </button>
                    {bluray.release_year && (
                      <button
                        onClick={() =>
                          router.push(
                            `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`year:${bluray.release_year}`)}`,
                          )
                        }
                        className="px-3 py-1 rounded-lg bg-gray-100/50 dark:bg-white/20 border border-gray-200 dark:border-white/30 text-gray-600 dark:text-slate-100 text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95 hover:bg-gray-200/50 dark:hover:bg-white/30 hover:border-gray-300 dark:hover:border-white/40"
                        title={t("details.searchForYear", { year: bluray.release_year })}
                      >
                        {bluray.release_year}
                      </button>
                    )}
                    {bluray.runtime && bluray.runtime > 0 && (
                      <span className="px-3 py-1 rounded-lg bg-gray-100/50 dark:bg-white/20 border border-gray-200 dark:border-white/30 text-gray-600 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400 dark:text-slate-100" />
                        {Math.floor(bluray.runtime / 60)}h {bluray.runtime % 60}
                        m
                      </span>
                    )}
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tighter drop-shadow-2xl">
                    {bluray.title}
                  </h1>

                  {bluray.director && (
                    <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 font-light tracking-wide">
                      {t("details.directedBy")}{" "}
                      <span className="text-gray-900 dark:text-white font-medium">
                        <button
                          onClick={() =>
                            router.push(
                              `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`director:${bluray.director}`)}`,
                            )
                          }
                          className="underline decoration-gray-400 dark:decoration-slate-600 decoration-2 underline-offset-2 hover:decoration-blue-500 dark:hover:decoration-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                          title={t("details.searchForDirector", {
                            director: bluray.director,
                          })}
                        >
                          {bluray.director}
                        </button>
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
                  {/* Rating */}
                  {bluray.rating != null && bluray.rating > 0 && (
                    <div className="flex items-center gap-3 bg-gray-100/80 dark:bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(bluray.rating / 2) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-slate-700"}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-gray-900 dark:text-white font-black text-xl leading-none">
                          {bluray.rating}
                        </span>
                        <span className="text-gray-500 dark:text-slate-500 text-xs font-bold uppercase tracking-tighter">
                          / 10
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Genre Chips */}
                  {bluray.genre &&
                    getLocalizedTextArray(bluray.genre, locale).length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        {getLocalizedTextArray(bluray.genre, locale).map(
                          (g, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                router.push(
                                  `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`genre:${g}`)}`,
                                )
                              }
                              className="px-4 py-1.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 rounded-full text-xs font-medium text-gray-700 dark:text-slate-300 transition-all hover:text-gray-900 dark:hover:text-white hover:scale-[1.02] active:scale-95"
                              title={t("details.searchForGenre", { genre: g })}
                            >
                              {g}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {bluray.description && (
              <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  {t("details.synopsis")}
                </h2>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-lg">
                  {typeof bluray.description === "string"
                    ? bluray.description
                    : getLocalizedText(bluray.description, locale)}
                </p>
              </div>
            )}

            {/* Seasons Section for Series */}
            {bluray.type === "series" && (
              <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                    {t("details.seasons")}
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {bluray.seasons?.length || 0}
                    </span>
                  </h2>
                  {canModify && (
                    <button
                      onClick={() => setEditingSeasons(true)}
                      className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      {t("details.manageSeasons")}
                    </button>
                  )}
                </div>

                {bluray.seasons && bluray.seasons.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {bluray.seasons.map((season) => (
                      <div
                        key={season.number}
                        className="relative group bg-gray-50 dark:bg-slate-800/40 hover:bg-gray-100 dark:hover:bg-slate-800/60 border border-gray-200 dark:border-white/5 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-purple-500/10"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg border border-purple-200 dark:border-purple-500/20 group-hover:border-purple-300 dark:group-hover:border-purple-500/50 transition-colors">
                            {season.number}
                          </div>
                          {season.year && (
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-900/50 px-2 py-1 rounded">
                              {season.year}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">
                            {t("details.season")}
                          </p>
                          <p className="text-gray-900 dark:text-white text-sm font-medium flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                            {season.episode_count} {t("details.episodes")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-500 italic">
                    {t("details.noSeasons")}
                  </div>
                )}

                {/* Stats Summary */}
                {bluray.seasons && bluray.seasons.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/5 flex gap-6 text-sm text-gray-600 dark:text-slate-400">
                    <div>
                      <span className="block text-xs uppercase font-bold text-gray-500 dark:text-slate-500 mb-0.5">
                        {t("details.totalEpisodes")}
                      </span>
                      <span className="text-gray-900 dark:text-white font-mono">
                        {bluray.seasons.reduce(
                          (acc, s) => acc + s.episode_count,
                          0,
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Info */}
          <div className="space-y-6">
            {/* Library Info Card */}
            {canModify && (
              <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 dark:bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Euro className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    {t("details.libraryInfo")}
                  </h3>
                  <button
                    onClick={() => setEditingPurchaseInfo(true)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Price */}
                  <div className="flex items-center justify-between group">
                    <span className="text-gray-600 dark:text-slate-400 text-sm flex items-center gap-2">
                      <Euro className="w-4 h-4 opacity-50" />
                      {t("details.purchasePrice")}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-lg">
                      {bluray.purchase_price > 0
                        ? `€${bluray.purchase_price.toFixed(2)}`
                        : "-"}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between group">
                    <span className="text-gray-600 dark:text-slate-400 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 opacity-50" />
                      {t("details.purchaseDate")}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {isValidPurchaseDate(bluray.purchase_date)
                        ? formatPurchaseDate(bluray.purchase_date)
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tags Card */}
            <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t("details.tags")}
                </h3>
                {canModify && (
                  <button
                    onClick={() => setEditingTags(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {bluray.tags && bluray.tags.length > 0 ? (
                  bluray.tags.map((tagId) => {
                    const fullTag = allTags.find((t) => t.id === tagId);
                    if (!fullTag) return null;

                    return (
                      <button
                        key={fullTag.id}
                        onClick={() =>
                          router.push(
                            `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`tag:${fullTag.name}`)}`,
                          )
                        }
                        style={{
                          borderColor: `${fullTag.color}40`,
                          color: fullTag.color,
                          backgroundColor: `${fullTag.color}10`,
                        }}
                        className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm hover:scale-105 hover:shadow-md active:scale-95 transition-all"
                        title={t("details.searchForTag", { tag: fullTag.name })}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: fullTag.color }}
                        ></span>
                        {fullTag.name}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-gray-500 dark:text-slate-500 text-sm italic py-2">
                    {t("details.noTags")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
