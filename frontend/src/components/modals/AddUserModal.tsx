'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, User as UserIcon, Mail, Lock, Shield, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Button } from '@/components/common';

interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	created_at: string;
}

interface AddUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingUser: User | null;
	onRefresh: () => void;
}

export function AddUserModal({ isOpen, onClose, editingUser, onRefresh }: AddUserModalProps) {
	const t = useTranslations();
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		role: 'user',
	});

	// Reset form when modal opens or editingUser changes
	useEffect(() => {
		if (editingUser) {
			setFormData({
				username: editingUser.username,
				email: editingUser.email,
				password: '',
				role: editingUser.role,
			});
		} else {
			setFormData({ username: '', email: '', password: '', role: 'user' });
		}
	}, [editingUser, isOpen]);

	const handleSaveUser = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		if (!formData.username.trim() || !formData.email.trim()) {
			toast.error(t('users.usernameEmailRequired'));
			return;
		}

		if (!editingUser && !formData.password) {
			toast.error(t('users.passwordRequired'));
			return;
		}

		setSaving(true);
		try {
			if (editingUser) {
				await apiClient.updateUser(editingUser.id, {
					username: formData.username,
					email: formData.email,
					role: formData.role,
				});
				toast.success(t('users.updateSuccess'));
			} else {
				await apiClient.createUser(formData);
				toast.success(t('users.createSuccess'));
			}
			onRefresh();
			onClose();
		} catch (error: any) {
			console.error('Failed to save user:', error);
			toast.error(error?.response?.data?.message || t('users.saveFailed'));
		} finally {
			setSaving(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
				{/* Modal Header */}
				<div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
						<div className="w-2 h-6 bg-blue-500 rounded-full" />
						{editingUser ? t('users.editUser') : t('users.createUser')}
					</h2>
					<button
						onClick={onClose}
						className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<form onSubmit={handleSaveUser} className="p-6 space-y-3 sm:space-y-6 sm:mb-2 overflow-y-auto">
					<div>
						<label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
							<UserIcon size={14} /> {t('users.username')}
						</label>
						<input
							type="text"
							value={formData.username}
							onChange={(e) => setFormData({ ...formData, username: e.target.value })}
							placeholder={t('users.enterUsername')}
							className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all"
						/>
					</div>

					<div>
						<label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
							<Mail size={14} /> {t('users.email')}
						</label>
						<input
							type="email"
							value={formData.email}
							onChange={(e) => setFormData({ ...formData, email: e.target.value })}
							placeholder={t('users.enterEmail')}
							className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all"
						/>
					</div>

					<div>
						<label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
							<Lock size={14} /> {t('users.password')}
						</label>
						<input
							type="password"
							value={formData.password}
							onChange={(e) => setFormData({ ...formData, password: e.target.value })}
							placeholder={editingUser ? t('users.leaveEmptyPassword') : t('users.enterPassword')}
							className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all"
						/>
					</div>

					<div>
						<label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-500 mb-2">
							<Shield size={14} /> {t('users.role')}
						</label>
						<select
							value={formData.role}
							onChange={(e) => setFormData({ ...formData, role: e.target.value })}
							className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all appearance-none"
						>
							<option value="guest">{t('users.guest')}</option>
							<option value="user">{t('users.user')}</option>
							<option value="moderator">{t('users.moderator')}</option>
							<option value="admin">{t('users.admin')}</option>
						</select>
					</div>

					{/* Actions - hidden submit button to enable enter key */}
					<button type="submit" className="hidden" />
				</form>

				{/* Modal Footer */}
				<div className="flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={saving}
						className="flex-1 py-3 rounded-2xl"
					>
						{t('users.cancel')}
					</Button>
					<Button
						onClick={() => handleSaveUser()}
						loading={saving}
						variant="primary"
						className="flex-1 py-3 rounded-2xl shadow-lg shadow-blue-500/20"
					>
						<Save size={18} className="mr-2" />
						{editingUser ? t('users.update') : t('users.create')}
					</Button>
				</div>
			</div>
		</div>
	);
}