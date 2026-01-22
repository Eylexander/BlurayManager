'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Bluray } from '@/types/bluray';
import { Star, Calendar, Edit3, Trash2, Tag as TagIcon, ExternalLink } from 'lucide-react';
import ContextMenu, { ContextMenuOption } from '@/components/common/ContextMenu';
import TagModal from '@/components/modals/TagModal';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface BlurayCardProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayCard({ bluray, onUpdate }: BlurayCardProps) {
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
      <div onContextMenu={handleContextMenu} className="h-full w-full min-w-0">
        <Link href={`/dashboard/blurays/${currentBluray.id}`} className="block h-full w-full">
          <div className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-md sm:hover:shadow-2xl transition-all duration-300 group h-full w-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 sm:hover:border-primary-500/50 sm:transform sm:hover:scale-105 sm:hover:-translate-y-1">
            {/* Image Container */}
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
              {currentBluray.cover_image_url ? (
                <Image
                  src={currentBluray.cover_image_url}
                  alt={currentBluray.title}
                  fill
                  className="object-cover sm:group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 20vw, (max-width: 1536px) 16vw, 14vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <span className="text-white text-3xl sm:text-4xl">🎬</span>
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2 sm:p-3">
                {/* Top Action Buttons - Only for admin/moderator */}
                {canModify && (
                <div className="flex gap-1.5 sm:gap-2 justify-end sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-300">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTagModal(true);
                    }}
                    className="p-1.5 sm:p-2 bg-blue-500/80 hover:bg-blue-600 rounded-md sm:rounded-lg transition-all duration-200 text-white hover:scale-110"
                    title="Edit Tags"
                  >
                    <TagIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/dashboard/blurays/${currentBluray.id}/edit`);
                    }}
                    className="p-1.5 sm:p-2 bg-purple-500/80 hover:bg-purple-600 rounded-md sm:rounded-lg transition-all duration-200 text-white hover:scale-110"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-600 rounded-md sm:rounded-lg transition-all duration-200 text-white hover:scale-110"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </button>
                </div>
                )}
                
                {/* Bottom Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white text-xs sm:text-sm flex-wrap">
                    {currentBluray.rating > 0 && (
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                        <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{currentBluray.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {currentBluray.release_year && (
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                        <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span>{currentBluray.release_year}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Type Badge */}
                  <div className="inline-block">
                    <span className={`px-2 sm:px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md backdrop-blur-sm ${
                      currentBluray.type === 'movie'
                        ? 'bg-blue-500/80 text-white'
                        : 'bg-purple-500/80 text-white'
                    }`}>
                      {currentBluray.type === 'movie' ? 'Film' : 'Série'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info Section */}
            <div className="p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2 sm:group-hover:bg-gray-800/80 transition-colors duration-300 bg-gray-800/80">
              <h3 className="font-bold text-xs sm:text-sm line-clamp-2 text-white sm:group-hover:text-primary-400 transition-colors truncate">{currentBluray.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 capitalize">{currentBluray.type}</span>
                {currentBluray.tags && currentBluray.tags.length > 0 && (
                  <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full">
                    {currentBluray.tags.length}
                  </span>
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
