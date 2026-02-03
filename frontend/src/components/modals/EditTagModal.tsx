'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Save, Palette, Type, Info, Hash } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Button } from '@/components/common';

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

interface TagModalProps {
  tag?: Tag | null;
  onClose: () => void;
  onSave: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

export default function EditTagModal({ tag, onClose, onSave }: TagModalProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: 'Hash',
    description: ''
  });

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name,
        color: tag.color || '#3B82F6',
        icon: tag.icon || 'Hash',
        description: tag.description || ''
      });
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tag) {
        await apiClient.updateTag(tag.id, formData);
        toast.success(t('tags.updateSuccess'));
      } else {
        await apiClient.createTag(formData);
        toast.success(t('tags.createSuccess'));
      }
      onSave();
    } catch (error) {
      toast.error(t('tags.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full" />
            {tag ? t('tags.editTag') : t('tags.addTag')}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3 sm:space-y-6 sm:mb-2 overflow-y-auto">
          {/* Name Field */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
               <Type size={14} /> {t('tags.labelName')}
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all"
              placeholder={t('tags.namePlaceholder')}
            />
          </div>

          <div>
            {/* Color Field */}
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
                <Palette size={14} /> {t('tags.labelColor')}
              </label>
              <div className="relative group">
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-gray-300 dark:border-white/10 shadow-inner pointer-events-none"
                  style={{ backgroundColor: formData.color }}
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl pl-12 pr-12 py-3 text-sm font-mono text-gray-900 dark:text-white outline-none"
                />
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                />
                <Palette size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </div>
          </div>

          {/* Color Presets */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFormData({ ...formData, color: c })}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  formData.color.toLowerCase() === c.toLowerCase() ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Description Field */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
              <Info size={14} /> {t('tags.labelDescription')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none resize-none transition-all"
              placeholder={t('tags.descriptionPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-3 rounded-2xl">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1 py-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Save size={18} className="mr-2" /> {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}