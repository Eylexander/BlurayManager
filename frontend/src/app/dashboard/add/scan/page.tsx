"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Camera, CameraOff, Keyboard, Layers, Plus, Search, ScanBarcode, X, ArrowLeft, Trash2 } from "lucide-react";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient, getApiError } from "@/lib/api-client";
import { buildBlurayFromTMDB, parseProductTitle } from "@/lib/tmdb-utils";
import { Button, Field, IconButton, LoaderCircle, PageHeader } from "@/components/common";

type Tab = "camera" | "manual";

// EAN-8, UPC-A and EAN-13
const isValidBarcode = (code: string) => /^(\d{8}|\d{12}|\d{13})$/.test(code.trim());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Looks a barcode up, waiting out the lookup service's burst limit (a few
 * lookups a minute), which a batch easily hits. Returns the product title,
 * or null for an unknown barcode.
 */
async function lookupTitle(barcode: string, onWait: () => void): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await apiClient.lookupBarcode(barcode);
      return data.items?.[0]?.title ?? null;
    } catch (error) {
      if (attempt < 6 && isAxiosError(error) && error.response?.status === 429) {
        onWait();
        await sleep(10_000);
        continue;
      }
      throw error;
    }
  }
}

export default function AddScanPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useRouteProtection(pathname);

  // Purchase details chosen on the add page, applied to what gets added
  const purchase = {
    purchaseDate: searchParams.get("purchaseDate") || "",
    purchasePrice: searchParams.get("buyingPrice") || "",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
  };

  const [tab, setTab] = useState<Tab>("camera");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [batch, setBatch] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // status message while looking up
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });
  // The decode callback outlives renders, so it calls the latest handler through a ref
  const onScanRef = useRef<(code: string) => void>(() => {});

  const stopCamera = () => {
    readerRef.current?.reset();
    setCameraOn(false);
    setCameraReady(false);
  };

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => readerRef.current?.reset();
  }, []);

  // Start decoding once the <video> is mounted
  useEffect(() => {
    if (!cameraOn || !videoRef.current || !readerRef.current) return;
    const reader = readerRef.current;
    reader
      .decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (videoRef.current?.readyState === 4) setCameraReady(true);
        const code = result?.getText();
        if (!code || !isValidBarcode(code)) return;
        // The same code is read many times a second; take it once per 2s
        const now = Date.now();
        if (code === lastScanRef.current.code && now - lastScanRef.current.at < 2000) return;
        lastScanRef.current = { code, at: now };
        onScanRef.current(code);
      })
      .catch((err) => {
        console.error("Barcode scanner error:", err);
        setCameraError(true);
        setCameraOn(false);
      });
    return () => reader.reset();
  }, [cameraOn]);

  const startCamera = () => {
    setCameraError(false);
    setCameraOn(true);
  };

  const addToBatch = (code: string) => {
    if (batch.includes(code)) {
      toast(t("barcode.alreadyScanned"), { icon: "ℹ️" });
      return;
    }
    setBatch((prev) => [code, ...prev]);
    toast.success(`${t("barcode.scanned")}: ${code}`);
  };

  /** Single scan: look the title up, then pick the exact match on the add page. */
  const handleBarcode = async (code: string) => {
    if (batchMode) {
      addToBatch(code);
      return;
    }
    stopCamera();
    setBusy(t("barcode.lookingUp"));
    try {
      const productTitle = await lookupTitle(code, () => setBusy(t("barcode.rateLimited")));
      if (!productTitle) {
        toast.error(t("barcode.notFound"));
        return;
      }
      const { title, year, season } = parseProductTitle(productTitle);
      toast.success(`${t("barcode.found")}: ${productTitle}`);
      // Most blurays are movies; a season in the title means a series
      const params = new URLSearchParams({ type: season ? "series" : "movie", name: title });
      if (year) params.set("year", year);
      if (season) params.set("season", String(season));
      if (purchase.purchaseDate) params.set("purchaseDate", purchase.purchaseDate);
      if (purchase.purchasePrice) params.set("buyingPrice", purchase.purchasePrice);
      if (purchase.tags.length > 0) params.set("tags", purchase.tags.join(","));
      router.push(`${ROUTES.DASHBOARD.ADD.ADD}?${params.toString()}`);
    } catch (error) {
      toast.error(getApiError(error, t("barcode.searchFailed")));
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    onScanRef.current = handleBarcode;
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!isValidBarcode(code)) {
      toast.error(t("barcode.invalidBarcode"));
      return;
    }
    setManualInput("");
    handleBarcode(code);
  };

  /** Adds the best TMDB match for every scanned barcode; the ones that fail stay listed. */
  const handleProcessBatch = async () => {
    stopCamera();
    const failed: string[] = [];
    let added = 0;

    for (const [index, code] of batch.entries()) {
      setProgress({ done: index, total: batch.length });
      setBusy(t("barcode.processingCode", { code }));
      try {
        const productTitle = await lookupTitle(code, () => setBusy(t("barcode.rateLimited")));
        if (!productTitle) throw new Error("not found");
        const { title, year, season } = parseProductTitle(productTitle);

        // Most blurays are movies: try that first, unless a season is named
        let type: "movie" | "series" = season ? "series" : "movie";
        let results = (await apiClient.searchTMDB(type, title, year)).results || [];
        if (results.length === 0 && type === "movie") {
          type = "series";
          results = (await apiClient.searchTMDB(type, title, year)).results || [];
        }
        if (results.length === 0) throw new Error("no TMDB match");

        const details = await apiClient.getTMDBDetails(type, results[0].id);
        await apiClient.addToCollection(buildBlurayFromTMDB(details, type, purchase, season ? [season] : undefined));
        added++;
      } catch (error) {
        console.error(`Barcode ${code}:`, error);
        failed.push(code);
      }
    }

    setProgress(null);
    setBusy(null);
    setBatch(failed);
    if (added > 0) toast.success(t("barcode.batchAdded", { count: added }));
    if (failed.length > 0) toast.error(t("barcode.batchFailed", { count: failed.length }), { duration: 6000 });
    if (failed.length === 0) router.push(ROUTES.DASHBOARD.HOME);
  };

  const tabButton = (value: Tab, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => {
        setTab(value);
        if (value !== "camera") stopCamera();
      }}
      className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors [&_svg]:w-4 [&_svg]:h-4 ${
        tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-4 sm:space-y-6">
      <PageHeader
        icon={<ScanBarcode />}
        title={t("barcode.title")}
        description={t("barcode.subtitle")}
        actions={
          <Button variant="secondary" onClick={() => router.back()} icon={<ArrowLeft />}>
            {t("common.back")}
          </Button>
        }
      />

      <div className="card p-3 sm:p-4 space-y-4">
        <div role="tablist" className="flex p-0.5 rounded-lg bg-muted">
          {tabButton("camera", <Camera />, t("barcode.camera"))}
          {tabButton("manual", <Keyboard />, t("barcode.manualEntry"))}
        </div>

        {busy ? (
          <div className="py-6 text-center">
            <LoaderCircle inline />
            <p className="-mt-6 text-sm text-muted-foreground">{busy}</p>
            {progress && (
              <div className="mt-4 mx-auto max-w-xs h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        ) : tab === "camera" ? (
          cameraOn ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraReady && (
                <div className="absolute inset-0 grid place-items-center bg-black/60">
                  <LoaderCircle inline />
                </div>
              )}
              {cameraReady && (
                // Viewfinder with a sweeping scan line
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="relative w-4/5 h-3/5 rounded-lg border-2 border-white/30 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)] overflow-hidden">
                    <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_12px_2px_hsl(var(--primary))] animate-scan-line" />
                  </div>
                </div>
              )}
              <IconButton
                label={t("barcode.stopCamera")}
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 hover:text-white"
              >
                <X />
              </IconButton>
              <p className="absolute bottom-3 inset-x-0 text-center text-sm text-white/90 drop-shadow">
                {batchMode ? t("barcode.batchScanning") : t("barcode.position")}
              </p>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <div
                className={`grid place-items-center w-16 h-16 rounded-full ${
                  cameraError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                {cameraError ? <CameraOff className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
              </div>
              <p className={`text-sm max-w-xs ${cameraError ? "text-destructive" : "text-muted-foreground"}`}>
                {cameraError ? t("barcode.cameraError") : t("barcode.turnOnCameraDesc")}
              </p>
              <Button onClick={startCamera} icon={<Camera />}>
                {t("barcode.turnOnCamera")}
              </Button>
            </div>
          )
        ) : (
          <form onSubmit={handleManualSubmit} className="py-4 space-y-4 max-w-sm mx-auto">
            <Field label={t("barcode.enterBarcode")} htmlFor="barcode-input" hint={t("barcode.manualHint")}>
              <input
                id="barcode-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ""))}
                placeholder="883929106646"
                maxLength={13}
                className="input h-12 text-center text-lg font-mono tracking-widest"
                autoFocus
              />
            </Field>
            <Button
              type="submit"
              fullWidth
              disabled={!isValidBarcode(manualInput)}
              icon={batchMode ? <Plus /> : <Search />}
            >
              {batchMode ? t("barcode.addToList") : t("barcode.search")}
            </Button>
          </form>
        )}

        {/* Batch mode */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent/50 transition-colors">
          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">{t("barcode.batchMode")}</span>
            <span className="block text-xs text-muted-foreground">{t("barcode.batchHint")}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
            disabled={!!busy}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative w-10 h-6 shrink-0 rounded-full bg-muted border border-border transition-colors peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40 after:absolute after:top-0.5 after:left-0.5 after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
          />
        </label>
      </div>

      {batchMode && batch.length > 0 && (
        <section className="card p-3 sm:p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t("barcode.scannedCount", { count: batch.length })}
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" inline onClick={() => setBatch([])} disabled={!!busy} icon={<Trash2 />}>
                {t("barcode.clearAll")}
              </Button>
              <Button size="sm" inline onClick={handleProcessBatch} loading={!!progress} icon={<Plus />}>
                {t("barcode.addAll", { count: batch.length })}
              </Button>
            </div>
          </div>
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {batch.map((code, index) => (
              <li key={code} className="flex items-center gap-3 py-2">
                <span className="w-6 text-xs text-muted-foreground tabular-nums">{batch.length - index}</span>
                <span className="flex-1 font-mono text-sm tracking-wider">{code}</span>
                <IconButton
                  label={t("common.delete")}
                  variant="danger"
                  disabled={!!busy}
                  onClick={() => setBatch((prev) => prev.filter((c) => c !== code))}
                >
                  <X />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
