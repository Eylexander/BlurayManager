import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bluray } from '@/types/bluray';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Edit3, Trash2, Tag as TagIcon, ExternalLink } from 'lucide-react';

export function useBlurayTools(initialBluray: Bluray, onUpdate?: () => void) {
  const router = useRouter();
  const [currentBluray, setCurrentBluray] = useState(initialBluray);
  const [showTagModal, setShowTagModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${currentBluray.title}"?`)) return;
    try {
      await apiClient.deleteBluray(currentBluray.id);
      toast.success('Deleted successfully!');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleTagUpdate = (tags: string[]) => {
    setCurrentBluray({ ...currentBluray, tags });
    if (onUpdate) onUpdate();
  };

  // Centralized Menu Options Definition
  const menuOptions = [
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
      variant: 'danger' as const,
      divider: true,
    },
  ];

  return {
    currentBluray,
    showTagModal,
    setShowTagModal,
    contextMenu,
    setContextMenu,
    handleTagUpdate,
    menuOptions,
  };
}