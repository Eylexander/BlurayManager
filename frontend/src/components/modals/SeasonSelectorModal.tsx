'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Search, Loader, Film, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { TMDBDetails } from '@/types/tmdb';
import { Season } from '@/types/bluray';
import { extractYear } from '@/lib/tmdb-utils';
import toast from 'react-hot-toast';
import { Button, Modal, SearchInput } from '@/components/common';
import SeasonGrid from '@/components/bluray/SeasonGrid';

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
  // Start from the stored seasons so they stay visible (and saveable) even
  // when there is no TMDB id to fetch the full list from.
  // Snapshot of the stored seasons: callers pass fresh arrays on every
  // render, which must not retrigger the TMDB fetch below.
  const [storedSeasons] = useState(currentSeasons);
  const [availableSeasons, setAvailableSeasons] = useState<Season[]>(() =>
    [...storedSeasons].sort((a, b) => a.number - b.number),
  );
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(
    new Set(currentSeasons.map(s => s.number))
  );
  const [searchQuery, setSearchQuery] = useState('');

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
        
        // Keep stored seasons TMDB doesn't list (e.g. specials) instead of dropping them
        setAvailableSeasons([
          ...seasons,
          ...storedSeasons.filter((c) => !seasons.some((s) => s.number === c.number)),
        ].sort((a, b) => a.number - b.number));
        // Pre-select the season detected by a barcode scan
        if (detectedSeason && seasons.some(s => s.number === detectedSeason)) {
          setSelectedSeasons(new Set([detectedSeason]));
        }
      } else {
        toast.error(t('bluray.noSeasonsFound'));
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
      toast.error(t('bluray.failedToFetchSeasons'));
    } finally {
      setLoading(false);
    }
  }, [t, detectedSeason, storedSeasons]);

  useEffect(() => {
    if (tmdbId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from TMDB is a genuine external sync
      fetchSeasonsFromTMDB(tmdbId);
    }
  }, [tmdbId, fetchSeasonsFromTMDB]);

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
          return toast.error(t('add.noResults'));
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
    <Modal
      size="xl"
      onClose={onClose}
      icon={<Film />}
      title={t('bluray.selectSeasons')}
      description={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={selectedSeasons.size === 0} icon={<Check />}>
            {t('common.save')} ({selectedSeasons.size})
          </Button>
        </>
      }
    >
      {detectedSeason && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
          <Film className="w-3.5 h-3.5" />
          {t('barcode.seasonDetected', { season: detectedSeason })}
        </div>
      )}

      {!tmdbId && (
        <form
          className="flex gap-2 mb-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('bluray.searchByTitleOrTmdbId')}
          />
          <Button type="submit" inline loading={loading} icon={<Search />}>
            {t('common.search')}
          </Button>
        </form>
      )}

      {loading && !availableSeasons.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader className="w-8 h-8 animate-spin mb-3 text-primary" />
          {t('common.loading')}
        </div>
      ) : availableSeasons.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm text-muted-foreground">
              {selectedSeasons.size} / {availableSeasons.length} {t('bluray.seasonsSelected')}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" inline onClick={selectAll}>
                {t('common.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" inline onClick={deselectAll}>
                {t('common.deselectAll')}
              </Button>
            </div>
          </div>
          <SeasonGrid
            seasons={availableSeasons}
            isSelected={(n) => selectedSeasons.has(n)}
            onToggle={toggleSeason}
            detectedSeason={detectedSeason}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Info className="w-10 h-10 mb-3 opacity-40" />
          {tmdbId ? t('bluray.noSeasonsAvailable') : t('bluray.searchForSeasons')}
        </div>
      )}
    </Modal>
  );
}
