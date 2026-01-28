'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import {
  BarChart3, Euro, Star, Film, Tv,
  Package, Clock, HardDrive, ArrowUpRight, Award, History
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Statistics } from '@/types/statistics';
import StatsCard from '@/components/common/StatsCard';
import { LoaderCircle } from '@/components/common/LoaderCircle';

// Modern Chart Colors
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const ChartContainer = ({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) => (
  <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    <div className="h-[300px] w-full outline-none">
      {children}
    </div>
  </div>
);

export default function StatisticsPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useRouteProtection(pathname);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getStatistics();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Check on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prepare data for charts
  const genreData = useMemo(() => {
    if (!stats?.genre_distribution) return [];
    return Object.entries(stats.genre_distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 genres
  }, [stats]);

  const typeData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t('statistics.totalMovies'), value: stats.total_movies || 0 },
      { name: t('statistics.totalSeasons'), value: stats.total_seasons || 0 },
    ];
  }, [stats, t]);

  if (loading) return <LoaderCircle />;

  if (!stats) return <div className="p-8 text-center">Failed to load statistics</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 p-2">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-5 sm:space-x-3 mb-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t('statistics.title')}</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {t('statistics.subtitle')}
          </p>
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('statistics.totalBlurays')}
          value={stats.total_blurays || 0}
          icon={<Package className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="blue"
        />
        <StatsCard
          title={t('statistics.totalMovies')}
          value={stats.total_movies || 0}
          icon={<Film className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="purple"
        />
        <StatsCard
          title={t('statistics.totalSeasons')}
          value={stats.total_seasons || 0}
          icon={<Tv className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="pink"
        />
        <StatsCard
          title={t('statistics.averageRating')}
          value={(stats.average_rating || 0).toFixed(1)}
          icon={<Star className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="yellow"
        />
      </div>

      {/* Primary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer title={t('statistics.genreDistribution')} subtitle={t('statistics.top8Genres')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData} layout="vertical" margin={{ left: 40 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                {!isMobile && (
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                )}
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  activeBar={isMobile ? false : undefined}
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <ChartContainer title={t('statistics.contentTypeSplit')} subtitle={t('statistics.moviesVsTvShows')}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={typeData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                activeShape={isMobile ? false : undefined}
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              {!isMobile && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-[-40px]">
            {typeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs font-medium text-gray-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      {/* Technical & Storage Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Euro className="w-8 h-8 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t('statistics.estimatedValue')}</span>
          </div>
          <p className="text-4xl font-bold">€{(stats.total_blurays * 4).toFixed(2)}</p>
          <p className="mt-2 text-green-100 text-sm flex items-center">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            {t('statistics.estimatedValueSubtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="text-indigo-500 w-6 h-6" />
            <h4 className="font-semibold">{t('statistics.dataStorage')}</h4>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">{(stats.physical_storage_gb || 0).toLocaleString()} GB</p>
            <p className="text-sm text-gray-500">{t('statistics.digitalFootprint', { value: ((stats.physical_storage_gb || 0) / 1024).toFixed(2) })}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-purple-500 w-6 h-6" />
            <h4 className="font-semibold">{t('statistics.totalRuntime')}</h4>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">
              {Math.floor((stats.total_runtime_minutes || 0) / 60)}<span className="text-lg">h</span> {(stats.total_runtime_minutes || 0) % 60}<span className="text-lg">m</span>
            </p>
            <p className="text-sm text-gray-500">{t('statistics.nonstopPlayback', { value: ((stats.total_runtime_minutes || 0) / 1440).toFixed(1) })}</p>
          </div>
        </div>
      </div>

      {/* History & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2 mb-6 text-amber-600 uppercase text-xs font-bold tracking-widest">
            <History className="w-4 h-4" /> {t('statistics.timelineMilestones')}
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{t('statistics.oldest')}</p>
                <p className="font-bold">{stats.oldest_bluray?.title}</p>
              </div>
              <span className="text-2xl font-black">{stats.oldest_bluray?.release_year}</span>
            </div>
            <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{t('statistics.newest')}</p>
                <p className="font-bold">{stats.newest_bluray?.title}</p>
              </div>
              <span className="text-2xl font-black">{stats.newest_bluray?.release_year}</span>
            </div>
          </div>
        </div>

        {/* Top Rated List */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2 mb-6 text-blue-600 uppercase text-xs font-bold tracking-widest">
            <Award className="w-4 h-4" /> {t('statistics.topRated')}
          </div>
          <div className="space-y-4">
            {stats.top_rated?.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{index + 1}</span>
                  <p className="font-medium group-hover:text-primary-600 transition-colors line-clamp-1">{item.title}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">{item.rating?.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}