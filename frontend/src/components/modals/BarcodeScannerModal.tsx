'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useTranslations } from 'next-intl';

interface BarcodeScannerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onBarcodeScanned: (barcode: string) => void;
	isLoading?: boolean;
}

export default function BarcodeScannerModal({
	isOpen,
	onClose,
	onBarcodeScanned,
	isLoading = false
}: BarcodeScannerModalProps) {
	const t = useTranslations('barcode');

	const [isCameraActive, setIsCameraActive] = useState(false);
	const [cameraReady, setCameraReady] = useState(false);
	const [manualInput, setManualInput] = useState('');
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
	const [cameraStartRequested, setCameraStartRequested] = useState(false);
	const [isBatchMode, setIsBatchMode] = useState(false);
	const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
	const [isAutoScanning, setIsAutoScanning] = useState(false);

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const autoScanRef = useRef<NodeJS.Timeout | null>(null);
	const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
	const lastScannedRef = useRef<string | null>(null);
	const lastScanTimeRef = useRef<number>(0);

	const stopCamera = () => {
		codeReaderRef.current?.reset();

		setIsCameraActive(false);
		setCameraReady(false);
		setIsAutoScanning(false);
		setCameraStartRequested(false);
		lastScannedRef.current = null;
		lastScanTimeRef.current = 0;
	};

	const handleClose = () => {
		stopCamera();
		onClose();
	};

	useEffect(() => {
		codeReaderRef.current = new BrowserMultiFormatReader();
		return () => {
			codeReaderRef.current?.reset();
			stopCamera();
		};
	}, []);

	const startCamera = async () => {
		try {
			setCameraError(null);
			setCameraStartRequested(true);
			setIsCameraActive(true);
			setIsAutoScanning(true);
			setTimeout(() => {
				startAutoScan();
			}, 100);
		} catch (error: any) {
			setCameraError('Failed to initialize scanner');
		}
	};

	const startAutoScan = async () => {
		if (!codeReaderRef.current || !videoRef.current) return;

		// Reset any previous session
		codeReaderRef.current.reset();

		try {
			await codeReaderRef.current.decodeFromVideoDevice(
				null,
				videoRef.current,
				(result, error) => {
					if (!cameraReady) setCameraReady(true);

					if (result) {
						const barcode = result.getText();
						const now = Date.now();

						// Debounce Logic
						if (barcode !== lastScannedRef.current || (now - lastScanTimeRef.current) > 2000) {
							lastScannedRef.current = barcode;
							lastScanTimeRef.current = now;

							if (isBatchMode) {
								setScannedBarcodes(prev => {
									if (!prev.includes(barcode)) {
										toast.success(`${t('scanned')}: ${barcode}`);
										return [...prev, barcode];
									}
									return prev;
								});
							} else {
								setDetectedBarcode(barcode);
								setIsAutoScanning(false);

								onBarcodeScanned(barcode);
								handleClose();
							}
						}
					}
				}
			);
		} catch (err) {
			console.error("Barcode Utils Start Error:", err);
			setCameraError("Could not start camera scanner.");
		}
	};

	const handleBarcodeSubmit = (barcode: string) => {
		if (!barcode.trim()) {
			toast.error('Please enter a valid barcode');
			return;
		}
		console.log('Submitting barcode:', barcode);

		if (isBatchMode) {
			// In batch mode, add to list and continue scanning
			setScannedBarcodes(prev => {
				if (!prev.includes(barcode.trim())) {
					toast.success(`Added: ${barcode.trim()}`);
					return [...prev, barcode.trim()];
				}
				toast('Already scanned this barcode', { icon: 'ℹ️' });
				return prev;
			});
			setDetectedBarcode(null);
			setIsAutoScanning(true);
			startAutoScan();
		} else {
			// Single mode - submit and close
			toast.success('Searching for barcode...');
			onBarcodeScanned(barcode.trim());
			setManualInput('');
			handleClose();
		}
	};

	const handleFinishBatch = () => {
		if (scannedBarcodes.length === 0) {
			toast.error(t('invalidBarcode'));
			return;
		}
		toast.success(`${t('processing')}`);

		// Submit all barcodes
		scannedBarcodes.forEach(barcode => onBarcodeScanned(barcode));
		handleClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleBarcodeSubmit(manualInput);
		} else if (e.key === 'Escape') {
			handleClose();
		}
	};

	useEffect(() => {
		const stream = streamRef.current;
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}
		};
	}, []);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
			<div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700/50 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">

				{/* --- Header --- */}
				<div className="sticky top-0 flex items-center justify-between p-3 sm:p-6 border-b border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
					<div className="flex items-center gap-2 sm:gap-3">
						<div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
							<Camera className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
						</div>
						<h2 className="text-lg sm:text-2xl font-bold text-white">{t('title')}</h2>
					</div>
					<button
						onClick={handleClose}
						className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
					>
						<X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
					</button>
				</div>

				{/* --- Body --- */}
				<div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
					{!cameraStartRequested ? (
						<>
							{/* Initial Screen: Start Camera & Mode Selection */}
							<div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-4 sm:space-y-6">
								<div className="p-4 sm:p-6 rounded-full bg-purple-500/20">
									<Camera className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
								</div>
								<div className="text-center space-y-2">
									<h3 className="text-xl sm:text-2xl font-bold text-white">{t('turnOnCamera')}</h3>
									<p className="text-xs sm:text-sm text-gray-400 px-4">{t('turnOnCameraDesc')}</p>
								</div>

								{/* Batch Mode Toggle */}
								<div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600/50">
									<input
										type="checkbox"
										id="batchMode"
										checked={isBatchMode}
										onChange={(e) => setIsBatchMode(e.target.checked)}
										className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-800"
									/>
									<label htmlFor="batchMode" className="text-sm text-gray-300 cursor-pointer">
										{t('batchMode')}
									</label>
								</div>

								<button
									onClick={() => {
										setCameraStartRequested(true);
										startCamera();
									}}
									className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
								>
									<Camera className="w-5 h-5 sm:w-6 sm:h-6" />
									{t('turnOnCameraButton')}
								</button>
							</div>

							{/* Manual Input Alternative */}
							<div className="border-t border-gray-700/50 pt-4 sm:pt-6">
								<p className="text-gray-300 text-xs sm:text-sm mb-3">{t('manual')}</p>
								<div className="space-y-2">
									<input
										type="text"
										value={manualInput}
										onChange={(e) => setManualInput(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="Enter barcode..."
										className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
										disabled={isLoading}
										autoComplete="off"
										autoFocus
									/>
									<button
										onClick={() => handleBarcodeSubmit(manualInput)}
										disabled={isLoading || !manualInput.trim()}
										className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-lg disabled:opacity-60"
									>
										{isLoading ? <><Loader className="w-4 h-4 inline mr-2 animate-spin" />{t('searching')}</> : t('search')}
									</button>
								</div>
							</div>
						</>
					) : isCameraActive ? (
						<>
							{/* Active Camera View */}
							<div className="space-y-3 sm:space-y-4">
								<div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl bg-black" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
									{!cameraReady && (
										<div className="absolute inset-0 flex items-center justify-center bg-black z-20">
											<div className="flex flex-col items-center">
												<div className="animate-spin mb-4"><Camera className="w-8 h-8 text-purple-400" /></div>
												<p className="text-sm text-gray-400">{t('scanning')}</p>
											</div>
										</div>
									)}

									<video
										ref={videoRef}
										playsInline
										muted
										className="absolute inset-0 w-full h-full object-cover"
									/>
									<canvas
										ref={canvasRef}
										className="hidden"
									/>

									{cameraReady && (
										<>
											{/* Viewfinder Overlay */}
											<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
												<div className="w-4/5 h-1/3 border-2 border-purple-400 rounded-lg shadow-lg shadow-purple-500/50 animate-pulse" />
											</div>
											<div className="absolute top-4 left-4 right-4 text-center">
												<div className="inline-block px-4 py-2 bg-black/60 rounded-lg backdrop-blur-sm border border-purple-500/30">
													<p className="text-sm font-medium text-purple-300">{t('position')}</p>
												</div>
											</div>
										</>
									)}
								</div>

								{/* Batch List UI */}
								{isBatchMode && scannedBarcodes.length > 0 && (
									<div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-3">
										<div className="flex items-center justify-between">
											<p className="text-sm text-green-300 font-semibold">{t('scanned')} {scannedBarcodes.length}</p>
											<button onClick={() => setScannedBarcodes([])} className="text-xs text-red-400">{t('clearAll')}</button>
										</div>
										<div className="max-h-32 overflow-y-auto space-y-1">
											{scannedBarcodes.map((code, idx) => (
												<div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg">
													<p className="text-xs text-gray-300 font-mono">{code}</p>
													<button onClick={() => setScannedBarcodes(prev => prev.filter((_, i) => i !== idx))}><X className="w-3 h-3 text-red-400" /></button>
												</div>
											))}
										</div>
										<button onClick={handleFinishBatch} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold">
											{isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <>{t('finishBatch')} ({scannedBarcodes.length})</>}
										</button>
									</div>
								)}

								{/* Manual Input (Small Version) */}
								<div>
									<div className="border-t border-gray-700/50 pt-4">
										<input
											type="text"
											value={manualInput}
											onChange={(e) => setManualInput(e.target.value)}
											onKeyDown={handleKeyDown}
											placeholder={t('manualPlaceholder')}
											className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
											disabled={isLoading}
										/>
									</div>
									{/* Small button to validate manual input on mobile */}
									<div className="mt-2 text-right">
										<button
											onClick={() => handleBarcodeSubmit(manualInput)}
											disabled={isLoading || !manualInput.trim()}
											className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-lg disabled:opacity-60"
										>
											{isLoading ? <Loader className="w-4 h-4 inline mr-2 animate-spin" /> : t('search')}
										</button>
									</div>
								</div>
							</div>
						</>
					) : (
						/* Error or Loading State */
						<div className="flex flex-col items-center justify-center py-12">
							{cameraError ? (
								<div className="text-center space-y-4">
									<p className="text-red-300">{cameraError}</p>
									<button onClick={startCamera} className="px-6 py-2 bg-purple-600 rounded-lg text-white">Try Again</button>
								</div>
							) : (
								<>
									<div className="mb-4 p-3 rounded-full bg-purple-500/20 animate-pulse"><Camera className="w-8 h-8 text-purple-400" /></div>
									<p className="text-gray-300 font-semibold">Initializing camera...</p>
								</>
							)}
						</div>
					)}
				</div>

				{/* --- Footer --- */}
				<div className="sticky bottom-0 flex gap-3 p-6 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
					<button onClick={handleClose} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 text-white font-semibold">
						{t('cancel')}
					</button>
					{!isCameraActive && (
						<button
							onClick={() => handleBarcodeSubmit(manualInput)}
							disabled={isLoading || !manualInput.trim()}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold"
						>
							{isLoading ? <Loader className="w-5 h-5 animate-spin" /> : t('search')}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}