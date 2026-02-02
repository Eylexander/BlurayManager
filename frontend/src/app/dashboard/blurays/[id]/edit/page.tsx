'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { 
    Film, Tv, Calendar, Tag as TagIcon, Check, 
    Loader, ArrowLeft, Save, Plus, X, Edit, 
    Download, Image as ImageIcon, Info, DollarSign 
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddTagModal from '@/components/modals/AddTagModal';
import { I18nText, I18nTextArray } from '@/types/bluray';
import { Button } from '@/components/common';
import { buildPosterUrl, buildBackdropUrl, extractYear } from '@/lib/tmdb-utils';
import { TMDBDetails } from '@/types/tmdb';
import { normalizePurchaseDateForInput } from '@/lib/bluray-utils';
import { LoaderCircle } from '@/components/common/LoaderCircle';
import useRouteProtection from '@/hooks/useRouteProtection';

interface Season {
	number: number;
	episode_count: number;
	year?: number;
	description?: I18nText | string;
}

// Reusable sub-component for form consistency
const FormField = ({ label, children, className = "" }: { label: string, children: React.ReactNode, className?: string }) => (
    <div className={className}>
        <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
            {label}
        </label>
        {children}
    </div>
);

const INPUT_CLASSES = "w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-inner text-sm sm:text-base";

