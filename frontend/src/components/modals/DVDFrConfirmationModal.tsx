'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ScanBarcode, Calendar, ArrowRight } from 'lucide-react';
import { Button, Modal } from '@/components/common';

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

/** Shows the DVDFr match for a scanned barcode and asks before continuing. */
export default function DVDFrConfirmationModal({ isOpen, item, onConfirm, onCancel }: DVDFrConfirmationModalProps) {
	const t = useTranslations();

	if (!isOpen || !item) return null;

	const details: [string, string | undefined][] = [
		[
			item.directors && item.directors.length > 1 ? t('barcode.directors') : t('details.director'),
			item.directors?.join(', '),
		],
		[t('barcode.publisher'), item.publisher],
		[t('barcode.edition'), item.edition],
	];

	return (
		<Modal
			onClose={onCancel}
			icon={<ScanBarcode />}
			tone="success"
			title={t('barcode.found')}
			description={t('barcode.confirmMessage')}
			footer={
				<>
					<Button variant="secondary" onClick={onCancel}>
						{t('common.cancel')}
					</Button>
					<Button onClick={onConfirm} autoFocus icon={<ArrowRight />}>
						{t('common.continue')}
					</Button>
				</>
			}
		>
			<div className="flex gap-4">
				{item.cover && (
					<div className="relative w-24 sm:w-28 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted shadow-md">
						<Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
					</div>
				)}
				<div className="min-w-0 space-y-2">
					<h3 className="text-lg font-semibold leading-snug text-foreground">{item.title}</h3>
					<div className="flex flex-wrap gap-1.5 text-xs">
						{item.year && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
								<Calendar className="w-3 h-3" />
								{item.year}
							</span>
						)}
						{item.media && (
							<span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{item.media}</span>
						)}
					</div>
					<dl className="space-y-1 text-sm">
						{details
							.filter(([, value]) => value)
							.map(([label, value]) => (
								<div key={label} className="flex gap-1.5">
									<dt className="text-muted-foreground">{label}:</dt>
									<dd className="text-foreground/90">{value}</dd>
								</div>
							))}
					</dl>
				</div>
			</div>
		</Modal>
	);
}
