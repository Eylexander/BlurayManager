"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient, getApiError } from "@/lib/api-client";
import { buildBlurayFromTMDB } from "@/lib/tmdb-utils";
import { getTitle } from "@/lib/bluray-utils";
import { Button, Field, IconButton, PageHeader, TagChip, BlurayRowSkeleton } from "@/components/common";
import {
  Film,
  Search,
  Calendar,
  Tv,
  Tag as TagIcon,
  Tags,
  Euro,
  Hash,
  ChevronDown,
  ScanBarcode,
  Plus,
  Star,
  X,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import TagPickerModal from "@/components/modals/TagPickerModal";
import { Tag } from "@/types/tag";
import { TMDBResult } from "@/types/tmdb";

type MediaType = "movie" | "series";

const MAX_RESULTS = 10;

export default function AddBlurayPage() {
  const t = useTranslations();
  const locale = useLocale() as "en-US" | "fr-FR";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useRouteProtection(pathname);

  // Initial values come from the URL: the barcode scanner sends a cleaned up
  // title (and maybe year/season), and coming back from details restores them.
  const [type, setType] = useState<MediaType>(params.get("type") === "series" ? "series" : "movie");
  const [query, setQuery] = useState(params.get("name") || "");
  const [year, setYear] = useState(params.get("year") || "");
  const [season, setSeason] = useState(params.get("season") || "");
  const [purchaseDate, setPurchaseDate] = useState(params.get("purchaseDate") || "");
  const [buyingPrice, setBuyingPrice] = useState(params.get("buyingPrice") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    params.get("tags")?.split(",").filter(Boolean) || [],
  );
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const [results, setResults] = useState<TMDBResult[]>([]);
  // Which search the results answer; while it differs from the current one,
  // a search is pending (debounced or in flight)
  const [resultsKey, setResultsKey] = useState("");
  const [adding, setAdding] = useState<number | null>(null);

  const trimmed = query.trim();
  const imdbId = /^tt\d{7,8}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
  // A number may be a TMDB ID or a title ("1917"), so it gets both
  const tmdbId = /^\d{1,8}$/.test(trimmed) ? trimmed : null;
  const canSearch = trimmed.length >= 2 && !imdbId;
  const searchKey = `${type}|${trimmed}|${year}`;
  const searching = canSearch && resultsKey !== searchKey;

  useEffect(() => {
    apiClient
      .getTags()
      .then((tags) => setAvailableTags(Array.isArray(tags) ? tags : []))
      .catch(() => setAvailableTags([]));
  }, []);

  // Search as the user types, debounced
  useEffect(() => {
    if (!canSearch) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let found: TMDBResult[] = [];
      try {
        const response = await apiClient.searchTMDB(type, trimmed, year || undefined);
        found = (response.results || []).slice(0, MAX_RESULTS);
      } catch {
        if (!cancelled) toast.error(t("add.failedToSearchTMDB"));
      }
      if (!cancelled) {
        setResults(found);
        setResultsKey(searchKey);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSearch, searchKey, trimmed, type, year, t]);

  // Params carried to the details page and kept in the URL
  const carriedParams = () => {
    const p = new URLSearchParams({ type });
    if (purchaseDate) p.set("purchaseDate", purchaseDate);
    if (buyingPrice) p.set("buyingPrice", buyingPrice);
    if (selectedTags.length > 0) p.set("tags", selectedTags.join(","));
    if (season) p.set("season", season);
    return p;
  };

  // Keep the URL in sync so "back" from the details page restores the search
  useEffect(() => {
    const p = carriedParams();
    if (trimmed) p.set("name", trimmed);
    if (year) p.set("year", year);
    window.history.replaceState(null, "", `?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, trimmed, year, season, purchaseDate, buyingPrice, selectedTags]);

  const openDetails = (id: string | number, source: "tmdb" | "imdb" = "tmdb") => {
    const p = carriedParams();
    p.set("id", String(id));
    p.set("source", source);
    if (year) p.set("year", year);
    router.push(`${ROUTES.DASHBOARD.ADD.RESULTS}?${p.toString()}`);
  };

  const handleQuickAdd = async (result: TMDBResult) => {
    setAdding(result.id);
    try {
      const details = await apiClient.getTMDBDetails(type, result.id);
      const bluray = buildBlurayFromTMDB(
        details,
        type,
        { purchaseDate, purchasePrice: buyingPrice, tags: selectedTags },
        season ? [parseInt(season)] : undefined,
      );
      const { merged, addedSeasons } = await apiClient.addToCollection(bluray);
      const title = getTitle(bluray, locale);
      if (merged && addedSeasons.length === 0) {
        toast(t("bluray.alreadyHasSeasons", { title }), { icon: "ℹ️" });
        return;
      }
      toast.success(
        merged
          ? t("bluray.addedSeasonsToSeries", { seasons: addedSeasons.join(", "), title })
          : t("add.addedToCollection", { title }),
      );
      router.push(ROUTES.DASHBOARD.HOME);
    } catch (error) {
      toast.error(getApiError(error, t("add.failedToAddToCollection")));
    } finally {
      setAdding(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imdbId) openDetails(imdbId, "imdb");
    else if (results.length > 0) openDetails(results[0].id);
  };

  const scanHref = `${ROUTES.DASHBOARD.ADD.SCAN}?${carriedParams().toString()}`;
  const tags = availableTags.filter((tag) => selectedTags.includes(tag.id));
  const purchaseSummary = [
    purchaseDate && new Date(purchaseDate).toLocaleDateString(locale),
    buyingPrice && `€${buyingPrice}`,
    selectedTags.length > 0 && t("add.tagCount", { count: selectedTags.length }),
  ].filter(Boolean);

  const typeOption = (value: MediaType, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={type === value}
      onClick={() => setType(value)}
      className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors [&_svg]:w-4 [&_svg]:h-4 ${
        type === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const chip = (label: string, onRemove: () => void) => (
    <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("add.removeFilter", { filter: label })}
        className="grid place-items-center w-5 h-5 rounded-full hover:bg-primary/15"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-4 sm:space-y-6">
      <PageHeader
        icon={<Plus />}
        title={t("add.title")}
        description={t("add.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => router.push(scanHref)} icon={<ScanBarcode />}>
            {t("barcode.title")}
          </Button>
        }
      />

      {/* Search */}
      <form onSubmit={handleSubmit} className="card p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={type === "movie" ? t("add.movieTitlePlaceholder") : t("add.seriesTitlePlaceholder")}
            aria-label={t("add.titleField")}
            autoFocus
            enterKeyHint="search"
            className="input h-14 pl-12 pr-12 text-lg"
          />
          {query && (
            <IconButton
              label={t("common.clearSearch")}
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X />
            </IconButton>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label={t("add.type")} className="inline-flex p-0.5 rounded-lg bg-muted">
            {typeOption("movie", <Film />, t("add.movie"))}
            {typeOption("series", <Tv />, t("add.series"))}
          </div>
          {year && chip(year, () => setYear(""))}
          {season && type === "series" && chip(t("add.seasonChip", { season }), () => setSeason(""))}
          <p className="ml-auto hidden sm:block text-xs text-muted-foreground">{t("add.idHint")}</p>
        </div>
      </form>

      {/* Results */}
      <section aria-live="polite" aria-busy={searching} className="space-y-2 sm:space-y-3">
        {imdbId && (
          <IdRow label={t("add.findImdb", { id: imdbId })} onClick={() => openDetails(imdbId, "imdb")} />
        )}
        {tmdbId && <IdRow label={t("add.openTmdbId", { id: tmdbId })} onClick={() => openDetails(tmdbId)} />}

        {!canSearch ? (
          !imdbId && (
            <div className="card p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-primary/10 text-primary">
                <Film className="w-7 h-7" />
              </div>
              <h2 className="font-semibold text-foreground">{t("add.emptyTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{t("add.emptyDescription")}</p>
              <Button variant="secondary" className="mt-5" onClick={() => router.push(scanHref)} icon={<ScanBarcode />}>
                {t("add.quickAddBarcode")}
              </Button>
            </div>
          )
        ) : searching && results.length === 0 ? (
          Array.from({ length: 3 }, (_, i) => <BlurayRowSkeleton key={i} />)
        ) : results.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-muted-foreground">{t("add.noResults")}</p>
            {(type === "movie" || year) && (
              <div className="flex flex-wrap justify-center gap-2">
                {type === "movie" && (
                  <Button variant="secondary" size="sm" inline icon={<Tv />} onClick={() => setType("series")}>
                    {t("add.trySeries")}
                  </Button>
                )}
                {year && (
                  <Button variant="secondary" size="sm" inline icon={<Calendar />} onClick={() => setYear("")}>
                    {t("add.anyYear")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <ul className={`space-y-2 sm:space-y-3 transition-opacity ${searching ? "opacity-60" : ""}`}>
            {results.map((result) => (
              <ResultRow
                key={result.id}
                result={result}
                type={type}
                adding={adding === result.id}
                disabled={adding !== null}
                onOpen={() => openDetails(result.id)}
                onAdd={() => handleQuickAdd(result)}
                addLabel={t("add.addToCollection")}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Purchase details, applied to whatever gets added */}
      <section className="card">
        <button
          type="button"
          onClick={() => setShowPurchase(!showPurchase)}
          aria-expanded={showPurchase}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{t("add.purchaseDetails")}</p>
            <p className="text-xs text-muted-foreground truncate">
              {purchaseSummary.length > 0 ? purchaseSummary.join(" · ") : t("add.purchaseDetailsHint")}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${showPurchase ? "rotate-180" : ""}`}
          />
        </button>

        {showPurchase && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-4 pb-5 pt-1 animate-fade-in">
            <Field label={t("add.purchaseDate")} icon={<Calendar />} htmlFor="add-date">
              <div className="flex gap-2">
                <input
                  id="add-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="input min-w-0 flex-1"
                />
                <Button
                  variant="secondary"
                  inline
                  onClick={() => setPurchaseDate(new Date().toISOString().split("T")[0])}
                >
                  {t("add.today")}
                </Button>
              </div>
            </Field>

            <Field label={t("details.purchasePrice")} icon={<Euro />} htmlFor="add-price">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  €
                </span>
                <input
                  id="add-price"
                  type="number"
                  inputMode="decimal"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="input pl-8 tabular-nums"
                />
              </div>
            </Field>

            <Field label={t("add.tags")} icon={<TagIcon />} className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <TagChip key={tag.id} name={tag.name} color={tag.color} />
                ))}
                <Button variant="secondary" size="sm" inline onClick={() => setShowTagModal(true)} icon={<Tags />}>
                  {t("add.editTags")}
                </Button>
              </div>
            </Field>
          </div>
        )}
      </section>

      {showTagModal && (
        <TagPickerModal
          initialSelectedTags={selectedTags}
          onClose={() => setShowTagModal(false)}
          onSave={(ids, tags) => {
            setSelectedTags(ids);
            setAvailableTags(tags);
          }}
        />
      )}
    </div>
  );
}

