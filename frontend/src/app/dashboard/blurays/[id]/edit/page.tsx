'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import useRouteProtection from '@/hooks/useRouteProtection';
import { apiClient } from '@/lib/api-client';
import { Film, Tv, Calendar, Tag as TagIcon, Check, Loader, ArrowLeft, Save, Plus, X, Edit, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import TagModal from '@/components/modals/TagModal';
import { I18nText } from '@/types/bluray';
import { Button } from '@/components/common';
import { 
  extractDirectorFromCredits, 
  buildPosterUrl, 
  buildBackdropUrl,
  extractYear,
  type TMDBDetails,
  type TMDBResult 
} from '@/lib/tmdb-utils';
import { normalizePurchaseDateForInput } from '@/lib/bluray-utils';
import { LoaderCircle } from '@/components/common/LoaderCircle';

interface Season {
  number: number;
  episode_count: number;
  year?: number;
  description?: I18nText | string;
}

interface Bluray {
  id: string;
  title: string;
  type: 'movie' | 'series';
  release_year?: number;
  director?: string;
  runtime?: number;
  seasons?: Season[];
  description: I18nText | string;
  genre: string[];
  cover_image_url: string;
  backdrop_url: string;
  purchase_price: number;
  purchase_date: string;
  location: string;
  tags: string[];
  rating: number;
  tmdb_id?: string;
  imdb_id?: string;
}

export default function EditBlurayPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'fr';
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [descriptionLang, setDescriptionLang] = useState<'en' | 'fr'>('en');
  const canModify = user?.role === 'admin' || user?.role === 'moderator';

  // Use route protection
  useRouteProtection(pathname);

  // Redirect if user doesn't have permission (fallback, route protection should catch it first)
  useEffect(() => {
    if (!canModify) {
      router.replace(`/dashboard/blurays/${params.id}`);
    }
  }, [canModify, router, params.id]);

  // Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'series'>('movie');
  const [releaseYear, setReleaseYear] = useState<number | ''>('');
  const [director, setDirector] = useState('');
  const [runtime, setRuntime] = useState<number | ''>('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [genre, setGenre] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rating, setRating] = useState<number | ''>('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tmdbId, setTmdbId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bluray data
        const blurayData = await apiClient.getBluray(params.id as string);
        
        // Populate form
        setTitle(blurayData.title);
        setType(blurayData.type);
        setReleaseYear(blurayData.release_year || '');
        setDirector(blurayData.director || '');
        setRuntime(blurayData.runtime || '');
        
        // Handle description (can be string or I18nText)
        if (typeof blurayData.description === 'string') {
          setDescriptionEn(blurayData.description);
          setDescriptionFr('');
        } else if (blurayData.description) {
          setDescriptionEn(blurayData.description.en || '');
          setDescriptionFr(blurayData.description.fr || '');
        }
        
        setGenre(blurayData.genre || []);
        setCoverImageUrl(blurayData.cover_image_url || '');
        setBackdropUrl(blurayData.backdrop_url || '');
        setPurchasePrice(blurayData.purchase_price || '');
        setPurchaseDate(normalizePurchaseDateForInput(blurayData.purchase_date));
        setLocation(blurayData.location || '');
        setSelectedTags(blurayData.tags || []);
        setRating(blurayData.rating || '');
        setSeasons(blurayData.seasons || []);
        setTmdbId(blurayData.tmdb_id || '');
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load item details');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  const fetchOnlineData = async () => {
    if (!tmdbId && !title.trim()) {
      toast.error('Please enter a title first');
      return;
    }

    setFetching(true);
    try {
      let tmdbIdToUse = tmdbId;
      
      // If no TMDB ID stored, search for it
      if (!tmdbIdToUse) {
        const query = releaseYear ? `${title} ${releaseYear}` : title;
        const response = await apiClient.searchTMDB(type, query);
        const results = response.results || [];

        if (results.length === 0) {
          toast.error('No results found on TMDB');
          return;
        }

        // Get the first result (most relevant)
        const firstResult: TMDBResult = results[0];
        tmdbIdToUse = firstResult.id.toString();
      }
      
      // Fetch details using TMDB ID
      const details: TMDBDetails = await apiClient.getTMDBDetails(type, parseInt(tmdbIdToUse));

      // Update form fields with TMDB data - always override existing values
      setTitle(details.title || details.name || title);
      
      // TMDB provides both English and French descriptions - override both
      setDescriptionEn(details.overview || '');
      setDescriptionFr(details.overview_fr || '');
      
      if (type === 'movie') {
        // Override movie-specific fields
        const year = extractYear(details.release_date);
        setReleaseYear(year || '');
        setRuntime(details.runtime || 0);
        
        setDirector(extractDirectorFromCredits(details));
      } else if (type === 'series') {
        // Override series-specific fields
        const year = extractYear(details.first_air_date);
        setReleaseYear(year || '');
        
        const formattedSeasons = details.seasons
          ? details.seasons
              .filter(s => s.season_number > 0)
              .map(s => ({
                number: s.season_number,
                episode_count: s.episode_count,
                year: extractYear(s.air_date),
                description: ''
              }))
          : [];
        setSeasons(formattedSeasons);
      }

      // Override common fields
      setGenre(details.genres ? details.genres.map(g => g.name) : []);
      setCoverImageUrl(buildPosterUrl(details.poster_path));
      setBackdropUrl(buildBackdropUrl(details.backdrop_path));
      setRating(details.vote_average || 0);

      toast.success('Metadata updated from TMDB!');
    } catch (error) {
      console.error('Failed to fetch TMDB data:', error);
      toast.error('Failed to fetch online data');
    } finally {
      setFetching(false);
    }
  };
  const addGenre = () => {
    if (newGenre.trim() && !genre.includes(newGenre.trim())) {
      setGenre([...genre, newGenre.trim()]);
      setNewGenre('');
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setGenre(genre.filter(g => g !== genreToRemove));
  };

  const addSeason = () => {
    const newSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map(s => s.number)) + 1 : 1;
    setSeasons([...seasons, { number: newSeasonNumber, episode_count: 0 }]);
  };

  const updateSeason = (index: number, field: keyof Season, value: any) => {
    const updated = [...seasons];
    updated[index] = { ...updated[index], [field]: value };
    setSeasons(updated);
  };

  const removeSeason = (index: number) => {
    setSeasons(seasons.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      // Build I18nText description
      const description: I18nText = {
        en: descriptionEn.trim() || undefined,
        fr: descriptionFr.trim() || undefined,
      };

      const blurayData: any = {
        title: title.trim(),
        type,
        description,
        genre,
        cover_image_url: coverImageUrl.trim(),
        backdrop_url: backdropUrl.trim(),
        purchase_price: purchasePrice ? Number(purchasePrice) : 0,
        purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : null,
        location: location.trim(),
        tags: selectedTags,
        rating: rating ? Number(rating) : 0,
      };

      if (type === 'movie') {
        blurayData.release_year = releaseYear ? Number(releaseYear) : undefined;
        blurayData.director = director.trim();
        blurayData.runtime = runtime ? Number(runtime) : undefined;
      } else {
        blurayData.seasons = seasons;
      }

      await apiClient.updateBluray(params.id as string, blurayData);
      toast.success(t('bluray.updateSuccess'));
      router.push(`/dashboard/blurays/${params.id}`);
    } catch (error: any) {
      console.error('Failed to update bluray:', error);
      toast.error(error?.message || t('bluray.updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoaderCircle />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      {/* Tag Edit Modal */}
      {showTagModal && (
        <TagModal
          initialSelectedTags={selectedTags}
          onClose={() => setShowTagModal(false)}
          onSave={(tags) => setSelectedTags(tags)}
          blurayTitle={title}
        />
      )}

      {/* Back Button */}
      <div className="py-6">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {type === 'movie' ? (
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Film className="w-8 h-8 text-blue-400" />
              </div>
            ) : (
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Tv className="w-8 h-8 text-purple-400" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white">{t('bluray.editBluray')}</h1>
              <p className="text-gray-400 mt-1">{t('bluray.updateDetails', { type: t(`common.${type}`) })}</p>
            </div>
          </div>
          <Button
            variant="purple"
            onClick={fetchOnlineData}
            disabled={fetching}
            loading={fetching}
            loadingText={t('bluray.fetching')}
            icon={<Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />}
          >
            {t('bluray.fetchOnlineData')}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-xl space-y-8">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {t('bluray.title')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
            required
          />
        </div>

        {/* Type (disabled) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {t('bluray.type')}
          </label>
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-700/30 border border-gray-600/30 rounded-xl text-gray-400 cursor-not-allowed">
            {type === 'movie' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
            <span className="font-medium">{type === 'movie' ? t('bluray.movie') : t('bluray.series')}</span>
            <span className="text-xs ml-auto bg-gray-600/50 px-2 py-1 rounded-lg">(Cannot be changed)</span>
          </div>
        </div>

        {/* Movie-specific fields */}
        {type === 'movie' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('bluray.releaseYear')}
                </label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('bluray.director')}
                </label>
                <input
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('bluray.runtime')} (min)
                </label>
                <input
                  type="number"
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
                />
              </div>
            </div>
          </>
        )}

        {/* Series-specific fields */}
        {type === 'series' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('bluray.seasons')}
            </label>
            <div className="space-y-3">
              {seasons.map((season, index) => (
                <div key={index} className="flex gap-3 items-start p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="number"
                        value={season.number}
                        onChange={(e) => updateSeason(index, 'number', parseInt(e.target.value) || 0)}
                        placeholder="Season #"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={season.episode_count}
                        onChange={(e) => updateSeason(index, 'episode_count', parseInt(e.target.value) || 0)}
                        placeholder="Episodes"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={season.year || ''}
                        onChange={(e) => updateSeason(index, 'year', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Year"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSeason(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSeason}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('bluray.addSeason')}
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {t('bluray.description')}
          </label>
          
          {/* Language tabs */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setDescriptionLang('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                descriptionLang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              onClick={() => setDescriptionLang('fr')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                descriptionLang === 'fr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🇫🇷 Français
            </button>
          </div>

          {descriptionLang === 'en' ? (
            <textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={4}
              placeholder="English description (from TMDB)"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200 resize-none"
            />
          ) : (
            <textarea
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              rows={4}
              placeholder="Description française (optionnelle)"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200 resize-none"
            />
          )}
        </div>

        {/* Genres */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {t('bluray.genre')}
          </label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {genre.map((g, i) => (
                <span
                  key={i}
                  className="group px-4 py-2 bg-gradient-to-r from-gray-700/50 to-gray-600/50 text-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 border border-gray-600/30"
                >
                  {g}
                  <button
                    type="button"
                    onClick={() => removeGenre(g)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addGenre();
                  }
                }}
                placeholder="Add genre"
                className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
              />
              <button
                type="button"
                onClick={addGenre}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cover Image URL
            </label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backdrop URL
            </label>
            <input
              type="url"
              value={backdropUrl}
              onChange={(e) => setBackdropUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Purchase Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('bluray.purchaseDate')}
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('bluray.purchasePrice')} (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Location & Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('bluray.location')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('bluray.rating')} (0-10)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <TagIcon className="w-4 h-4 inline mr-1" />
            {t('bluray.tags')}
          </label>
          <button
            type="button"
            onClick={() => setShowTagModal(true)}
            className="group w-full px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-400 hover:from-blue-500/20 hover:to-blue-600/20 border-2 border-dashed border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
          >
            <Edit className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>{t('bluray.editTags')}</span>
            {selectedTags.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/30">
                {selectedTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-700/50">
          <Button
            type="submit"
            variant="success"
            disabled={saving}
            loading={saving}
            loadingText="Saving..."
            icon={<Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            fullWidth
          >
            {t('common.save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            fullWidth
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
