'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Tag as TagIcon, Plus, Edit, Trash2, Search, Hash, Calendar, Info, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/common';
import { LoaderCircle } from '@/components/common/LoaderCircle';
import EditTagModal from '@/components/modals/EditTagModal';

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  created_at: string;
}



export default function TagsPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useRouteProtection(pathname);

  const fetchTags = useCallback(async () => {
    try {
      const data = await apiClient.getTags();
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(t('tags.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setShowModal(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(t('tags.confirmDelete', { name: tag.name }))) return;
    try {
      await apiClient.deleteTag(tag.id);
      toast.success(t('tags.deleteSuccess'));
      fetchTags();
    } catch (error) {
      toast.error(t('tags.deleteFailed'));
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center pt-20"><LoaderCircle /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {showModal && (
        <EditTagModal
          tag={editingTag} 
          onClose={() => { setShowModal(false); setEditingTag(null); }}
          onSave={() => { fetchTags(); setShowModal(false); setEditingTag(null); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 sm:py-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TagIcon className="text-blue-500" /> {t('tags.title')}
          </h1>
          <p className="text-gray-400 mt-1">{tags.length} {t('tags.totalTags')}</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingTag(null); setShowModal(true); }}>
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> {t('tags.createTag')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 sm:mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('tags.searchPlaceholder')}
          className="w-full pl-12 pr-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
        />
      </div>

      {/* Responsive Grid */}
      {filteredTags.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/20 rounded-3xl border border-dashed border-gray-800">
          <p className="text-gray-500">{t('tags.noTagsFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="group bg-gray-800/40 border border-gray-700/50 p-5 rounded-2xl hover:border-blue-500/50 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg"
                  style={{ backgroundColor: `${tag.color}40`, color: tag.color, border: `1px solid ${tag.color}60` }}
                >
                  {tag.icon ? <i data-lucide={tag.icon}></i> : <Hash size={20} />}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tag)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(tag)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-white font-bold text-lg mb-1">{tag.name}</h3>
              <p className="text-gray-400 text-sm line-clamp-2 mb-4 h-10">{tag.description || '...'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-700/30 text-[11px] font-mono text-gray-500">
                <span className="flex items-center gap-1.5">
									<Calendar size={12}/> {new Date(tag.created_at).toLocaleDateString()}
								</span>
                <span className="uppercase">{tag.color}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}