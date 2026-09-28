'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Info, Palette, Save, Tag as TagIcon, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Tag } from '@/types/tag';
import { Button, Field, Modal, TagChip, TAG_COLORS } from '@/components/common';

interface TagEditorModalProps {
  /** Tag to edit; omit to create a new one */
  tag?: Tag | null;
  onClose: () => void;
  /** Receives the created or updated tag */
  onSave: (tag: Tag) => void;
}

/** Create or edit a tag. Used by the tag management page and the tag picker. */
export default function TagEditorModal({ tag, onClose, onSave }: TagEditorModalProps) {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: tag?.name ?? '',
    color: tag?.color || TAG_COLORS[0],
    description: tag?.description ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const data = { ...form, name: form.name.trim() };
      const saved: Tag = tag ? await apiClient.updateTag(tag.id, data) : await apiClient.createTag(data);
      toast.success(t(tag ? 'tags.updateSuccess' : 'tags.addSuccess'));
      onSave(saved ?? { ...tag!, ...data });
      onClose();
    } catch {
      toast.error(t(tag ? 'tags.updateError' : 'tags.addError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      icon={<TagIcon />}
      title={tag ? t('tags.editTag') : t('tags.createTag')}
      description={tag?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="tag-editor" loading={saving} disabled={!form.name.trim()} icon={<Save />}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="tag-editor" onSubmit={handleSubmit} className="space-y-5">
        <Field label={t('tags.labelName')} icon={<Type />} htmlFor="tag-name">
          <input
            id="tag-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('tags.namePlaceholder')}
            className="input"
          />
        </Field>

        <Field label={t('tags.labelColor')} icon={<Palette />} hint={t('tags.colorInfo')}>
          <div className="flex flex-wrap items-center gap-2">
            {TAG_COLORS.map((color) => {
              const active = form.color.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={active}
                  onClick={() => setForm({ ...form, color })}
                  className={`grid place-items-center w-8 h-8 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 ${active ? 'ring-2 ring-foreground' : ''}`}
                  style={{ backgroundColor: color }}
                >
                  {active && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
            {/* Custom colour: native picker behind a swatch */}
            <label
              className="relative grid place-items-center w-8 h-8 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground cursor-pointer"
              title={form.color}
            >
              <Palette className="w-4 h-4" />
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <span className="ml-1 text-xs font-mono uppercase text-muted-foreground">{form.color}</span>
          </div>
        </Field>

        <Field label={t('tags.labelDescription')} icon={<Info />} htmlFor="tag-description" hint={t('tags.descriptionInfo')}>
          <textarea
            id="tag-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder={t('tags.descriptionPlaceholder')}
            className="input resize-none"
          />
        </Field>

        {/* Preview */}
        {form.name.trim() && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('tags.preview')}</span>
            <TagChip name={form.name} color={form.color} />
          </div>
        )}
      </form>
    </Modal>
  );
}
