'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Bluray } from '@/types/bluray';
import { Star, Calendar, Play, Edit3, Trash2, Tag as TagIcon, ExternalLink, MoreVertical } from 'lucide-react';
import ContextMenu, { ContextMenuOption } from '@/components/common/ContextMenu';
import TagModal from '@/components/modals/TagModal';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useBlurayTools } from '@/hooks/useBlurayTools';

interface BlurayListItemProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayListItem({ bluray, onUpdate }: BlurayListItemProps) {
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
        onContextMenu={(e) => { e.preventDefault(); if(canModify) setContextMenu({ x: e.clientX, y: e.clientY }); }}
        className="relative group"
      >
        <Link href={`/dashboard/blurays/${currentBluray.id}`}>
          <div className="
            flex gap-4 p-3 sm:p-4 
            bg-dark-800/40 backdrop-blur-md
            border border-white/[0.03] 
            rounded-xl
            transition-all duration-300 ease-in-out
            /* Desktop: Translate slightly and add a soft glow */
            md:hover:scale-[1.005] md:hover:bg-dark-700/60 md:hover:border-primary-500/30
            md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]
            /* Mobile: Gentle feedback without horizontal movement */
            active:scale-[0.98] active:bg-dark-700
          ">
            {/* Cover Image with Glow Effect */}
            <div className="relative w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 shadow-2xl overflow-hidden rounded-lg border border-white/10">
              {currentBluray.cover_image_url ? (
                <Image
                  src={currentBluray.cover_image_url}
                  alt={currentBluray.title}
                  fill
                  className="object-cover transition-transform duration-500 md:group-hover:scale-110"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-dark-600 to-dark-800 flex items-center justify-center">
                  <span className="opacity-50 text-2xl">🎬</span>
                </div>
              )}
              {/* Glass overlay on image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate md:group-hover:text-primary-400 transition-colors tracking-tight">
                    {currentBluray.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5 opacity-80">
                    {currentBluray.director || 'Unknown Director'}
                  </p>
                </div>

                {/* Visual Indicator for Desktop */}
                <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 opacity-0 group-hover:opacity-100 transition-all transform scale-[0.98] group-hover:scale-100">
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>

              {/* Metadata Badges */}
              <div className="flex items-center gap-3 mt-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
                {currentBluray.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{currentBluray.rating.toFixed(1)}</span>
                  </div>
                )}

                {currentBluray.release_year && (
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                    <Calendar className="w-3 h-3" />
                    <span>{currentBluray.release_year}</span>
                  </div>
                )}

                {currentBluray.genre?.[0] && (
                  <span className="hidden sm:block bg-primary-500/5 text-primary-400/80 px-2 py-0.5 rounded border border-primary-500/10">
                    {currentBluray.genre[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Mobile-only Context Trigger (Optional, since right-click is hard on mobile) */}
        {canModify && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX - 100, y: e.clientY });
            }}
            className="md:hidden absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
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
        <TagModal
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