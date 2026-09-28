"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient } from "@/lib/api-client";
import { Button, Field, PageHeader, TagChip } from "@/components/common";
import { Film, Search, Calendar, Camera, Tv, Tag as TagIcon, Tags, Euro, Hash, ChevronDown, ChevronUp, ScanBarcode } from "lucide-react";
import TagPickerModal from "@/components/modals/TagPickerModal";
import { Tag } from "@/types/tag";

type MediaType = "movie" | "series";

export default function AddBlurayPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  // Use route protection
  useRouteProtection(pathname);

  const [type, setType] = useState<MediaType>("movie");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [tmdbId, setTmdbId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await apiClient.getTags();
        const tags = Array.isArray(response) ? response : [];
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
        setAvailableTags([]);
      }
    };
    fetchTags();
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // If TMDB/IMDB ID is provided, use direct ID lookup
    if (tmdbId.trim()) {
      const params = new URLSearchParams({
        type,
        ...(purchaseDate && { purchaseDate }),
        ...(buyingPrice && { buyingPrice }),
        ...(selectedTags.length > 0 && { tags: selectedTags.join(",") }),
      });

      // Check if it's an IMDB ID (starts with 'tt') or TMDB ID (numeric)
      const isImdbId = /^tt\d{7,8}$/i.test(tmdbId.trim());
      const source = isImdbId ? 'imdb' : 'tmdb';
      
      router.push(`${ROUTES.DASHBOARD.ADD.RESULTS}?${params.toString()}&id=${tmdbId.trim()}&source=${source}`);
      return;
    }

    // Otherwise, require name for search
    if (!name.trim()) return;

    // Navigate to search page with query params
    const params = new URLSearchParams({
      type,
      name: name.trim(),
      ...(year && { year }),
      ...(purchaseDate && { purchaseDate }),
      ...(buyingPrice && { buyingPrice }),
      ...(selectedTags.length > 0 && { tags: selectedTags.join(",") }),
    });

    router.push(ROUTES.DASHBOARD.ADD.SEARCH + `?${params.toString()}`);
  };

  const handleScanBarcode = () => {
    // Navigate to scan page with query params
    const params = new URLSearchParams({
      type,
      ...(purchaseDate && { purchaseDate }),
      ...(buyingPrice && { buyingPrice }),
      ...(selectedTags.length > 0 && { tags: selectedTags.join(",") }),
    });

    router.push(ROUTES.DASHBOARD.ADD.SCAN + `?${params.toString()}`);
  };

  const typeOption = (value: MediaType, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      aria-pressed={type === value}
      onClick={() => setType(value)}
      className={`flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-colors ${
        type === value
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <PageHeader icon={<Film />} title={t("add.title")} />

      {/* Barcode shortcut */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="shrink-0 hidden sm:grid place-items-center w-11 h-11 rounded-xl bg-primary text-primary-foreground">
          <ScanBarcode className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{t("add.quickAddBarcode")}</h2>
          <p className="text-sm text-muted-foreground">{t("add.barcodeScanDesc")}</p>
        </div>
        <Button onClick={handleScanBarcode} icon={<Camera />}>
          {t("barcode.title")}
        </Button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card p-4 sm:p-6 space-y-5">
        <Field label={t("add.type")}>
          <div className="grid grid-cols-2 gap-3">
            {typeOption("movie", <Film className="w-4 h-4" />, t("add.movie"))}
            {typeOption("series", <Tv className="w-4 h-4" />, t("add.series"))}
          </div>
        </Field>

        <Field
          label={
            <>
              {t("add.titleField")} <span className="text-destructive">*</span>
            </>
          }
          htmlFor="add-title"
        >
          <input
            id="add-title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "movie" ? t("add.movieTitlePlaceholder") : t("add.seriesTitlePlaceholder")}
            className="input"
          />
        </Field>

        {/* Optional fields collapse on mobile */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="sm:hidden w-full h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground/80 flex items-center justify-between"
        >
          {t("add.optionalFields")}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className={`${isExpanded ? "grid" : "hidden sm:grid"} grid-cols-1 sm:grid-cols-2 gap-5`}>
          <Field label={type === "movie" ? t("add.releaseYear") : t("add.firstAirYear")} icon={<Calendar />} htmlFor="add-year">
            <input
              id="add-year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t("add.yearPlaceholder")}
              className="input"
            />
          </Field>

          <Field label={t("add.tmdbOrImdbId")} icon={<Hash />} htmlFor="add-id" hint={t("add.tmdbIdHint")}>
            <input
              id="add-id"
              value={tmdbId}
              onChange={(e) => setTmdbId(e.target.value)}
              placeholder="tt0137523 / 550"
              className="input font-mono text-sm"
            />
          </Field>

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
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">€</span>
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
              {availableTags
                .filter((tag) => selectedTags.includes(tag.id))
                .map((tag) => (
                  <TagChip key={tag.id} name={tag.name} color={tag.color} />
                ))}
              <Button variant="secondary" size="sm" inline onClick={() => setShowTagModal(true)} icon={<Tags />}>
                {t("add.editTags")}
                {selectedTags.length > 0 && ` (${selectedTags.length})`}
              </Button>
            </div>
          </Field>
        </div>

        <Button type="submit" size="lg" fullWidth disabled={!name.trim() && !tmdbId.trim()} icon={<Search />}>
          {tmdbId.trim() ? t("add.findById") : t("add.searchTMDB")}
        </Button>
      </form>

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
