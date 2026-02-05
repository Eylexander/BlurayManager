"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/common";
import {
  Film,
  Search,
  Calendar,
  Camera,
  Tv,
  TagIcon,
  Edit,
} from "lucide-react";
import AddTagModal from "@/components/modals/AddTagModal";

type MediaType = "movie" | "series";

interface Tag {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export default function AddBlurayPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  // Use route protection
  useRouteProtection(pathname);

  const [type, setType] = useState<MediaType>("movie");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

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

  const handleSearch = () => {
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
      ...(purchaseDate && { purchaseDate }),
      ...(buyingPrice && { buyingPrice }),
      ...(selectedTags.length > 0 && { tags: selectedTags.join(",") }),
    });

    router.push(ROUTES.DASHBOARD.ADD.SCAN + `?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12 pt-6 space-y-8">
      <div className="flex items-center space-x-3">
        <Film className="w-8 h-8 text-blue-600 dark:text-blue-500" />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("add.title")}
        </h1>
      </div>

      {/* Barcode Scanner Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-purple-300 dark:border-purple-600/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-500 rounded-full" />
              {t("add.quickAddBarcode")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-3">
              {t("add.barcodeScanDesc")}
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleScanBarcode}
            icon={<Camera className="w-5 h-5" />}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
          >
            {t("barcode.title")}
          </Button>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
        <div className="space-y-3 sm:space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("add.type")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("movie")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  type === "movie"
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <Film className="w-5 h-5" />
                <span className="font-medium">{t("add.movie")}</span>
              </button>
              <button
                type="button"
                onClick={() => setType("series")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  type === "series"
                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                    : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <Tv className="w-5 h-5" />
                <span className="font-medium">{t("add.series")}</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("add.titleField")}{" "}
              <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "movie"
                  ? t("add.movieTitlePlaceholder")
                  : t("add.seriesTitlePlaceholder")
              }
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {type === "movie" ? t("add.releaseYear") : t("add.firstAirYear")}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t("add.yearPlaceholder")}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t("add.purchaseDate")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-50 dark:focus:bg-gray-700 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity"
                />
              </div>
              <Button
                variant="primary"
                onClick={() =>
                  setPurchaseDate(new Date().toISOString().split("T")[0])
                }
                size="md"
                className="min-w-0"
              >
                <Calendar className="w-4 h-4 inline vsm:hidden" />
                <span className="hidden vsm:inline">{t("add.today")}</span>
              </Button>
            </div>
          </div>

          {/* Buying Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("details.purchasePrice")}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                €
              </span>
              <input
                type="number"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tags */}
          {showTagModal && (
            <AddTagModal
              initialSelectedTags={selectedTags}
              onClose={() => setShowTagModal(false)}
              onSave={(ids, updatedAvailableTags) => {
                setSelectedTags(ids);
                setAvailableTags(updatedAvailableTags);
                setShowTagModal(false);
              }}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <TagIcon className="w-4 h-4 inline mr-1" />
              {t("add.tags")}
            </label>
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="group w-full px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-400 hover:from-blue-500/20 hover:to-blue-600/20 border-2 border-dashed border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              <Edit className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>{t("add.editTags")}</span>
              {selectedTags.length > 0 && (
                <span className="ml-2 px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/30">
                  {selectedTags.length}
                </span>
              )}
            </button>
            {selectedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableTags
                  .filter((tag) => selectedTags.includes(tag.id))
                  .map((tag) => (
                    <span
                      key={tag.id}
                      className="px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    >
                      {tag.icon && (
                        <TagIcon className="w-4 h-4 inline mr-1.5" />
                      )}
                      {tag.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Search Button */}
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={!name.trim()}
            icon={<Search className="w-5 h-5" />}
            fullWidth
          >
            {t("add.searchTMDB")}
          </Button>
        </div>
      </div>


    </div>
  );
}
