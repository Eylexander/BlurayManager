'use client';

import { useState, useEffect } from 'react';
import { X, Check, Plus, Tag as TagIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Button } from '@/components/common';

interface Tag {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface TagModalProps {
  initialSelectedTags?: string[];
  onClose: () => void;
  onSave?: (selectedTagsIds: string[], updatedAvailableTags: Tag[]) => void;
  blurayId?: string;
  blurayTitle?: string;
}

export default function AddTagModal({
  initialSelectedTags = [],
  onClose,
  onSave,
  blurayId,
  blurayTitle,
}: TagModalProps) {
  const t = useTranslations();

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        setShowNewTagInput(false);
        setNewTag('');
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);



  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await apiClient.getTags();
        setAvailableTags(Array.isArray(tags) ? tags : []);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        toast.error(t('add.failedToLoadTags'));
      }
    };

    fetchTags();
  }, [t]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;

    try {
      const tag = await apiClient.createTag({ name: newTag.trim(), color: '#3B82F6', icon: 'TagIcon' });
      setAvailableTags([...availableTags, tag]);
      setSelectedTags([...selectedTags, tag.id]);
      setNewTag('');
      setShowNewTagInput(false);
      toast.success(t('add.tagCreated'));
    } catch (error) {
      toast.error(t('add.failedToCreateTag'));
    }
  };

  const handleDone = async () => {
    // If blurayId is provided, update the bluray tags directly, otherwise just call onSave
    if (blurayId) {
      setLoading(true);
      try {
        await apiClient.updateBlurayTags(blurayId, { title: blurayTitle || '', tags: selectedTags });
        toast.success(t('add.tagsUpdated'));
        if (onSave) onSave(selectedTags, availableTags);
        onClose();
      } catch (error) {
        console.error('Failed to update tags:', error);
        toast.error(t('add.failedToUpdateTags'));
      } finally {
        setLoading(false);
      }
    } else {
      if (onSave) onSave(selectedTags, availableTags);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowNewTagInput(false);
          setNewTag('');
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TagIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('add.selectTags')}</h2>
              {blurayTitle && <p className="text-sm text-gray-600 dark:text-gray-400">{blurayTitle}</p>}
            </div>
          </div>
          <button
            onClick={() => {
              setShowNewTagInput(false);
              setNewTag('');
              onClose();
            }}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('add.availableTags')}
            </h3>
            <div className="flex flex-wrap gap-3">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`group px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedTags.includes(tag.id)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 scale-105'
                      : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600/50 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                  {selectedTags.includes(tag.id) && <Check className="w-4 h-4 inline mr-1.5" />}
                  {tag.icon && <TagIcon className="w-4 h-4 inline mr-1.5" />}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Create New Tag Section */}
          <div className="border-t border-gray-200 dark:border-gray-700/50 pt-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('add.createNewTag')}
            </h3>
            {!showNewTagInput ? (
              <button
                type="button"
                onClick={() => setShowNewTagInput(true)}
                className="group w-full px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 hover:from-blue-500/20 hover:to-blue-600/20 border-2 border-dashed border-blue-400 dark:border-blue-500/30 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span>{t('add.addNewTag')}</span>
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('add.enterTagName')}
                  autoFocus
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-50 dark:focus:bg-gray-700 transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTag();
                    } else if (e.key === 'Escape') {
                      setShowNewTagInput(false);
                      setNewTag('');
                    }
                  }}
                />
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleCreateTag}
                    fullWidth
                    size="sm"
                  >
                    {t('add.createTag')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowNewTagInput(false);
                      setNewTag('');
                    }}
                    size="sm"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700/50 p-6 flex gap-3">
          <Button
            variant="primary"
            onClick={handleDone}
            disabled={loading}
            loading={loading}
            loadingText="Saving..."
            icon={<Check className="w-5 h-5" />}
            fullWidth
          >
            {t('common.done')}
          </Button>
        </div>
      </div>
    </div>
  );
}
