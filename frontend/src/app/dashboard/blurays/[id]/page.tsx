'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import useRouteProtection from '@/hooks/useRouteProtection';
import { apiClient } from '@/lib/api-client';
import { Film, Tv, Calendar, DollarSign, Star, MapPin, Tag as TagIcon, Clock, User, Edit, Trash2, ArrowLeft, Check, X, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import TagModal from '@/components/modals/TagModal';
import { Bluray } from '@/types/bluray';
import { getLocalizedText, isValidPurchaseDate, formatPurchaseDate } from '@/lib/bluray-utils';
import { Button } from '@/components/common';
import { LoaderCircle } from '@/components/common/LoaderCircle';

export default function BlurayDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'fr';
  const { user } = useAuthStore();
  const [bluray, setBluray] = useState<Bluray | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const canModify = user?.role === 'admin' || user?.role === 'moderator';

  // Use route protection
  useRouteProtection(pathname);

  useEffect(() => {
    const fetchBluray = async () => {
      try {
        const data = await apiClient.getBluray(params.id as string);
        setBluray(data);
      } catch (error) {
        console.error('Failed to fetch bluray:', error);
        toast.error('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBluray();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm(t('details.confirmDelete'))) return;

    setDeleting(true);
    try {
      await apiClient.deleteBluray(params.id as string);
      toast.success(t('details.deleteSuccess'));
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete bluray:', error);
      toast.error(t('details.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <LoaderCircle />
    );
  }

  if (!bluray) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400">{t('details.notFound')}</p>
        <Button
          variant="primary"
          onClick={() => router.push('/dashboard')}
          className="mt-4"
        >
          {t('details.backToDashboard')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 pb-12">
      {/* Tag Edit Modal */}
      {editingTags && (
        <TagModal
          blurayId={params.id as string}
          initialSelectedTags={bluray?.tags || []}
          onClose={() => setEditingTags(false)}
          onSave={(tags) => {
            if (bluray) {
              setBluray({ ...bluray, tags });
            }
          }}
          blurayTitle={bluray?.title}
        />
      )}

      {/* Back Button */}
      <div className="py-3 sm:py-6">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Backdrop */}
      {bluray.backdrop_url && (
        <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-2xl overflow-hidden mb-8 shadow-2xl">
          <Image
            src={bluray.backdrop_url}
            alt={bluray.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/20"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {/* Poster - overlapping backdrop */}
        <div className="lg:col-span-1 -mt-32 sm:-mt-32 md:-mt-40 px-16 sm:px-6 md:px-6">
          {bluray.cover_image_url && (
            <div className="relative group">
              <Image
                src={bluray.cover_image_url}
                alt={bluray.title}
                width={400}
                height={600}
                className="w-full max-w-sm mx-auto lg:mx-0 rounded-xl shadow-2xl ring-4 ring-gray-800/50 group-hover:ring-blue-500/30 transition-all duration-300"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-3 space-y-6 sm:space-y-8 px-4 sm:px-6 md:px-8">
          {/* Title & Type */}
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
              {bluray.type === 'movie' ? (
                <div className="p-1 sm:p-1.5 md:p-2 bg-blue-500/10 rounded-lg">
                  <Film className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-blue-400" />
                </div>
              ) : (
                <div className="p-1 sm:p-1.5 md:p-2 bg-purple-500/10 rounded-lg">
                  <Tv className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-purple-400" />
                </div>
              )}
              <span className="text-xs md:text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {t(`common.${bluray.type}`)}
              </span>
              <a
                href={bluray.tmdb_id
                  ? `https://www.themoviedb.org/${bluray.type === 'movie' ? 'movie' : 'tv'}/${bluray.tmdb_id}`
                  : `https://www.themoviedb.org/search?query=${encodeURIComponent(bluray.title)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto p-1 sm:p-1.5 md:p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors group flex-shrink-0"
                title={bluray.tmdb_id ? "View on TMDB" : "Search on TMDB"}
              >
                <ExternalLink className="w-3.5 sm:w-4 md:w-5 h-3.5 sm:h-4 md:h-5 text-blue-400 group-hover:text-blue-300" />
              </a>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
              {bluray.title}
            </h1>

            {/* Genres */}
            {bluray.genre && bluray.genre.length > 0 && (
              <div className="flex flex-wrap gap-1 md:gap-2">
                {bluray.genre.map((g, i) => (
                  <span
                    key={i}
                    className="px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 bg-gradient-to-r from-gray-800 to-gray-700 text-gray-200 rounded-full text-xs sm:text-xs md:text-sm font-medium hover:from-gray-700 hover:to-gray-600 transition-all duration-200"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {bluray.description && (
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-700/50">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
                {t('details.description')}
              </h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                {typeof bluray.description === 'string'
                  ? bluray.description
                  : getLocalizedText(bluray.description, locale)}
              </p>
            </div>
          )}

          {/* Movie Details */}
          {bluray.type === 'movie' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bluray.release_year && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs sm:text-sm font-medium uppercase tracking-wide">{t('details.releaseYear')}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{bluray.release_year}</p>
                </div>
              )}
              {bluray.director && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <User className="w-5 h-5" />
                    <span className="text-xs sm:text-sm font-medium uppercase tracking-wide">{t('details.director')}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{bluray.director}</p>
                </div>
              )}
              {bluray.runtime && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-xs sm:text-sm font-medium uppercase tracking-wide">{t('details.runtime')}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{bluray.runtime} min</p>
                </div>
              )}
            </div>
          )}

          {/* Series Seasons */}
          {bluray.type === 'series' && bluray.seasons && bluray.seasons.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">{t('details.seasons')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {bluray.seasons.map((season) => (
                  <div key={season.number} className="group bg-gradient-to-br from-purple-900/20 to-gray-800 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02]">
                    <div className="text-purple-400 font-bold text-lg mb-1 group-hover:text-purple-300 transition-colors">{t('details.seasons')} {season.number}</div>
                    <div className="text-gray-300 text-sm font-medium">{season.episode_count} {t('details.episodes')}</div>
                    {season.year && <div className="text-gray-500 text-xs mt-1">{season.year}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collection Info */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              {t('details.collectionInfo')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {bluray.purchase_price > 0 && (
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    <DollarSign className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span>{t('details.purchasePrice')}</span>
                  </div>
                  <p className="text-white font-bold text-lg sm:text-xl">${bluray.purchase_price.toFixed(2)}</p>
                </div>
              )}

              {isValidPurchaseDate(bluray.purchase_date) && (
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    <Calendar className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span>{t('details.purchaseDate')}</span>
                  </div>
                  <p className="text-white font-bold text-lg sm:text-xl">
                    {formatPurchaseDate(bluray.purchase_date)}
                  </p>
                </div>
              )}

              {bluray.location && (
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span>{t('details.location')}</span>
                  </div>
                  <p className="text-white font-bold text-lg sm:text-xl break-words">{bluray.location}</p>
                </div>
              )}

              {bluray.rating > 0 && (
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    <Star className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span>{t('details.rating')}</span>
                  </div>
                  <p className="text-white font-bold text-lg sm:text-xl flex items-center gap-1">
                    <span className="text-yellow-400">{bluray.rating}</span>/10
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="border-t border-gray-700/50 pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <TagIcon className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-base sm:text-lg font-semibold text-white whitespace-nowrap">{t('details.tags')}</span>
                </div>
                {canModify && (
                  <Button
                    variant="primary"
                    onClick={() => setEditingTags(true)}
                    icon={<Edit className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover:rotate-12 transition-transform" />}
                    size="sm"
                  >
                    {t('bluray.editTags')}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {bluray.tags && bluray.tags.length > 0 ? (
                  bluray.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-400 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium border border-blue-500/30 hover:border-blue-400/50 hover:from-blue-500/20 hover:to-blue-600/20 transition-all duration-200"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs sm:text-sm italic">No tags</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 md:gap-4 justify-end mt-6 sm:mt-8 flex-wrap">
            {canModify && (
              <>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/dashboard/blurays/${bluray.id}/edit`)}
                  icon={<Edit className="w-3.5 sm:w-4 md:w-5 h-3.5 sm:h-4 md:h-5 group-hover:rotate-12 transition-transform" />}
                >
                  {t('details.edit')}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  icon={<Trash2 className="w-3.5 sm:w-4 md:w-5 h-3.5 sm:h-4 md:h-5 group-hover:scale-110 transition-transform" />}
                >
                  {deleting ? t('details.deleting') : t('details.delete')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

  );
}
