'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Bluray } from '@/types/bluray';
import { Star, Calendar, Play, Edit3, Trash2, Tag as TagIcon, ExternalLink } from 'lucide-react';
import ContextMenu, { ContextMenuOption } from '@/components/common/ContextMenu';
import TagModal from '@/components/modals/TagModal';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface BlurayListItemProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayListItem({ bluray, onUpdate }: BlurayListItemProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentBluray, setCurrentBluray] = useState(bluray);
  const canModify = user?.role === 'admin' || user?.role === 'moderator';

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canModify) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${currentBluray.title}"?`)) return;
    
    try {
      await apiClient.deleteBluray(currentBluray.id);
      toast.success('Deleted successfully!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete');
    }
  };

  const handleTagUpdate = (tags: string[]) => {
    setCurrentBluray({ ...currentBluray, tags });
    if (onUpdate) onUpdate();
  };

  const contextMenuOptions: ContextMenuOption[] = [
    {
      label: 'View Details',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/blurays/${currentBluray.id}`),
    },
    {
      label: 'Edit Tags',
      icon: <TagIcon className="w-4 h-4" />,
      onClick: () => setShowTagModal(true),
    },
    {
      label: 'Edit',
      icon: <Edit3 className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/blurays/${currentBluray.id}/edit`),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      variant: 'danger',
      divider: true,
    },
  ];

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        <Link href={`/dashboard/blurays/${currentBluray.id}`}>
      <div className="flex gap-2 sm:gap-4 p-3 sm:p-5 mb-4 bg-gradient-to-r from-dark-700 to-dark-800 rounded-lg hover:from-dark-600 hover:to-dark-700 transition-all duration-200 group cursor-pointer border border-dark-600 hover:border-primary-500/30 min-w-0">
        {/* Cover Image */}
        <div className="relative w-12 sm:w-16 h-20 sm:h-24 flex-shrink-0">
          {currentBluray.cover_image_url ? (
            <Image
              src={currentBluray.cover_image_url}
              alt={currentBluray.title}
              fill
              className="object-cover rounded-md"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 rounded-md flex items-center justify-center">
              <span className="text-white text-lg">🎬</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                {currentBluray.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">
                {currentBluray.director || 'Unknown director'}
              </p>
            </div>
            <Play className="w-4 sm:w-5 h-4 sm:h-5 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-400 flex-wrap">
            {currentBluray.rating > 0 && (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Star className="w-3 sm:w-4 h-3 sm:h-4 fill-yellow-400 text-yellow-400" />
                <span>{currentBluray.rating.toFixed(1)}</span>
              </div>
            )}
            {currentBluray.release_year && (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Calendar className="w-3 sm:w-4 h-3 sm:h-4" />
                <span>{currentBluray.release_year}</span>
              </div>
            )}
            {currentBluray.genre && currentBluray.genre.length > 0 && (
              <span className="hidden sm:inline">{currentBluray.genre.join(', ')}</span>
            )}
          </div>
        </div>
          </div>
        </Link>
      </div>

      {contextMenu && canModify && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenuOptions}
          onClose={() => setContextMenu(null)}
        />
      )}

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
