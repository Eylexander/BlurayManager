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
  Star,
  Clock,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  ExternalLink,
  Euro,
  RefreshCw,
  Play,
} from "lucide-react";
import toast from "react-hot-toast";
import TagPickerModal from "@/components/modals/TagPickerModal";
import SeasonSelectorModal from "@/components/modals/SeasonSelectorModal";
import PurchaseInfoModal from "@/components/modals/PurchaseInfoModal";
import { Bluray, Season } from "@/types/bluray";
import {
  getLocalizedText,
  getLocalizedTextArray,
  isValidPurchaseDate,
  formatPurchaseDate,
  getJellyfinSearchUrl,
  getTitle,
} from "@/lib/bluray-utils";
import { Button, IconButton, Skeleton, TagChip, useConfirm } from "@/components/common";

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
  const { confirm, confirmDialog } = useConfirm();

  // Use route protection
  useRouteProtection(pathname);

  useEffect(() => {
    const fetchBluray = async () => {
      try {
        const data = await apiClient.getBluray(params.id as string);
        setBluray(data);
      } catch (error) {
        console.error("Failed to fetch bluray:", error);
        toast.error(t("details.notFound"));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch for another item
  }, [params.id]);

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("details.deleteTitle", { title: bluray ? getTitle(bluray, locale) : "" }),
      message: t("details.deleteWarning"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;

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

    const ok = await confirm({
      title: t("details.refreshFromTmdb"),
      message: t("details.confirmRefresh"),
      confirmLabel: t("details.refreshFromTmdb"),
    });
    if (!ok) return;

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
        titles: { "en-US": tmdbData.title || tmdbData.name, "fr-FR": tmdbData.fr?.title },
        director: tmdbData.director || bluray.director,
        runtime:
          tmdbData.runtime || tmdbData.episode_run_time?.[0] || bluray.runtime,
        rating: tmdbData.vote_average || bluray.rating,
        description: {
          "en-US": tmdbData.overview || "",
          "fr-FR": tmdbData.fr?.overview || tmdbData.overview || "",
        },
        genre: {
          "en-US": tmdbData.genres?.map((g: { name: string }) => g.name) || [],
          "fr-FR":
            tmdbData.fr?.genres?.map((g: { name: string }) => g.name) ||
            tmdbData.genres?.map((g: { name: string }) => g.name) ||
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
    // Mirrors the hero: backdrop, poster, then badges, title and director
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" aria-busy>
        <div className="py-6">
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="relative rounded-lg overflow-hidden border border-border bg-card px-6 sm:px-12 pt-40 sm:pt-64 pb-12">
          <div className="absolute inset-x-0 top-0 h-[450px] sm:h-[550px] bg-muted/60 noise" />
          <div className="relative flex flex-col md:flex-row gap-10 items-center md:items-end">
            <Skeleton className="w-44 sm:w-56 md:w-64 lg:w-72 aspect-2/3 rounded-md" />
            <div className="flex-1 w-full flex flex-col items-center md:items-start gap-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
              <Skeleton className="h-12 sm:h-16 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Floating actions over the hero backdrop
  const heroAction =
    "rounded-md bg-card border border-border shadow-md transition-colors [&_svg]:w-[18px] [&_svg]:h-[18px]";
  // Links can't use IconButton, so they carry its lg size themselves
  const heroLink =
    "inline-grid place-items-center w-10 h-10 shrink-0 text-muted-foreground hover:text-foreground";
  const jellyfinUrl = user?.settings?.jellyfin_url;

  if (!bluray) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">{t("details.notFound")}</p>
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
    <div className="relative min-h-screen text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modals */}
        {editingTags && (
          <TagPickerModal
            blurayId={params.id as string}
            initialSelectedTags={bluray?.tags || []}
            onClose={() => setEditingTags(false)}
            onSave={(tags, available) => {
              if (bluray) {
                setBluray({ ...bluray, tags });
              }
              // Include tags created from the picker so they render right away
              setAllTags(available);
            }}
            blurayTitle={bluray ? getTitle(bluray, locale) : ""}
          />
        )}

        {editingSeasons && bluray?.type === "series" && (
          <SeasonSelectorModal
            onClose={() => setEditingSeasons(false)}
            onSave={handleSaveSeasons}
            currentSeasons={bluray?.seasons || []}
            tmdbId={bluray?.tmdb_id}
            title={bluray ? getTitle(bluray, locale) : ""}
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

        {confirmDialog}

        {/* Navigation */}
        <div className="py-6">
          <Button variant="ghost" inline onClick={() => router.back()} icon={<ArrowLeft />} className="-ml-3">
            {t("common.back")}
          </Button>
        </div>

        {/* Hero Section */}
        <div className="relative rounded-lg overflow-hidden bg-card border border-border mb-10 animate-in">
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex gap-2">
            {jellyfinUrl && (
              <a
                href={getJellyfinSearchUrl(jellyfinUrl, bluray.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("details.openInJellyfin")}
                title={t("details.openInJellyfin")}
                className={`${heroAction} ${heroLink}`}
              >
                <Play />
              </a>
            )}
            <a
              href={
                bluray.tmdb_id
                  ? `https://www.themoviedb.org/${bluray.type === "movie" ? "movie" : "tv"}/${bluray.tmdb_id}`
                  : `https://www.themoviedb.org/search?query=${encodeURIComponent(bluray.title)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("details.tmdb")}
              title={t("details.tmdb")}
              className={`${heroAction} ${heroLink}`}
            >
              <ExternalLink />
            </a>
            {canModify && (
              <>
                <IconButton
                  label={t("details.refreshFromTmdb")}
                  onClick={handleRefreshFromTMDB}
                  disabled={refreshing || !bluray.tmdb_id}
                  size="lg"
                  className={heroAction}
                >
                  <RefreshCw className={refreshing ? "animate-spin" : ""} />
                </IconButton>
                <IconButton
                  label={t("details.delete")}
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  size="lg"
                  className={heroAction}
                >
                  <Trash2 />
                </IconButton>
              </>
            )}
          </div>

          {/* Hero Backdrop Section */}
          <div className="absolute inset-0 h-[450px] sm:h-[550px] overflow-hidden">
            <div className="relative w-full h-full">
              {bluray.backdrop_url ? (
                <Image
                  src={bluray.backdrop_url}
                  alt={getTitle(bluray, locale)}
                  fill
                  className="object-cover opacity-50"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-muted noise" />
              )}
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-r from-background/80 via-background/5 to-transparent pointer-events-none hidden md:block" />
          </div>

          {/* Main Content */}
          <div className="relative z-20 px-6 sm:px-12 pt-40 sm:pt-64 pb-12">
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-end">
              {/* Poster */}
              <div className="group shrink-0 relative -mb-6 md:mb-0 shelf-in">
                <div
                  aria-hidden
                  className="disc absolute right-0 top-1/2 w-[84%] aspect-square -translate-y-1/2 transition-transform duration-700 ease-out md:group-hover:translate-x-[22%] md:group-hover:rotate-[140deg]"
                />
                <div className="relative w-44 sm:w-56 md:w-64 lg:w-72 aspect-2/3 rounded-md overflow-hidden case-shell shadow-[0_25px_40px_-18px_rgba(0,0,0,0.7)]">
                  {bluray.cover_image_url ? (
                    <Image
                      src={bluray.cover_image_url}
                      alt={getTitle(bluray, locale)}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Film className="w-16 h-16 text-foreground/80" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Content */}
              <div className="flex-1 text-center md:text-left space-y-4 sm:space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                    <button
                      onClick={() =>
                        router.push(
                          `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`type:${bluray.type}`)}`,
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-sm label-caps flex items-center gap-1.5 transition-[filter] hover:brightness-110 active:translate-y-px ${
                        bluray.type === "movie"
                          ? "bg-brand text-white"
                          : "bg-sticker text-sticker-foreground"
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
                        className="px-2.5 py-1 rounded-sm bg-card border border-border text-foreground text-xs font-bold tabular-nums transition-colors hover:border-foreground/40 active:translate-y-px"
                        title={t("details.searchForYear", { year: bluray.release_year })}
                      >
                        {bluray.release_year}
                      </button>
                    )}
                    {bluray.runtime && bluray.runtime > 0 && (
                      <span className="px-2.5 py-1 rounded-sm bg-card border border-border text-foreground text-xs font-bold tabular-nums flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {Math.floor(bluray.runtime / 60)}h {bluray.runtime % 60}
                        m
                      </span>
                    )}
                  </div>

                  <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-7xl text-foreground">
                    {getTitle(bluray, locale)}
                  </h1>

                  {bluray.director && (
                    <p className="text-lg sm:text-xl text-muted-foreground">
                      {t("details.directedBy")}{" "}
                      <span className="text-foreground font-medium">
                        <button
                          onClick={() =>
                            router.push(
                              `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`director:${bluray.director}`)}`,
                            )
                          }
                          className="underline decoration-border decoration-2 underline-offset-4 hover:decoration-primary hover:text-primary transition-colors"
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
                    <div className="flex items-center gap-3 bg-card px-3.5 py-2 rounded-md border border-border">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(bluray.rating / 2) ? "text-amber-500 fill-amber-500" : "text-border"}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-foreground text-2xl tabular-nums">
                          {bluray.rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-xs font-bold">
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
                              className="px-2.5 py-1.5 bg-card border border-border rounded-sm text-xs font-semibold text-foreground/80 transition-colors hover:text-foreground hover:border-foreground/40 active:translate-y-px"
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
              <div className="card p-6 sm:p-8">
                <h2 className="label-caps text-muted-foreground mb-4">
                  {t("details.synopsis")}
                </h2>
                <p className="text-foreground/85 leading-relaxed text-lg max-w-[68ch]">
                  {typeof bluray.description === "string"
                    ? bluray.description
                    : getLocalizedText(bluray.description, locale)}
                </p>
              </div>
            )}

            {/* Seasons Section for Series */}
            {bluray.type === "series" && (
              <div className="card p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="label-caps text-muted-foreground flex items-center gap-2">
                    {t("details.seasons")}
                    <span className="px-1.5 py-0.5 rounded-sm bg-sticker text-sticker-foreground tabular-nums">
                      {bluray.seasons?.length || 0}
                    </span>
                  </h2>
                  {canModify && (
                    <Button variant="ghost" size="sm" inline onClick={() => setEditingSeasons(true)} icon={<Edit />}>
                      {t("details.manageSeasons")}
                    </Button>
                  )}
                </div>

                {bluray.seasons && bluray.seasons.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {bluray.seasons.map((season, i) => (
                      <div
                        key={season.number}
                        style={{ "--i": i } as React.CSSProperties}
                        className="group flex items-center gap-3 bg-background border border-border border-l-[3px] border-l-sticker rounded-md p-3 sm:p-4 transition-colors hover:border-sticker shelf-in"
                      >
                        <span className="font-display text-4xl text-sticker tabular-nums transition-transform duration-300 group-hover:-translate-y-0.5">
                          {String(season.number).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="label-caps text-muted-foreground">
                            {t("details.season")}
                            {season.year ? ` · ${season.year}` : ""}
                          </p>
                          <p className="mt-1 text-foreground text-sm font-semibold truncate">
                            {season.episode_count} {t("details.episodes")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground italic">
                    {t("details.noSeasons")}
                  </div>
                )}

                {/* Stats Summary */}
                {bluray.seasons && bluray.seasons.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border flex gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="block label-caps text-muted-foreground mb-1">
                        {t("details.totalEpisodes")}
                      </span>
                      <span className="font-display text-2xl text-foreground tabular-nums">
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
          <div className="space-y-4 sm:space-y-6">
            {/* Library Info Card */}
            {canModify && (
              <div className="card p-4 sm:p-6">

                <div className="flex items-center justify-between mb-4">
                  <h3 className="label-caps text-muted-foreground">
                    {t("details.libraryInfo")}
                  </h3>
                  <IconButton label={t("details.editPurchaseInfo")} onClick={() => setEditingPurchaseInfo(true)} className="-mr-2">
                    <Edit />
                  </IconButton>
                </div>

                <div className="divide-y divide-border [&>div]:py-3 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
                  {/* Price */}
                  <div className="flex items-center justify-between group">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                      <Euro className="w-4 h-4 opacity-50" />
                      {t("details.purchasePrice")}
                    </span>
                    <span className="font-display text-2xl text-foreground tabular-nums">
                      {bluray.purchase_price > 0
                        ? `€${bluray.purchase_price.toFixed(2)}`
                        : "-"}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between group">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 opacity-50" />
                      {t("details.purchaseDate")}
                    </span>
                    <span className="text-foreground font-medium">
                      {isValidPurchaseDate(bluray.purchase_date)
                        ? formatPurchaseDate(bluray.purchase_date)
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tags Card */}
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="label-caps text-muted-foreground">
                  {t("details.tags")}
                </h3>
                {canModify && (
                  <IconButton label={t("add.editTags")} onClick={() => setEditingTags(true)} className="-mr-2">
                    <Plus />
                  </IconButton>
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
                        type="button"
                        onClick={() =>
                          router.push(
                            `${ROUTES.DASHBOARD.HOME}?search=${encodeURIComponent(`tag:${fullTag.name}`)}`,
                          )
                        }
                        className="rounded-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
                        title={t("details.searchForTag", { tag: fullTag.name })}
                      >
                        <TagChip name={fullTag.name} color={fullTag.color} />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic py-2">
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
