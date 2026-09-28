'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Plus, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Tag } from '@/types/tag';
import { Button, Modal, SearchInput, TAG_COLORS } from '@/components/common';
import TagEditorModal from './TagEditorModal';

interface TagPickerModalProps {
  initialSelectedTags?: string[];
  onClose: () => void;
  onSave?: (selectedTagIds: string[], availableTags: Tag[]) => void;
  /** When set, the selection is saved to this bluray before onSave runs */
  blurayId?: string;
  blurayTitle?: string;
}

/** Choose which tags apply to a bluray; new tags are created with the shared tag editor. */
export default function TagPickerModal({
  initialSelectedTags = [],
  onClose,
  onSave,
  blurayId,
  blurayTitle,
}: TagPickerModalProps) {
  const t = useTranslations();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<string[]>(initialSelectedTags);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiClient
      .getTags()
      .then((tags) => setAvailableTags(Array.isArray(tags) ? tags : []))
      .catch(() => toast.error(t('add.failedToLoadTags')))
      .finally(() => setLoading(false));
  }, [t]);

  const visibleTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? availableTags.filter((tag) => tag.name.toLowerCase().includes(q)) : availableTags;
  }, [availableTags, query]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDone = async () => {
    if (blurayId) {
      setSaving(true);
      try {
        await apiClient.updateBlurayTags(blurayId, { title: blurayTitle || '', tags: selected });
        toast.success(t('add.tagsUpdated'));
      } catch {
        toast.error(t('add.failedToUpdateTags'));
        setSaving(false);
        return;
      }
    }
    onSave?.(selected, availableTags);
    onClose();
  };

  return (
    <>
      <Modal
        size="lg"
        onClose={onClose}
        icon={<Tags />}
        title={t('add.selectTags')}
        description={blurayTitle}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDone} loading={saving} icon={<Check />}>
              {t('common.done')} {selected.length > 0 && `(${selected.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {availableTags.length > 8 && (
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.search')} />
          )}

          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-9 w-24 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => {
                const active = selected.includes(tag.id);
                const color = tag.color || TAG_COLORS[0];
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(tag.id)}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    style={
                      active
                        ? { backgroundColor: color, borderColor: color, color: '#fff' }
                        : { backgroundColor: `${color}14`, borderColor: `${color}40` }
                    }
                  >
                    {active ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    )}
                    <span className={active ? '' : 'text-foreground'}>{tag.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-dashed border-primary/50 text-sm font-medium text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Plus className="w-4 h-4" />
                {t('add.addNewTag')}
              </button>
            </div>
          )}

          {!loading && availableTags.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('tags.noTags')}</p>
          )}
        </div>
      </Modal>

      {creating && (
        <TagEditorModal
          onClose={() => setCreating(false)}
          onSave={(tag) => {
            setAvailableTags((prev) => [...prev, tag]);
            setSelected((prev) => [...prev, tag.id]);
          }}
        />
      )}
    </>
  );
}
