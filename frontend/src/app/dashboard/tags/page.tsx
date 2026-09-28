'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tag as TagIcon, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Tag } from '@/types/tag';
import { Button, IconButton, PageHeader, SearchInput, TagChip, useConfirm } from '@/components/common';
import { LoaderCircle } from '@/components/common/LoaderCircle';
import TagEditorModal from '@/components/modals/TagEditorModal';

export default function TagsPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // undefined: editor closed, null: creating, Tag: editing
  const [editing, setEditing] = useState<Tag | null | undefined>(undefined);

  useRouteProtection(pathname);

  const fetchTags = useCallback(async () => {
    try {
      const data = await apiClient.getTags();
      setTags(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('add.failedToLoadTags'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    fetchTags();
  }, [fetchTags]);

  const handleDelete = async (tag: Tag) => {
    const ok = await confirm({
      title: t('tags.confirmDelete', { name: tag.name }),
      message: t('tags.deleteWarning'),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.deleteTag(tag.id);
      toast.success(t('tags.deleteSuccess'));
      fetchTags();
    } catch {
      toast.error(t('tags.deleteError'));
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredTags = tags.filter(
    (tag) => tag.name.toLowerCase().includes(q) || tag.description?.toLowerCase().includes(q),
  );

  if (loading) return <LoaderCircle />;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <PageHeader
        icon={<TagIcon />}
        title={t('tags.title')}
        description={`${tags.length} ${t('tags.totalTags')}`}
        actions={
          <Button onClick={() => setEditing(null)} icon={<Plus />}>
            {t('tags.createTag')}
          </Button>
        }
      />

      <SearchInput
        className="mb-6"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('tags.searchPlaceholder')}
      />

      {filteredTags.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border text-muted-foreground">
          {tags.length === 0 ? t('tags.noTags') : t('tags.noTagsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="card relative overflow-hidden p-5 flex flex-col transition-colors hover:border-primary/40"
            >
              {/* Colour strip */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tag.color }} />

              <div className="flex items-start justify-between gap-2 mb-2">
                <TagChip name={tag.name} color={tag.color} className="text-sm" />
                <div className="flex -mr-2 -mt-1">
                  <IconButton label={t('tags.editTag')} onClick={() => setEditing(tag)}>
                    <Pencil />
                  </IconButton>
                  <IconButton label={t('common.delete')} variant="danger" onClick={() => handleDelete(tag)}>
                    <Trash2 />
                  </IconButton>
                </div>
              </div>

              <p className="flex-1 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {tag.description || '—'}
              </p>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(tag.created_at).toLocaleDateString()}
                </span>
                <span className="font-mono uppercase">{tag.color}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <TagEditorModal tag={editing} onClose={() => setEditing(undefined)} onSave={() => fetchTags()} />
      )}
      {confirmDialog}
    </div>
  );
}
