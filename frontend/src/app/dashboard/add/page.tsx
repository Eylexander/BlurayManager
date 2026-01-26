'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Film, Tv, Search, Calendar, Tag as TagIcon, Check, X, Loader, ChevronLeft, Plus, Edit, Camera } from 'lucide-react';
// import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import TagModal from '@/components/modals/TagModal';
import toast from 'react-hot-toast';
import { I18nText } from '@/types/bluray';
import { Button } from '@/components/common';
import {
  extractDirectorFromCredits,
  buildPosterUrl,
  buildBackdropUrl,
  cleanProductTitle,
  type TMDBDetails
} from '@/lib/tmdb-utils';
import BarcodeScannerModal from '@/components/modals/BarcodeScannerModal';

type MediaType = 'movie' | 'series';
type Step = 'initial' | 'search' | 'confirm';

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  vote_average?: number;
}

interface Tag {
  id: string;
  name: string;
}

/**
 * Extract director name from TMDB credits
 */
const extractDirector = (details: TMDBDetails): string => {
  return extractDirectorFromCredits(details);
};

/**
 * Build bluray data object from TMDB details
 */
const buildBlurayData = (
  details: TMDBDetails,
  type: MediaType,
  purchaseDate: string,
  selectedTags: string[],
  year?: string,
  seasons?: number[]
): any => {
  const description: I18nText = {
    en: details.overview || undefined,
    fr: details.overview_fr || undefined,
  };

  const blurayData: any = {
    title: details.title || details.name,
    type,
    description,
    genre: details.genres?.map(g => g.name) || [],
    cover_image_url: buildPosterUrl(details.poster_path),
    backdrop_url: buildBackdropUrl(details.backdrop_path),
    purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : null,
    rating: details.vote_average || 0,
    tags: selectedTags,
    tmdb_id: details.id?.toString(),
  };

  if (type === 'movie') {
    blurayData.release_year = details.release_date
      ? parseInt(details.release_date.split('-')[0])
      : (year ? parseInt(year) : undefined);
    blurayData.director = details.director || '';
    blurayData.runtime = details.runtime || 0;
  } else if (seasons && seasons.length > 0) {
    blurayData.seasons = seasons.map(seasonNum => {
      const season = details.seasons?.find(s => s.season_number === seasonNum);
      return {
        number: seasonNum,
        episode_count: season?.episode_count || 0,
        year: season?.air_date ? parseInt(season.air_date.split('-')[0]) : undefined,
        description: season?.name || `Season ${seasonNum}`,
      };
    });
  } else if (details.seasons) {
    // Auto-add all seasons if none specified
    blurayData.seasons = details.seasons
      .filter(s => s.season_number > 0)
      .map(season => ({
        number: season.season_number,
        episode_count: season.episode_count || 0,
        year: season.air_date ? parseInt(season.air_date.split('-')[0]) : undefined,
        description: season.name || `Season ${season.season_number}`,
      }));
  }

  return blurayData;
};

