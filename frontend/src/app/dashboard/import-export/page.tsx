"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import useRouteProtection from "@/hooks/useRouteProtection";

// Reusable Components
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
);

interface FeatureItemProps {
  icon: React.ReactNode;
  text: string;
}

const FeatureItem = ({ icon, text }: FeatureItemProps) => (
  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
    {icon}
    <span>{text}</span>
  </div>
);

export default function ImportExportPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Use route protection - admin only
  useRouteProtection(pathname);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await apiClient.exportBlurays();

      // Create blob and download
      const blob = new Blob([response], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `bluray-collection-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("importExport.exportSuccess"));
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error(t("importExport.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error(t("importExport.invalidFileType"));
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiClient.importBlurays(formData);

      setImportResult(result);

      if (result.failed === 0 && result.skipped === 0) {
        toast.success(
          t("importExport.importSuccess", { count: result.success }),
        );
      } else if (result.failed === 0) {
        toast.success(
          t("importExport.importWithSkipped", {
            success: result.success,
            skipped: result.skipped,
          }),
        );
      } else {
        toast.error(
          t("importExport.importPartialSuccess", {
            success: result.success,
            failed: result.failed,
          }),
        );
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      toast.error(
        error?.response?.data?.error || t("importExport.importFailed"),
      );
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 mt-8 md:text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("importExport.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("importExport.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("importExport.export")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("importExport.exportDescription")}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <FeatureItem
                icon={<CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />}
                text={t("importExport.exportFeature1")}
              />
              <FeatureItem
                icon={<CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />}
                text={t("importExport.exportFeature2")}
              />
              <FeatureItem
                icon={<CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />}
                text={t("importExport.exportFeature3")}
              />
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <LoadingSpinner />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t("importExport.downloadCSV")}
                </>
              )}
            </button>
          </div>

          {/* Import Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("importExport.import")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("importExport.importDescription")}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <FeatureItem
                icon={<FileText className="w-4 h-4 mt-0.5 text-blue-500" />}
                text={t("importExport.importFeature1")}
              />
              <FeatureItem
                icon={<FileText className="w-4 h-4 mt-0.5 text-blue-500" />}
                text={t("importExport.importFeature2")}
              />
              <FeatureItem
                icon={
                  <AlertCircle className="w-4 h-4 mt-0.5 text-orange-500" />
                }
                text={t("importExport.importFeature3")}
              />
            </div>

            <label
              htmlFor="csv-upload"
              className={`block w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer text-center ${
                importing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {importing ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  {t("common.loading")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  {t("importExport.uploadCSV")}
                </span>
              )}
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </div>
        </div>

        {/* Import Results */}
        {importResult && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("importExport.importResults")}
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-900 dark:text-green-100">
                    {t("importExport.successCount")}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.success}
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold text-orange-900 dark:text-orange-100">
                    {t("importExport.skippedCount")}
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {importResult.skipped}
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-900 dark:text-red-100">
                    {t("importExport.failedCount")}
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {importResult.failed}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t("importExport.errors")}
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <p
                      key={index}
                      className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded"
                    >
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
