'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Bluray } from '@/types/bluray';
import { Star, Calendar, Edit3, Tag as TagIcon, MoreVertical } from 'lucide-react';
import ContextMenu from '@/components/common/ContextMenu';
import AddTagModal from '@/components/modals/AddTagModal';
import { useTranslations } from 'next-intl';
import { useBlurayTools } from '@/hooks/useBlurayTools';

interface BlurayCardProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayCard({ bluray, onUpdate }: BlurayCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuthStore();
  const canModify = user?.role === 'admin' || user?.role === 'moderator';

  const {
    currentBluray, showTagModal, setShowTagModal,
    contextMenu, setContextMenu, handleTagUpdate, menuOptions
  } = useBlurayTools(bluray, onUpdate);

  return (
    <>
      <div
        onContextMenu={(e) => { e.preventDefault(); if (canModify) setContextMenu({ x: e.clientX, y: e.clientY }); }}
        className="relative group h-full w-full perspective-1000"
      >
        <Link href={`/dashboard/blurays/${currentBluray.id}`} className="block h-full w-full">
          <div className="
            relative flex flex-col h-full w-full 
            bg-dark-800/40 backdrop-blur-md 
            border border-white/5 
            rounded-2xl overflow-hidden
            transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
            md:group-hover:scale-[1.02] md:group-hover:-translate-y-2 
            md:group-hover:border-primary-500/40 md:group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]
            active:scale-[0.97]
          ">
            {/* Image Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl">
              {/* Motion Wrapper: Both image and gradient live here */}
              <div className="relative w-full h-full transition-transform duration-500 cubic-bezier(0.25, 1, 0.5, 1) md:group-hover:scale-110">
                {currentBluray.cover_image_url ? (
                  <Image
                    src={currentBluray.cover_image_url}
                    alt={currentBluray.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-dark-700 to-dark-900 flex items-center justify-center">
                    <span className="text-4xl opacity-40">🎬</span>
                  </div>
                )}

                {/* Premium Gradient Overlay: Now inside the scaling wrapper */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-black/20" />
              </div>

              {/* Floating Badge (Top Left) */}
              <div className="absolute top-3 left-3">
                <span className={`
                  px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/10
                  ${currentBluray.type === 'movie' ? 'bg-blue-500/60 text-blue-50' : 'bg-purple-500/60 text-purple-50'}
                `}>
                  {currentBluray.type === 'movie' ? t('common.movie') : t('common.series')}
                </span>
              </div>

              {/* Quick Actions: Outside the scaling wrapper so they don't grow with the image */}
              {canModify && (
                <div className="hidden md:flex absolute top-3 right-3 flex-col gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); setShowTagModal(true); }}
                    className="p-2.5 bg-dark-950/90 backdrop-blur-xl hover:bg-primary-500 text-white rounded-xl border border-white/20 shadow-2xl transition-colors"
                  >
                    <TagIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); router.push(`/dashboard/blurays/${currentBluray.id}/edit`); }}
                    className="p-2.5 bg-dark-950/90 backdrop-blur-xl hover:bg-primary-500 text-white rounded-xl border border-white/20 shadow-2xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col bg-gradient-to-b from-transparent to-dark-900/50">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 group-hover:text-primary-400 transition-colors">
                  {currentBluray.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 font-medium opacity-70">
                  {currentBluray.director || t('common.unknownDirector')}
                </p>
              </div>

              {/* Bottom Meta Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  {currentBluray.rating > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{currentBluray.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {currentBluray.release_year && (
                    <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      <span>{currentBluray.release_year}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </Link>
        {/* Mobile More Trigger */}
        {canModify && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX - 100, y: e.clientY });
            }}
            className="md:hidden absolute bottom-1.5 right-1 p-2 text-gray-500 z-20 hover:text-white ease-in-out transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {contextMenu &&
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={menuOptions}
          onClose={() => setContextMenu(null)}
        />}

      {showTagModal && (
        <AddTagModal
          blurayId={currentBluray.id}
          blurayTitle={currentBluray.title}
          initialSelectedTags={currentBluray.tags || []}
          onClose={() => setShowTagModal(false)}
          onSave={handleTagUpdate}
        />
      )}
    </>
  );
}