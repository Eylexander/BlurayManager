'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar } from 'lucide-react';

interface DVDFrItem {
	title: string;
	year?: string;
	media?: string;
	cover?: string;
	publisher?: string;
	directors?: string[];
	edition?: string;
	dvdfr_id?: string;
}

interface DVDFrConfirmationModalProps {
	isOpen: boolean;
	item: DVDFrItem | null;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function DVDFrConfirmationModal({
	isOpen,
	item,
	onConfirm,
	onCancel,
}: DVDFrConfirmationModalProps) {
	const t = useTranslations();
	const tBarcode = useTranslations('barcode');

	if (!item) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					onClick={onCancel}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Modal Header */}
						<div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
							<h3 className="text-xl font-bold text-white flex items-center gap-2">
								<Check className="w-5 h-5" />
								{tBarcode('found')}
							</h3>
						</div>

						{/* Modal Content */}
						<div className="p-6 space-y-4">
							{/* Cover Image */}
							{item.cover && (
								<div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
									<Image
										src={item.cover}
										alt={item.title}
										fill
										className="object-contain"
										unoptimized
									/>
								</div>
							)}

							{/* Title and Details */}
							<div className="space-y-2">
								<h4 className="text-xl font-bold text-gray-900 dark:text-white">
									{item.title}
								</h4>

								<div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
									{item.year && (
										<span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
											<Calendar className="w-3 h-3" />
											{item.year}
										</span>
									)}
									{item.media && (
										<span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
											{item.media}
										</span>
									)}
								</div>

								{item.directors && item.directors.length > 0 && (
									<p className="text-sm text-gray-600 dark:text-gray-400">
										<span className="font-semibold">
										{item.directors.length === 1 ? 'Director' : 'Directors'}:
									</span>{' '}
									{item.directors.join(', ')}
								</p>
							)}

							{item.publisher && (
								<p className="text-sm text-gray-600 dark:text-gray-400">
										<span className="font-semibold">Publisher:</span> {item.publisher}
									</p>
								)}

								{item.edition && (
									<p className="text-sm text-gray-600 dark:text-gray-400">
										<span className="font-semibold">Edition:</span> {item.edition}
									</p>
								)}
							</div>

							<div className="pt-2 border-t border-gray-200 dark:border-gray-800">
								<p className="text-xs text-center text-gray-500 dark:text-gray-500">
									{tBarcode('confirmMessage')}
								</p>
							</div>
						</div>

						{/* Modal Actions */}
						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={onCancel}
								className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-all"
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={onConfirm}
								className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all shadow-lg shadow-blue-500/25"
							>
								{t('common.continue')}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
