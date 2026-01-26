'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, User as UserIcon, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/common';

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

	const handleSaveUser = async () => {
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
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full">
				{/* Modal Header */}
				<div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex items-center justify-between rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-blue-500/20">
							<UserIcon className="w-6 h-6 text-blue-400" />
						</div>
						<h2 className="text-2xl font-bold text-white">
							{editingUser ? t('users.editUser') : t('users.createUser')}
						</h2>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 space-y-4">
					<Input
						label={`${t('users.username')} *`}
						type="text"
						value={formData.username}
						onChange={(e) => setFormData({ ...formData, username: e.target.value })}
						placeholder={t('users.enterUsername')}
					/>

					<Input
						label={`${t('users.email')} *`}
						type="email"
						value={formData.email}
						onChange={(e) => setFormData({ ...formData, email: e.target.value })}
						placeholder={t('users.enterEmail')}
					/>

					<Input
						label={`${t('users.password')} ${!editingUser ? '*' : ''}`}
						type="password"
						value={formData.password}
						onChange={(e) => setFormData({ ...formData, password: e.target.value })}
						placeholder={editingUser ? t('users.leaveEmptyPassword') : t('users.enterPassword')}
					/>

					<div>
						<label className="block text-sm font-medium text-gray-400 mb-2">
							{t('users.role')} *
						</label>
						<select
							value={formData.role}
							onChange={(e) => setFormData({ ...formData, role: e.target.value })}
							className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
						>
							<option value="guest">{t('users.guest')}</option>
							<option value="user">{t('users.user')}</option>
							<option value="moderator">{t('users.moderator')}</option>
							<option value="admin">{t('users.admin')}</option>
						</select>
					</div>
				</div>

				{/* Modal Footer */}
				<div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700/50 p-6 flex gap-3 rounded-b-2xl">
					<Button
						variant="primary"
						onClick={handleSaveUser}
						disabled={saving}
						loading={saving}
						loadingText={t('users.saving')}
						fullWidth
						icon={<Check className="w-5 h-5" />}
					>
						{editingUser ? t('users.update') : t('users.create')}
					</Button>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={saving}
					>
						{t('users.cancel')}
					</Button>
				</div>
			</div>
		</div>
	);
}