/** Shortcut row for a query that looks like an IMDb or TMDB ID. */
function IdRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
    >
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
        <Hash className="w-4 h-4" />
      </div>
      <span className="flex-1 font-medium">{label}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function ResultRow({
  result,
  type,
  adding,
  disabled,
  onOpen,
  onAdd,
  addLabel,
}: {
  result: TMDBResult;
  type: MediaType;
  adding: boolean;
  disabled: boolean;
  onOpen: () => void;
  onAdd: () => void;
  addLabel: string;
}) {
  const title = result.title || result.name || "";
  const original = result.original_title || result.original_name;
  const year = (result.release_date || result.first_air_date)?.split("-")[0];

  return (
    <li className="group relative flex items-center gap-3 sm:gap-4 p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all animate-fade-in">
      <div className="relative w-14 h-20 sm:w-16 sm:h-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {result.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
            alt=""
            fill
            sizes="64px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground/50">
            {type === "movie" ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* The whole row opens the details; the add button sits above this link */}
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-semibold text-foreground truncate max-w-full group-hover:text-primary transition-colors after:absolute after:inset-0"
        >
          {title}
        </button>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
          {year && <span className="tabular-nums">{year}</span>}
          {!!result.vote_average && result.vote_average > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              {result.vote_average.toFixed(1)}
            </span>
          )}
          {original && original !== title && <span className="truncate italic">{original}</span>}
        </div>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2 hidden vsm:block">{result.overview}</p>
      </div>

      <Button
        inline
        onClick={onAdd}
        loading={adding}
        disabled={disabled}
        aria-label={addLabel}
        title={addLabel}
        className="relative z-10 w-11 h-11 !px-0 shrink-0"
      >
        {!adding && <Plus />}
      </Button>
    </li>
  );
}
