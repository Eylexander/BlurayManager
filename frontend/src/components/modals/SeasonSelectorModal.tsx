'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Check, Search, Loader, Calendar, Film, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { TMDBDetails } from '@/types/tmdb';
import { Season } from '@/types/bluray';
import { extractYear } from '@/lib/tmdb-utils';
import toast from 'react-hot-toast';

interface SeasonSelectorModalProps {
  onClose: () => void;
  onSave: (seasons: Season[]) => void;
  currentSeasons: Season[];
  tmdbId?: string;
  title: string;
  detectedSeason?: number | null; // For barcode scanning - auto-detected season
}

export default function SeasonSelectorModal({
  onClose,
  onSave,
  currentSeasons,
  tmdbId,
  title,
  detectedSeason,
}: SeasonSelectorModalProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState<Season[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(
    new Set(currentSeasons.map(s => s.number))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTmdbId, setSearchedTmdbId] = useState(tmdbId || '');

  const fetchSeasonsFromTMDB = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const details: TMDBDetails = await apiClient.getTMDBDetails('series', parseInt(id));
      
      if (details.seasons) {
        const seasons: Season[] = details.seasons
          .filter(s => s.season_number > 0)
          .map(s => ({
            number: s.season_number,
            episode_count: s.episode_count,
            year: extractYear(s.air_date),
          }));
        
        setAvailableSeasons(seasons);
        setSearchedTmdbId(id);
      } else {
        toast.error(t('bluray.noSeasonsFound'));
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
      toast.error(t('bluray.failedToFetchSeasons'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (tmdbId) {
      fetchSeasonsFromTMDB(tmdbId);
    }
  }, [tmdbId, fetchSeasonsFromTMDB]);

  // Pre-select detected season from barcode scan
  useEffect(() => {
    if (detectedSeason && availableSeasons.length > 0) {
      setSelectedSeasons(new Set([detectedSeason]));
    }
  }, [detectedSeason, availableSeasons]);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !tmdbId) {
      return toast.error(t('bluray.enterTitleOrTmdbId'));
    }

    setLoading(true);
    try {
      let idToUse = searchQuery.trim();

      // If it's not a number, search TMDB
      if (isNaN(Number(idToUse))) {
        const response = await apiClient.searchTMDB('series', searchQuery);
        if (!response.results?.length) {
          return toast.error(t('add.noResultsFound'));
        }
        idToUse = response.results[0].id.toString();
      }

      await fetchSeasonsFromTMDB(idToUse);
    } catch (error) {
      console.error('Failed to search:', error);
      toast.error(t('bluray.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    const newSelected = new Set(selectedSeasons);
    if (newSelected.has(seasonNumber)) {
      newSelected.delete(seasonNumber);
    } else {
      newSelected.add(seasonNumber);
    }
    setSelectedSeasons(newSelected);
  };

  const selectAll = () => {
    setSelectedSeasons(new Set(availableSeasons.map(s => s.number)));
  };

  const deselectAll = () => {
    setSelectedSeasons(new Set());
  };

  const handleSave = () => {
    const seasonsToSave = availableSeasons.filter(s => selectedSeasons.has(s.number));
    onSave(seasonsToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-purple-900/20 dark:to-gray-800/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Film className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              {t('bluray.selectSeasons')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</p>
            {detectedSeason && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium">
                <Film className="w-3.5 h-3.5" />
                {t('barcode.seasonDetected', { season: detectedSeason })}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        {!tmdbId && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('bluray.searchByTitleOrTmdbId')}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    {t('common.search')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading && !availableSeasons.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader className="w-12 h-12 animate-spin mb-4 text-purple-400" />
              <p>{t('common.loading')}</p>
            </div>
          ) : availableSeasons.length > 0 ? (
            <>
              {/* Bulk Actions */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                <div className="text-sm text-gray-400">
                  {selectedSeasons.size} of {availableSeasons.length} {t('bluray.seasonsSelected')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    {t('common.selectAll')}
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    {t('common.deselectAll')}
                  </button>
                </div>
              </div>

              {/* Season Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableSeasons.map((season) => {
                  const isSelected = selectedSeasons.has(season.number);
                  const isDetected = season.number === detectedSeason;
                  return (
                    <button
                      key={season.number}
                      onClick={() => toggleSeason(season.number)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all text-left
                        ${isSelected
                          ? isDetected
                            ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/50'
                            : 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                        }
                      `}
                    >
                      {/* Checkmark */}
                      <div className={`
                        absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-600 bg-gray-900'
                        }
                      `}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>

                      {/* Season Info */}
                      <div className="pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-bold text-white">
                            {t('details.season')} {season.number}
                          </div>
                          {isDetected && (
                            <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-xs font-medium">
                              {t('barcode.detected')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Film className="w-4 h-4" />
                          {season.episode_count} {t('details.episodes')}
                        </div>
                        {season.year && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {season.year}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Info className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-600" />
              <p className="text-center">
                {tmdbId
                  ? t('bluray.noSeasonsAvailable')
                  : t('bluray.searchForSeasons')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={selectedSeasons.size === 0}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {t('common.save')} ({selectedSeasons.size})
          </button>
        </div>
      </div>
    </div>
  );
}
