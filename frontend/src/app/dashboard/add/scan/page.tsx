"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { apiClient } from "@/lib/api-client";
import {
  Film,
  ChevronLeft,
  Camera,
  X,
  Keyboard,
  Check,
  ScanLine,
  Smartphone,
  Layers,
  Search,
  Plus,
} from "lucide-react";
import { cleanProductTitle } from "@/lib/tmdb-utils";
import { LoaderCircle } from "@/components/common/LoaderCircle";
import { BrowserMultiFormatReader } from "@zxing/library";
import { motion, AnimatePresence } from "framer-motion";

type MediaType = "movie" | "series";

export default function AddScanPage() {
  const t = useTranslations();
  const tBarcode = useTranslations("barcode");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useRouteProtection(pathname);

  // Get params from URL
  const type = (searchParams.get("type") as MediaType) || "movie";
  const purchaseDate = searchParams.get("purchaseDate") || "";
  const tags = searchParams.get("tags")?.split(",") || [];

  // State management
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  // Theme-aware styles applied to scan page elements

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Initialize ZXing reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Tab Change
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    }
  }, [activeTab]);

  // Trigger scan when camera becomes active and video ref is ready
  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      startAutoScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraActive]);

  function stopCamera() {
    codeReaderRef.current?.reset();
    setIsCameraActive(false);
    setCameraReady(false);
    lastScannedRef.current = null;
    lastScanTimeRef.current = 0;
  }

  function startCamera() {
    setCameraError(null);
    setIsCameraActive(true);
  }

  async function startAutoScan() {
    if (!codeReaderRef.current || !videoRef.current) return;

    // Reset any previous session
    codeReaderRef.current.reset();

    try {
      await codeReaderRef.current.decodeFromVideoDevice(
        null, // first available video device
        videoRef.current,
        (result, error) => {
          if (!cameraReady && videoRef.current?.readyState === 4) {
            setCameraReady(true);
          }

          if (result) {
            const barcode = result.getText();
            const now = Date.now();

            // Debounce Logic
            if (
              barcode !== lastScannedRef.current ||
              now - lastScanTimeRef.current > 2000
            ) {
              lastScannedRef.current = barcode;
              lastScanTimeRef.current = now;

              if (isBatchMode) {
                setScannedBarcodes((prev) => {
                  if (!prev.includes(barcode)) {
                    toast.success(`${tBarcode("scanned")}: ${barcode}`);
                    return [barcode, ...prev]; // Add to top
                  }
                  return prev;
                });
              } else {
                handleBarcodeScanned(barcode);
              }
            }
          }
        },
      );
    } catch (err) {
      console.error("Barcode Scanner Start Error:", err);
      setCameraError(
        "Could not start camera scanner. Please ensure camera permissions are granted.",
      );
      setIsCameraActive(false);
    }
  }

  async function handleBarcodeScanned(barcode: string) {
    if (!barcode || !barcode.trim()) {
      toast.error(tBarcode("invalidBarcode"));
      return;
    }

    setSearching(true);
    stopCamera();

    try {
      // Lookup the barcode using our backend proxy
      toast.loading(tBarcode("lookingUp"));

      try {
        const upcData = await apiClient.lookupBarcode(barcode);

        if (upcData.items && upcData.items.length > 0) {
          const product = upcData.items[0];
          let title = product.title;

          // Clean up the title
          title = cleanProductTitle(title);

          toast.dismiss();
          toast.success(`${tBarcode("found")}: ${title}`);

          // Navigate to search page with the cleaned title
          const params = new URLSearchParams({
            type,
            name: title,
            ...(purchaseDate && { purchaseDate }),
            ...(tags.length > 0 && { tags: tags.join(",") }),
          });

          router.push(`${ROUTES.DASHBOARD.ADD.SEARCH}?${params.toString()}`);
        } else {
          // UPC not found in database
          toast.dismiss();
          toast.error(tBarcode("notFound"));
          setSearching(false);
          startCamera(); // Restart camera
        }
      } catch (upcError: any) {
        console.error("UPC lookup error:", upcError);
        toast.dismiss();
        toast.error(t("add.searchFailed"));
        setSearching(false);
        startCamera();
      }
    } catch (error: any) {
      console.error("Barcode search error:", error);
      const errorMessage = error?.message || t("add.failedToSearch");
      toast.dismiss();
      toast.error(t("add.searchFailed", { error: errorMessage }));
      setSearching(false);
      startCamera();
    }
  }

  const handleManualSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualInput.trim()) {
      toast.error(tBarcode("invalidBarcode"));
      return;
    }

    if (isBatchMode) {
      setScannedBarcodes((prev) => {
        if (!prev.includes(manualInput.trim())) {
          toast.success(`${tBarcode("scanned")}: ${manualInput.trim()}`);
          return [manualInput.trim(), ...prev];
        }
        toast(tBarcode("alreadyScanned"), { icon: "ℹ️" });
        return prev;
      });
      setManualInput("");
    } else {
      handleBarcodeScanned(manualInput.trim());
    }
  };

  const handleFinishBatch = async () => {
    if (scannedBarcodes.length === 0) {
      toast.error(t("add.noResults"));
      return;
    }

    stopCamera();
    setSearching(true);

    try {
      toast.loading(tBarcode("processing"));

      // Process each barcode sequentially
      for (const barcode of scannedBarcodes) {
        await handleBarcodeScanned(barcode);
        break;
      }
    } catch (error) {
      // ...
    }
  };

  if (searching) {
    return <LoaderCircle />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 pt-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 backdrop-blur-sm">
            <ScanLine className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t("add.title")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tBarcode("title")}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 backdrop-blur-sm group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{t("common.back")}</span>
        </button>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl p-1 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
      >
        {/* Tab Switcher */}
        <div className="flex bg-gray-50 dark:bg-gray-900/50 rounded-t-3xl border-b border-gray-200 dark:border-gray-800 gap-2 p-2">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === "camera"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            }`}
          >
            <Camera
              className={`w-4 h-4 ${activeTab === "camera" ? "text-purple-400" : ""}`}
            />
            Camera
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === "manual"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            }`}
          >
            <Keyboard
              className={`w-4 h-4 ${activeTab === "manual" ? "text-blue-400" : ""}`}
            />
            Manual
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8 bg-gradient-to-b from-gray-50 dark:from-gray-900/50 to-gray-100 dark:to-gray-900/80 min-h-[400px] flex flex-col">
          {/* Batch Mode Toggle */}
          <div className="flex justify-end mb-6">
            <label className="flex items-center gap-3 px-4 py-2 rounded-xl border transition-all cursor-pointer bg-gray-100 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600/50">
              <input
                type="checkbox"
                checked={isBatchMode}
                onChange={(e) => setIsBatchMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 checked:bg-purple-600 checked:border-purple-600 cursor-pointer accent-purple-500"
              />
              <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                {tBarcode("batchMode")}
              </span>
            </label>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "camera" && (
              <motion.div
                key="camera"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center flex-1"
              >
                {!isCameraActive ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-10 min-h-[300px]">
                    {cameraError ? (
                      <div className="text-red-400 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
                          <X className="w-8 h-8" />
                        </div>
                        <p className="text-center max-w-xs">{cameraError}</p>
                        <button
                          onClick={startCamera}
                          className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-300 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="p-6 bg-gray-800/50 rounded-full border border-gray-700 shadow-xl"
                        >
                          <Camera className="w-12 h-12 text-gray-400" />
                        </motion.div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Camera is Inactive
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                            {t("add.barcodeScanDesc") ||
                              "Tap the button below to start scanning."}
                          </p>
                        </div>
                        <button
                          onClick={startCamera}
                          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <Camera className="w-5 h-5" />
                          Scan Barcode
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                        <LoaderCircle />
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    {/* Scanner Overlay */}
                    {cameraReady && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[80%] h-[60%] border border-purple-500/30 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-400/40 -mt-0.5 -ml-0.5 rounded-tl"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-400/40 -mt-0.5 -mr-0.5 rounded-tr"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-400/40 -mb-0.5 -ml-0.5 rounded-bl"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400/40 -mb-0.5 -mr-0.5 rounded-br"></div>

                            <motion.div
                              animate={{ top: ["0%", "100%", "100%"] }}
                              transition={{
                                duration: 3.5,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="absolute left-0 right-0 h-px bg-purple-500/40"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "manual" && (
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col w-full max-w-md mx-auto justify-center"
              >
                <div className="space-y-6 bg-gray-100 dark:bg-gray-800/30 p-8 rounded-3xl border border-gray-200 dark:border-gray-700/50">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Keyboard className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Manual Entry
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Type the barcode number found on the case
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="e.g. 883904245645"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center text-lg tracking-widest font-mono text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualInput.trim()}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isBatchMode ? (
                        <Plus className="w-5 h-5" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                      {isBatchMode ? "Add to List" : "Search Barcode"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Batch List - Showing items */}
          <AnimatePresence>
            {isBatchMode && scannedBarcodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 border-t border-gray-800 pt-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Scanned Items ({scannedBarcodes.length})
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setScannedBarcodes([])}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleFinishBatch}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Process Batch
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {scannedBarcodes.map((code, index) => (
                      <motion.div
                        key={code}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 group hover:border-purple-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-mono">
                            {scannedBarcodes.length - index}
                          </span>
                          <span className="font-mono text-gray-200">
                            {code}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setScannedBarcodes((prev) =>
                              prev.filter((c) => c !== code),
                            )
                          }
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
