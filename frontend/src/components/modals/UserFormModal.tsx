'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Mail, Save, Shield, User as UserIcon, UserPlus, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient, getApiError } from '@/lib/api-client';
import { User } from '@/types/auth';
import { Button, Field, Modal } from '@/components/common';

export const ROLES: User['role'][] = ['guest', 'user', 'moderator', 'admin'];

interface UserFormModalProps {
  /** User to edit; omit to create a new one */
  user?: User | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Create or edit a user account (admin only). */
export default function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'user',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim() || !form.email.trim()) {
      toast.error(t('users.usernameEmailRequired'));
      return;
    }
    if (!user && !form.password) {
      toast.error(t('users.passwordRequired'));
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setSaving(true);
    try {
      if (user) {
        await apiClient.updateUser(user.id, {
          username: form.username,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success(t('users.updateSuccess'));
      } else {
        await apiClient.createUser(form);
        toast.success(t('users.createSuccess'));
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getApiError(error, t('users.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      icon={user ? <UserCog /> : <UserPlus />}
      title={user ? t('users.editUser') : t('users.createUser')}
      description={user?.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="user-form" loading={saving} icon={<Save />}>
            {user ? t('users.update') : t('users.create')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('users.username')} icon={<UserIcon />} htmlFor="user-username">
          <input
            id="user-username"
            autoComplete="off"
            value={form.username}
            onChange={set('username')}
            placeholder={t('users.enterUsername')}
            className="input"
          />
        </Field>
        <Field label={t('users.email')} icon={<Mail />} htmlFor="user-email">
          <input
            id="user-email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={set('email')}
            placeholder={t('users.enterEmail')}
            className="input"
          />
        </Field>
        <Field
          label={t('users.password')}
          icon={<Lock />}
          htmlFor="user-password"
          hint={user ? t('users.leaveEmptyPassword') : undefined}
        >
          <input
            id="user-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            placeholder={user ? '••••••' : t('users.enterPassword')}
            className="input"
          />
        </Field>
        <Field label={t('users.role')} icon={<Shield />} htmlFor="user-role">
          <select id="user-role" value={form.role} onChange={set('role')} className="input">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`users.${role}`)}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