export default function EditBlurayPage() {
	const router = useRouter();
	const params = useParams();
	const pathname = usePathname();
	const t = useTranslations();
	
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showTagModal, setShowTagModal] = useState(false);
	const [fetching, setFetching] = useState(false);

	// Grouped Form State
	const [formData, setFormData] = useState({
		title: '',
		type: 'movie' as 'movie' | 'series',
		releaseYear: '' as number | '',
		director: '',
		runtime: '' as number | '',
		descriptionEn: '',
		descriptionFr: '',
		coverImageUrl: '',
		backdropUrl: '',
		purchasePrice: '' as number | '',
		purchaseDate: '',
		location: '',
		rating: '' as number | '',
		tmdbId: ''
	});

	const [genre, setGenre] = useState<I18nTextArray>();
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [seasons, setSeasons] = useState<Season[]>([]);

	useRouteProtection(pathname);

    // Dynamic change handler
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

	useEffect(() => {
		const fetchData = async () => {
			try {
				const data = await apiClient.getBluray(params.id as string);
				setFormData({
					title: data.title,
					type: data.type,
					releaseYear: data.release_year || '',
					director: data.director || '',
					runtime: data.runtime || '',
					descriptionEn: typeof data.description === 'object' ? data.description?.['en-US'] || '' : data.description || '',
					descriptionFr: typeof data.description === 'object' ? data.description?.['fr-FR'] || '' : '',
					coverImageUrl: data.cover_image_url || '',
					backdropUrl: data.backdrop_url || '',
					purchasePrice: data.purchase_price || '',
					purchaseDate: normalizePurchaseDateForInput(data.purchase_date),
					location: data.location || '',
					rating: data.rating || '',
					tmdbId: data.tmdb_id || ''
				});
				setGenre(data.genre || []);
				setSelectedTags(data.tags || []);
				setSeasons(data.seasons || []);
			} catch (error) {
				toast.error('Failed to load item details');
				router.push('/dashboard');
			} finally {
				setLoading(false);
			}
		};
		if (params.id) fetchData();
	}, [params.id, router]);

    const fetchOnlineData = async () => {
		if (!formData.tmdbId && !formData.title.trim()) {
			return toast.error('Please enter a title first');
		}

		setFetching(true);
		try {
			let idToUse = formData.tmdbId;

			if (!idToUse) {
				const query = formData.releaseYear ? `${formData.title} ${formData.releaseYear}` : formData.title;
				const response = await apiClient.searchTMDB(formData.type, query);
				if (!response.results?.length) return toast.error('No results found on TMDB');
				idToUse = response.results[0].id.toString();
			}

			const details: TMDBDetails = await apiClient.getTMDBDetails(formData.type, parseInt(idToUse));

			setFormData(prev => ({
                ...prev,
                title: details.title || details.name || prev.title,
                descriptionEn: details.overview || '',
                descriptionFr: details.fr?.overview || '',
                releaseYear: extractYear(formData.type === 'movie' ? details.release_date : details.first_air_date) || '',
                runtime: details.runtime || 0,
                coverImageUrl: buildPosterUrl(details.poster_path),
                backdropUrl: buildBackdropUrl(details.backdrop_path),
                rating: details.vote_average || 0,
            }));

			if (formData.type === 'series') {
				setSeasons(details.seasons?.filter(s => s.season_number > 0).map(s => ({
					number: s.season_number,
					episode_count: s.episode_count,
					year: extractYear(s.air_date),
				})) || []);
			}

			setGenre({
				"en-US": details.genres?.map(g => g.name) || [],
				"fr-FR": details.fr?.genres?.map(g => g.name) || []
			});

			toast.success('Metadata updated!');
		} catch (error) {
			toast.error('Failed to fetch online data');
		} finally {
			setFetching(false);
		}
	};

    const updateSeason = (index: number, field: keyof Season, value: any) => {
		const updated = [...seasons];
		updated[index] = { ...updated[index], [field]: value };
		setSeasons(updated);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title.trim()) return toast.error('Title is required');

		setSaving(true);
		try {
			const payload: any = {
				...formData,
				title: formData.title.trim(),
				description: { "en-US": formData.descriptionEn.trim(), "fr-FR": formData.descriptionFr.trim() },
				genre,
				purchase_price: Number(formData.purchasePrice) || 0,
				purchase_date: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
				tags: selectedTags,
				rating: Number(formData.rating) || 0,
                seasons: formData.type === 'series' ? seasons : undefined,
                release_year: formData.type === 'movie' ? Number(formData.releaseYear) : undefined,
                director: formData.director.trim(),
                runtime: formData.type === 'movie' ? Number(formData.runtime) : undefined,
			};

			await apiClient.updateBluray(params.id as string, payload);
			toast.success(t('bluray.updateSuccess'));
			router.push(`/dashboard/blurays/${params.id}`);
		} catch (error: any) {
			toast.error(error?.message || t('bluray.updateError'));
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <LoaderCircle />;

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
			{showTagModal && (
				<AddTagModal
					initialSelectedTags={selectedTags}
					onClose={() => setShowTagModal(false)}
					onSave={(tags) => setSelectedTags(tags)}
					blurayTitle={formData.title}
				/>
			)}

			<div className="py-6 sm:py-8">
				<button onClick={() => router.back()} className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
					<div className="p-2 rounded-full group-hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
					<span className="font-medium text-sm sm:text-base">{t('common.back')}</span>
				</button>
			</div>

			<div className="relative mb-6 sm:mb-10 overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 border border-white/5 p-6 sm:p-8">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
				<div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex items-center gap-4 sm:gap-6">
						<div className={`p-4 sm:p-5 rounded-2xl ${formData.type === 'movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
							{formData.type === 'movie' ? <Film className="w-8 h-8 sm:w-10 sm:h-10" /> : <Tv className="w-8 h-8 sm:w-10 sm:h-10" />}
						</div>
						<div>
							<h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">{t('bluray.editBluray')}</h1>
							<p className="text-slate-400 text-sm sm:text-base font-medium mt-1">
                                <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10">{t(`common.${formData.type}`)}</span>
                                • {formData.title}
                            </p>
						</div>
					</div>
					<Button variant="purple" onClick={fetchOnlineData} disabled={fetching} loading={fetching} className="w-full md:w-auto" icon={<Download className="w-5 h-5" />}>
						{t('bluray.fetchOnlineData')}
					</Button>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <section className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-6 text-slate-300 font-semibold">
                                <Info className="w-5 h-5 text-blue-400" />
                                <h2>General Information</h2>
                            </div>
                            <div className="space-y-5">
                                <FormField label="Title">
                                    <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} className={INPUT_CLASSES} />
                                </FormField>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Release Year">
                                        <input type="number" value={formData.releaseYear} onChange={(e) => handleChange('releaseYear', e.target.value ? parseInt(e.target.value) : '')} className={INPUT_CLASSES} />
                                    </FormField>
                                    <FormField label="Rating">
                                        <input type="number" step="0.1" value={formData.rating} onChange={(e) => handleChange('rating', e.target.value ? parseFloat(e.target.value) : '')} className={INPUT_CLASSES} />
                                    </FormField>
                                </div>
                            </div>
                        </section>

                        {formData.type === 'series' && (
                            <section className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                                <div className="flex items-center gap-2 mb-6 text-slate-300 font-semibold">
                                    <Plus className="w-5 h-5 text-purple-400" />
                                    <h2>{t('bluray.seasons')}</h2>
                                </div>
                                <div className="space-y-4">
                                    {seasons.map((season, index) => (
                                        <div key={index} className="group flex items-center gap-4 p-4 bg-slate-950/40 rounded-xl border border-white/5">
                                            <div className="grid grid-cols-3 gap-2 flex-1">
                                                <input type="number" value={season.number} onChange={(e) => updateSeason(index, 'number', parseInt(e.target.value) || 0)} placeholder="S#" className="bg-transparent text-white font-bold outline-none" />
                                                <input type="number" value={season.episode_count} onChange={(e) => updateSeason(index, 'episode_count', parseInt(e.target.value) || 0)} placeholder="Eps" className="bg-transparent text-slate-400 outline-none" />
                                                <input type="number" value={season.year || ''} onChange={(e) => updateSeason(index, 'year', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Year" className="bg-transparent text-slate-400 outline-none" />
                                            </div>
                                            <button type="button" onClick={() => setSeasons(seasons.filter((_, i) => i !== index))} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setSeasons([...seasons, { number: seasons.length + 1, episode_count: 0 }])} className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm">
                                        <Plus className="w-4 h-4" /> {t('bluray.addSeason')}
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                        <section className="p-6 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                             <div className="flex items-center gap-2 mb-6 text-slate-300 font-semibold">
                                <ImageIcon className="w-5 h-5 text-emerald-400" />
                                <h2>Media Assets</h2>
                            </div>
                            <div className="space-y-4">
                                <FormField label="Poster URL">
                                    <input type="url" value={formData.coverImageUrl} onChange={(e) => handleChange('coverImageUrl', e.target.value)} className={INPUT_CLASSES} />
                                </FormField>
                                <FormField label="Backdrop URL">
                                    <input type="url" value={formData.backdropUrl} onChange={(e) => handleChange('backdropUrl', e.target.value)} className={INPUT_CLASSES} />
                                </FormField>
                            </div>
                        </section>

                        <section className="p-6 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-6 text-slate-300 font-semibold">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                <h2>Acquisition</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                                <FormField label="Price (€)">
                                    <input type="number" step="0.01" value={formData.purchasePrice} onChange={(e) => handleChange('purchasePrice', e.target.value ? parseFloat(e.target.value) : '')} className={INPUT_CLASSES} />
                                </FormField>
                                <FormField label="Date">
                                    <input type="date" value={formData.purchaseDate} onChange={(e) => handleChange('purchaseDate', e.target.value)} className={`${INPUT_CLASSES} [color-scheme:dark]`} />
                                </FormField>
                            </div>
                        </section>

                        <section className="p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 shadow-xl">
                            <label className="flex items-center gap-2 text-slate-300 font-semibold mb-4">
                                <TagIcon className="w-5 h-5 text-blue-400" /> {t('bluray.tags')}
                            </label>
                            <button type="button" onClick={() => setShowTagModal(true)} className="group w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2 text-blue-400 font-bold group-hover:scale-105 transition-transform">
                                    <Edit className="w-4 h-4" /> <span>{t('bluray.editTags')}</span>
                                </div>
                                {selectedTags.length > 0 && <span className="text-[10px] text-slate-400 uppercase">{selectedTags.length} tags</span>}
                            </button>
                        </section>
                    </div>
                </div>

				{/* Responsive Floating Action Footer */}
				<div className="fixed bottom-4 left-4 right-4 sm:sticky sm:bottom-8 z-50 flex gap-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-2xl mx-auto">
					<Button type="submit" variant="success" disabled={saving} loading={saving} className="flex-1 py-3 sm:py-4 text-sm sm:text-lg font-bold" icon={<Save className="w-5 h-5 sm:w-6 sm:h-6" />}>
						{t('common.save')}
					</Button>
					<Button type="button" variant="secondary" onClick={() => router.back()} className="px-4 sm:px-8 bg-white/5 border-white/10 text-slate-300">
						{t('common.cancel')}
					</Button>
				</div>
			</form>
		</div>
	);
}