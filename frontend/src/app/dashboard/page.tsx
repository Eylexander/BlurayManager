'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Bluray } from '@/types/bluray';
import { Statistics } from '@/types/statistics';
import BlurayCard from '@/components/bluray/BlurayCard';
import BlurayListItem from '@/components/bluray/BlurayListItem';
import StatsCard from '@/components/common/StatsCard';
import { Film, Tv, X, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import SortDropdown from '@/components/common/SortDropdown';
import { LoaderCircle } from '@/components/common/LoaderCircle';

type SortOption = 'recent' | 'name' | 'release_date';
type ViewMode = 'grid' | 'list';

export default function DashboardPage() {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useAuthStore();
	const searchParams = useSearchParams();
	const searchQuery = searchParams.get('search') || '';
	const [recentBlurays, setRecentBlurays] = useState<Bluray[]>([]);
	const [stats, setStats] = useState<Statistics | null>(null);
	const [loading, setLoading] = useState(true);
	const [sortBy, setSortBy] = useState<SortOption>('recent');
	const [viewMode, setViewMode] = useState<ViewMode>('grid');

	// Use route protection
	useRouteProtection(pathname);

	// Centralized data fetching function to eliminate duplication
	const fetchData = useCallback(async () => {
		try {
			const [bluraysData, statsData] = await Promise.all([
				apiClient.getBlurays({ limit: searchQuery ? 100 : 12 }),
				apiClient.getStatistics(),
			]);

			// Filter blurays by search query if present
			let filteredBlurays = bluraysData;
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				filteredBlurays = bluraysData.filter((bluray: Bluray) =>
					bluray.title.toLowerCase().includes(query) ||
					bluray.director?.toLowerCase().includes(query) ||
					bluray.genre?.some((g: string) => g.toLowerCase().includes(query))
				);
			}

			setRecentBlurays(filteredBlurays);
			setStats(statsData);
		} catch (error) {
			console.error('Failed to fetch dashboard data:', error);
		} finally {
			setLoading(false);
		}
	}, [searchQuery]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleUpdate = () => {
		// Refetch data when an item is updated or deleted
		setLoading(true);
		fetchData();
	};

	// Sort blurays based on selected option
	const sortedBlurays = [...recentBlurays].sort((a, b) => {
		switch (sortBy) {
			case 'name':
				return a.title.localeCompare(b.title);
			case 'release_date':
				const yearA = a.release_year || 0;
				const yearB = b.release_year || 0;
				return yearB - yearA;
			case 'recent':
			default:
				return 0; // Keep original order (most recent first)
		}
	});

	// Get title based on sort option
	const getSectionTitle = () => {
		if (searchQuery) return t('common.searchResults');
		switch (sortBy) {
			case 'name':
				return t('filter.name');
			case 'release_date':
				return t('filter.releaseDate');
			case 'recent':
			default:
				return t('filter.recentlyAdded');
		}
	};

	if (loading) {
		return (
			<LoaderCircle />
		);
	}

	return (
		<div className="w-full overflow-x-hidden space-y-4 sm:space-y-6 md:space-y-8">
			{/* Welcome Section - Hidden on mobile */}
			<div className="hidden md:block jellyfin-gradient rounded-lg p-6 sm:p-8 text-white">
				<h1 className="text-4xl font-bold mb-2">
					{t('welcome.greeting', { username: user?.username || 'Guest' })} 👋
				</h1>
				<p className="text-lg opacity-90">
					{t('welcome.subtitle', { count: stats?.total_blurays || 0 })}
				</p>
			</div>

			{/* Quick Stats */}
			{stats && (
				<div className="grid grid-cols-2 gap-4 sm:gap-4 md:gap-6 lg:gap-4 !mt-0 sm:!mt-2 md:!mt-6">
					<StatsCard
						title={t('statistics.totalMovies')}
						value={stats.total_movies || 0}
						icon={<Film className="w-6 h-6 sm:w-8 sm:h-8" />}
						color="blue"
					/>
					<StatsCard
						title={t('statistics.totalSeries')}
						value={stats.total_series || 0}
						icon={<Tv className="w-6 h-6 sm:w-8 sm:h-8" />}
						color="purple"
					/>
				</div>
			)}

			{/* Recent Blurays */}
			<div className="w-full">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
					<div className="flex-1 min-w-0">
						<h2 className="text-2xl sm:text-3xl font-bold truncate">
							{getSectionTitle()}
						</h2>
						{searchQuery && (
							<p className="text-xs sm:text-sm text-gray-500 mt-1">
								{t('welcome.resultsFound', { count: recentBlurays.length, query: searchQuery })}
							</p>
						)}
					</div>
					<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
						{/* View Mode Toggle */}
						<div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-0.5 sm:p-1 border border-gray-300 dark:border-dark-700">
							<button
								onClick={() => setViewMode('grid')}
								className={`p-1.5 sm:p-2 rounded transition-colors ${viewMode === 'grid'
									? 'bg-primary-600 text-white'
									: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
									}`}
								title="Grid view"
							>
								<LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={`p-1.5 sm:p-2 rounded transition-colors ${viewMode === 'list'
									? 'bg-primary-600 text-white'
									: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
									}`}
								title="List view"
							>
								<List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							</button>
						</div>

						{/* Sort Dropdown */}
						<div className="flex items-center justify-between gap-4">
							<SortDropdown
								sortBy={sortBy}
								setSortBy={setSortBy}
							/>
						</div>
						{searchQuery && (
							<button
								onClick={() => window.history.pushState({}, '', '/dashboard')}
								className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
							>
								<X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
								<span className="hidden md:inline">Clear search</span>
							</button>
						)}
					</div>
				</div>
				{recentBlurays.length === 0 ? (
					<div className="text-center py-8 sm:py-12 md:py-16">
						<p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('common.noResults')}</p>
					</div>
				) : (
					<>
						{viewMode === 'grid' ? (
							<div className="w-full grid grid-cols-1 vsm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols- auto-rows-max gap-4 sm:p-4 md:p-2">
								{sortedBlurays.map((bluray) => (
									<BlurayCard key={bluray.id} bluray={bluray} onUpdate={handleUpdate} />
								))}
							</div>
						) : (
							<div className="space-y-2 sm:space-y-3">
								{sortedBlurays.map((bluray) => (
									<BlurayListItem key={bluray.id} bluray={bluray} onUpdate={handleUpdate} />
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