export default function AddBlurayPage() {
  const t = useTranslations();
  const tb = useTranslations('barcode');
  const router = useRouter();
  const pathname = usePathname();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [step, setStep] = useState<Step>('initial');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [type, setType] = useState<MediaType>('movie');

  // Use route protection
  useRouteProtection(pathname);

  // Step 1: Initial form
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  // Step 2: TMDB Search
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);

  // Step 3: Confirm with details
  const [selectedMovie, setSelectedMovie] = useState<TMDBDetails | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await apiClient.getTags();
        // Ensure we have an array
        const tags = Array.isArray(response) ? response : [];
        setAvailableTags(tags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        setAvailableTags([]);
      }
    };
    fetchTags();
  }, []);

  /**
   * Handle barcode scanning from the BarcodeScanner component
   * This function is called when a barcode is detected (via camera or manual input)
   * It first looks up the barcode in a UPC database, then searches TMDB with the title
   * 
   * @param barcode - The detected or manually entered barcode string
   */
  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode || !barcode.trim()) {
      toast.error(tb('invalidBarcode'));
      return;
    }

    setSearching(true);

    try {
      console.log('Barcode detected:', barcode, 'Media type:', type);

      // Lookup the barcode using our backend proxy
      toast.loading(tb('lookingUp'));

      try {
        const upcData = await apiClient.lookupBarcode(barcode);

        if (upcData.items && upcData.items.length > 0) {
          const product = upcData.items[0];
          let title = product.title;

          console.log('UPC lookup result:', product);

          // Clean up the title - remove common DVD/Blu-ray suffixes and extra info
          title = cleanProductTitle(title);

          toast.success(`${tb('found')}: ${title}`);

          // Search TMDB with the cleaned title
          const response = await apiClient.searchTMDB(type, title);

          if (!response.results || response.results.length === 0) {
            toast.error(tb('noResults'));
            setSearching(false);
            return;
          }

          if (response.results.length === 1 || response.results[0]) {
            toast.success(tb('bestMatch'));
            await quickAddResult(response.results[0]);
          } else {
            // Multiple matches - let user choose
            setSearchResults(response.results);
            setStep('search');
            toast.success(t('add.foundResults', { count: response.results.length }));
          }

        } else {
          // UPC not found in database
          toast.error(tb('notFound'));
          setSearching(false);
          return;
        }
      } catch (upcError: any) {
        console.error('UPC lookup error:', upcError);
        toast.error(tb('searchFailed'));
        setSearching(false);
        return;
      }

    } catch (error: any) {
      console.error('Barcode search error:', error);
      const errorMessage = error?.message || t('add.failedToSearch');
      toast.error(t('add.searchFailed', { error: errorMessage }));
    } finally {
      setSearching(false);
    }
  };

  const searchTMDB = async () => {
    if (!name.trim()) {
      toast.error(t('add.pleaseEnterTitle'));
      return;
    }

    setSearching(true);
    try {
      const query = year ? `${name} ${year}` : name;
      const response = await apiClient.searchTMDB(type, query);
      setSearchResults(response.results || []);
      setStep('search');
    } catch (error) {
      toast.error(t('add.failedToSearchTMDB'));
    } finally {
      setSearching(false);
    }
  };

  const selectTMDBResult = async (result: TMDBResult) => {
    setLoading(true);
    try {
      const details: TMDBDetails = await apiClient.getTMDBDetails(type, result.id);

      if (type === 'movie') {
        details.director = extractDirector(details);
      }

      setSelectedMovie(details);
      if (type === 'series' && details.seasons) {
        setSelectedSeasons(details.seasons.filter(s => s.season_number > 0).map(s => s.season_number));
      }
      setStep('confirm');
    } catch (error) {
      toast.error(t('add.failedToFetchDetails'));
    } finally {
      setLoading(false);
    }
  };

  const quickAddResult = async (result: TMDBResult) => {
    setLoading(true);
    try {
      const details: TMDBDetails = await apiClient.getTMDBDetails(type, result.id);

      if (type === 'movie') {
        details.director = extractDirector(details);
      }

      const blurayData = buildBlurayData(details, type, purchaseDate, selectedTags);

      console.log('Submitting bluray data with TMDB ID:', blurayData.tmdb_id, 'Full data:', blurayData);

      await apiClient.createBluray(blurayData);
      toast.success(t('add.addedToCollection', { title: details.title || details.name || 'Unknown' }));
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to add bluray:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error?.message || t('add.failedToAddToCollection');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSelectedSeasons(prev =>
      prev.includes(seasonNumber)
        ? prev.filter(n => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMovie) return;

    setLoading(true);
    try {
      const blurayData = buildBlurayData(
        selectedMovie,
        type,
        purchaseDate,
        selectedTags,
        year,
        selectedSeasons
      );

      await apiClient.createBluray(blurayData);
      toast.success(t('add.success'));
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to add bluray:', error);
      toast.error(error?.message || t('add.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderInitialForm = () => (
    <div className="space-y-6">
      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          {t('add.type')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('movie')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${type === 'movie'
              ? 'border-blue-500 bg-blue-500/20 text-blue-400'
              : 'border-gray-600 bg-gray-700/30 text-gray-400 hover:border-gray-500'
              }`}
          >
            <Film className="w-5 h-5" />
            <span className="font-medium">{t('add.movie')}</span>
          </button>
          <button
            type="button"
            onClick={() => setType('series')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${type === 'series'
              ? 'border-purple-500 bg-purple-500/20 text-purple-400'
              : 'border-gray-600 bg-gray-700/30 text-gray-400 hover:border-gray-500'
              }`}
          >
            <Tv className="w-5 h-5" />
            <span className="font-medium">{t('add.series')}</span>
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('add.titleField')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('add.titlePlaceholder')}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchTMDB();
            }
          }}
        />
      </div>

      {/* Year */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {type === 'movie' ? t('add.releaseYear') : t('add.firstAirYear')}
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder={t('add.yearPlaceholder')}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Purchase Date */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          {t('add.purchaseDate')}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full min-w-0 px-4 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setPurchaseDate(new Date().toISOString().split('T')[0])}
            icon={<Calendar className="w-4 h-4 inline mr-1.5 group-hover:scale-110 transition-transform" />}
            size="md"
            className='min-w-0'
          >
            {t('add.today')}
          </Button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          <TagIcon className="w-4 h-4 inline mr-1" />
          {t('add.tags')}
        </label>
        <button
          type="button"
          onClick={() => setShowTagModal(true)}
          className="group w-full px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-400 hover:from-blue-500/20 hover:to-blue-600/20 border-2 border-dashed border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
        >
          <Edit className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>{t('add.editTags')}</span>
          {selectedTags.length > 0 && (
            <span className="ml-2 px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/30">
              {selectedTags.length}
            </span>
          )}
        </button>
        {selectedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags
              .filter(tag => selectedTags.includes(tag.id))
              .map(tag => (
                <span
                  key={tag.id}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                >
                  {tag.name}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Search Button */}
      <Button
        variant="primary"
        onClick={searchTMDB}
        disabled={searching || !name.trim()}
        loading={searching}
        loadingText={t('add.searching')}
        icon={<Search className="w-5 h-5" />}
        fullWidth
      >
        {t('add.searchTMDB')}
      </Button>
    </div>
  );

  const renderSearchResults = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setStep('initial')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t('add.backToSearch')}</span>
      </button>

      <div className="space-y-3">
        {searchResults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {t('add.noResults')}
          </div>
        ) : (
          searchResults.slice(0, 10).map((result) => (
            <div
              key={result.id}
              className="flex gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {result.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                  alt={result.title || result.name || 'Media poster'}
                  width={64}
                  height={96}
                  className="object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-24 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                  {type === 'movie' ? <Film className="w-6 h-6 text-gray-400" /> : <Tv className="w-6 h-6 text-gray-400" />}
                </div>
              )}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => selectTMDBResult(result)}
              >
                <h3 className="font-semibold text-white">{result.title || result.name}</h3>
                <p className="text-sm text-gray-400">
                  {result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0] || 'N/A'}
                </p>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{result.overview}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  quickAddResult(result);
                }}
                disabled={loading}
                title={t('add.addToCollection')}
                className="w-12 h-12 flex items-center justify-center bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-center"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderConfirm = () => {
    if (!selectedMovie) return null;

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setStep('search')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('add.backToResults')}</span>
        </button>

        {/* Movie Details Preview */}
        <div className="flex gap-4">
          {selectedMovie.poster_path && (
            <Image
              src={`https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`}
              alt={selectedMovie.title || selectedMovie.name || 'Media poster'}
              width={128}
              height={192}
              className="object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {selectedMovie.title || selectedMovie.name}
            </h2>
            <div className="space-y-1 text-gray-300">
              {(selectedMovie.release_date || selectedMovie.first_air_date) && (
                <p className="text-sm">
                  <span className="font-semibold">{t('add.year')}:</span>{' '}
                  {selectedMovie.release_date?.split('-')[0] || selectedMovie.first_air_date?.split('-')[0]}
                </p>
              )}
              {selectedMovie.director && (
                <p className="text-sm">
                  <span className="font-semibold">{t('add.director')}:</span> {selectedMovie.director}
                </p>
              )}
              {selectedMovie.runtime && (
                <p className="text-sm">
                  <span className="font-semibold">{t('add.runtime')}:</span> {selectedMovie.runtime} {t('add.minutes')}
                </p>
              )}
              {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                <p className="text-sm">
                  <span className="font-semibold">{t('add.genres')}:</span> {selectedMovie.genres.map(g => g.name).join(', ')}
                </p>
              )}
              {selectedMovie.vote_average && (
                <p className="text-sm">
                  <span className="font-semibold">{t('add.rating')}:</span> {selectedMovie.vote_average.toFixed(1)}/10
                </p>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-3">{selectedMovie.overview}</p>
          </div>
        </div>

        {/* Season Selection for Series */}
        {type === 'series' && selectedMovie.seasons && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              {t('add.selectSeasons')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {selectedMovie.seasons
                .filter(s => s.season_number > 0)
                .map((season) => (
                  <button
                    key={season.season_number}
                    type="button"
                    onClick={() => toggleSeason(season.season_number)}
                    className={`p-3 rounded-lg border-2 transition-all ${selectedSeasons.includes(season.season_number)
                      ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                      : 'border-gray-600 bg-gray-700/30 text-gray-400 hover:border-gray-500'
                      }`}
                  >
                    <div className="font-semibold">{t('add.season')} {season.season_number}</div>
                    <div className="text-xs">{season.episode_count} {t('add.episodes')}</div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={loading || (type === 'series' && selectedSeasons.length === 0)}
            loading={loading}
            loadingText={t('add.adding')}
            icon={<Check className="w-5 h-5" />}
            fullWidth
          >
            {t('add.addToCollection')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/dashboard')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12 pt-6 space-y-8">
      {showTagModal && (
        <TagModal
          initialSelectedTags={selectedTags}
          onClose={() => setShowTagModal(false)}
          onSave={(tags) => setSelectedTags(tags)}
        />
      )}

      <div className="flex items-center space-x-3">
        <Film className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('add.title')}</h1>
      </div>

      {/* Main Form Section */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        {step === 'initial' && renderInitialForm()}
        {step === 'search' && renderSearchResults()}
        {step === 'confirm' && renderConfirm()}
      </div>

      {/* Barcode Scanner Section */}
      {step === 'initial' && (
        <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 border border-purple-600/30 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                {t('add.quickAddBarcode')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 ml-3">
                {t('add.barcodeScanDesc')}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsCameraOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              title={t('barcode.title')}
            >
              <Camera className="w-5 h-5" />
              <span>{t('barcode.title')}</span>
            </button>

            <BarcodeScannerModal
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onBarcodeScanned={handleBarcodeScanned}
              isLoading={searching}
            />

          </div>
        </div>
      )}
    </div>
  );
}