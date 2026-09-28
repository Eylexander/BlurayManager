"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Tags,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, getApiError } from "@/lib/api-client";
import useRouteProtection from "@/hooks/useRouteProtection";
import { Button, IconButton, PageHeader } from "@/components/common";

// Matches the backend's request body limit
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  tagsCreated?: number;
  errors: string[];
}

// Column documentation; the authoritative header comes from the backend
// (see the template download).
const COLUMNS: [string, string][] = [
  ["Title", "col_title"],
  ["Type", "col_type"],
  ["GenreEn · GenreFr", "col_genre"],
  ["DescriptionEn · DescriptionFr", "col_description"],
  ["Director", "col_director"],
  ["ReleaseYear", "col_releaseYear"],
  ["Runtime", "col_runtime"],
  ["Rating", "col_rating"],
  ["PurchasePrice", "col_purchasePrice"],
  ["PurchaseDate", "col_purchaseDate"],
  ["CoverImageURL · BackdropURL", "col_images"],
  ["TMDBID", "col_tmdbId"],
  ["Tags", "col_tags"],
  ["Seasons", "col_seasons"],
  ["TotalEpisodes", "col_totalEpisodes"],
];

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Data rows in a CSV (header excluded), ignoring newlines inside quoted cells. */
function countCsvRows(text: string) {
  let rows = 0;
  let inQuotes = false;
  let rowHasContent = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      if (rowHasContent) rows++;
      rowHasContent = false;
    } else if (ch !== "\r") {
      rowHasContent = true;
    }
  }
  if (rowHasContent) rows++;
  return Math.max(rows - 1, 0);
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-center gap-2 text-sm font-medium [&_svg]:w-4 [&_svg]:h-4">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function MigrationPage() {
  const t = useTranslations();
  const pathname = usePathname();
  useRouteProtection(pathname);

  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<{ blurays: number; tags: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Refreshed after each import so the counts reflect what was added
  useEffect(() => {
    Promise.all([apiClient.getSimplifiedStatistics(), apiClient.getTags()])
      .then(([stats, tags]) =>
        setSummary({ blurays: stats?.total_blurays ?? 0, tags: Array.isArray(tags) ? tags.length : 0 }),
      )
      .catch(() => setSummary(null));
  }, [result]);

  const handleExport = async (template = false) => {
    setExporting(!template);
    try {
      const blob = await apiClient.exportBlurays(template);
      const date = new Date().toISOString().split("T")[0];
      saveBlob(blob, template ? "bluray-import-template.csv" : `bluray-collection-${date}.csv`);
      if (!template) toast.success(t("importExport.exportSuccess"));
    } catch {
      toast.error(t("importExport.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const selectFile = async (candidate: File | undefined) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("importExport.invalidFileType"));
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error(t("importExport.fileTooLarge"));
      return;
    }
    setResult(null);
    setFile(candidate);
    setRowCount(countCsvRows(await candidate.text()));
  };

  const clearFile = () => {
    setFile(null);
    setRowCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res: ImportResult = await apiClient.importBlurays(formData);
      setResult(res);
      clearFile();

      if (res.failed > 0) {
        toast.error(t("importExport.importPartialSuccess", { success: res.success, failed: res.failed }));
      } else if (res.skipped > 0) {
        toast.success(t("importExport.importWithSkipped", { success: res.success, skipped: res.skipped }));
      } else {
        toast.success(t("importExport.importSuccess", { count: res.success }));
      }
    } catch (error) {
      toast.error(getApiError(error, t("importExport.importFailed")));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <PageHeader icon={<ArrowDownUp />} title={t("importExport.title")} description={t("importExport.subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <section className="card p-5 sm:p-6 flex flex-col">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-primary/10 text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("importExport.export")}</h2>
              <p className="text-sm text-muted-foreground">{t("importExport.exportDescription")}</p>
            </div>
          </div>

          <div className="my-5 flex-1 flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <FileSpreadsheet className="w-9 h-9 shrink-0 text-primary/70" />
            <div className="min-w-0">
              <p className="font-mono text-sm text-foreground truncate">
                bluray-collection-{new Date().toISOString().split("T")[0]}.csv
              </p>
              <p className="text-sm text-muted-foreground">
                {summary
                  ? t("importExport.collectionSummary", { blurays: summary.blurays, tags: summary.tags })
                  : "…"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => handleExport()} loading={exporting} icon={<Download />} className="sm:flex-1">
              {t("importExport.downloadCSV")}
            </Button>
            <Button variant="secondary" onClick={() => handleExport(true)} icon={<FileText />}>
              {t("importExport.downloadTemplate")}
            </Button>
          </div>
        </section>

        {/* Import */}
        <section className="card p-5 sm:p-6 flex flex-col">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("importExport.import")}</h2>
              <p className="text-sm text-muted-foreground">{t("importExport.importDescription")}</p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="my-5 flex-1 flex items-center gap-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
              <FileSpreadsheet className="w-9 h-9 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(file.size)} · {t("importExport.rowsDetected", { count: rowCount })}
                </p>
              </div>
              <IconButton label={t("importExport.removeFile")} onClick={clearFile} disabled={importing}>
                <X />
              </IconButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className={`my-5 flex-1 min-h-[7.5rem] flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                dragging
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium text-foreground">{t("importExport.dropTitle")}</span>
              <span className="text-xs">{t("importExport.dropHint")}</span>
            </button>
          )}

          <Button
            variant="success"
            onClick={handleImport}
            loading={importing}
            disabled={!file || rowCount === 0}
            icon={<Upload />}
            fullWidth
          >
            {file ? t("importExport.startImport", { count: rowCount }) : t("importExport.uploadCSV")}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{t("importExport.duplicatesNote")}</p>
        </section>
      </div>

      {/* Import results */}
      {result && (
        <section className="card p-5 sm:p-6 animate-in" aria-live="polite">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t("importExport.importResults")}</h2>
            <Button variant="ghost" size="sm" inline onClick={() => inputRef.current?.click()} icon={<Upload />}>
              {t("importExport.importAnother")}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              icon={<CheckCircle2 />}
              label={t("importExport.successCount")}
              value={result.success}
              tone="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
            />
            <StatTile
              icon={<Copy />}
              label={t("importExport.skippedCount")}
              value={result.skipped}
              tone="border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
            />
            <StatTile
              icon={<XCircle />}
              label={t("importExport.failedCount")}
              value={result.failed}
              tone="border-destructive/30 bg-destructive/5 text-destructive"
            />
            <StatTile
              icon={<Tags />}
              label={t("importExport.tagsCreatedCount")}
              value={result.tagsCreated ?? 0}
              tone="border-primary/30 bg-primary/5 text-primary"
            />
          </div>

          {result.errors.length > 0 && (
            <details className="group mt-4 rounded-lg border border-destructive/30" open={result.errors.length <= 5}>
              <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none text-sm font-medium text-destructive list-none">
                <AlertTriangle className="w-4 h-4" />
                {t("importExport.errors")} ({result.errors.length})
                <ChevronDown className="ml-auto w-4 h-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="max-h-60 overflow-y-auto border-t border-destructive/20 divide-y divide-border text-sm">
                {result.errors.map((error, i) => (
                  <li key={i} className="px-4 py-2 font-mono text-xs text-foreground/80">
                    {error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* Format reference */}
      <details className="group card">
        <summary className="flex items-center gap-3 p-5 sm:p-6 cursor-pointer select-none list-none">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-foreground">{t("importExport.formatTitle")}</span>
          <ChevronDown className="ml-auto w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 sm:px-6 pb-6 -mt-2">
          <p className="text-sm text-muted-foreground mb-4">{t("importExport.formatIntro")}</p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {COLUMNS.map(([name, key]) => (
                  <tr key={name} className="even:bg-muted/30">
                    <td className="w-px px-4 py-2 align-top font-mono text-xs text-foreground whitespace-nowrap">{name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t(`importExport.${key}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
