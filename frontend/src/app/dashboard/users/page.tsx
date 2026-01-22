'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Users as UsersIcon, Plus, Edit, Trash2, Search, Shield, Mail, User, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/common';
import { LoaderCircle } from '@/components/common/LoaderCircle';

interface User {
	id: string;
	username: string;
	email: string;
	role: string;
	created_at: string;
}

export default function UsersPage() {
	const t = useTranslations();
	const pathname = usePathname();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		role: 'user',
	});
	const [saving, setSaving] = useState(false);

	// Use route protection
	useRouteProtection(pathname);

	const fetchUsers = useCallback(async () => {
		try {
			const data = await apiClient.getUsers();
			setUsers(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error('Failed to fetch users:', error);
			toast.error(t('users.loadFailed'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleCreateUser = () => {
		setEditingUser(null);
		setFormData({ username: '', email: '', password: '', role: 'user' });
		setShowModal(true);
	};

	const handleEditUser = (user: User) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			email: user.email,
			password: '',
			role: user.role,
		});
		setShowModal(true);
	};

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
			setShowModal(false);
			fetchUsers();
		} catch (error: any) {
			console.error('Failed to save user:', error);
			toast.error(error?.response?.data?.message || t('users.saveFailed'));
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteUser = async (user: User) => {
		if (!confirm(t('users.confirmDelete', { username: user.username }))) return;

		try {
			await apiClient.deleteUser(user.id);
			toast.success(t('users.deleteSuccess'));
			fetchUsers();
		} catch (error) {
			console.error('Failed to delete user:', error);
			toast.error(t('users.deleteFailed'));
		}
	};

	const filteredUsers = users.filter(
		(user) =>
			user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.role.toLowerCase().includes(searchQuery.toLowerCase())
	);

	if (loading) {
		return (
			<LoaderCircle />
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
			{/* User Modal */}
			{showModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowModal(false);
						}
					}}
				>
					<div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full">
						{/* Modal Header */}
						<div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex items-center justify-between rounded-t-2xl">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-blue-500/20">
									<User className="w-6 h-6 text-blue-400" />
								</div>
								<h2 className="text-2xl font-bold text-white">
									{editingUser ? t('users.editUser') : t('users.createUser')}
								</h2>
							</div>
							<button
								onClick={() => setShowModal(false)}
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
								onClick={() => setShowModal(false)}
								disabled={saving}
							>
								{t('users.cancel')}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="mb-4 sm:mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
					<div className="flex items-center gap-3 sm:gap-4">
						<div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl">
							<UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-4xl font-bold text-white">{t('users.title')}</h1>
							<p className="text-sm sm:text-base text-gray-400 mt-1">{users.length} {t('users.totalUsers')}</p>
						</div>
					</div>
					<Button
						variant="primary"
						onClick={handleCreateUser}
						icon={<Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />}
					>
						{t('users.addUser')}
					</Button>
				</div>

				{/* Search Bar */}
				<div className="relative">
					<Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t('users.searchPlaceholder')}
						className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm sm:text-base text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-800 transition-all duration-200"
					/>
				</div>
			</div>

			{/* Users Table */}
			<div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
				{filteredUsers.length === 0 ? (
					<div className="p-6 sm:p-12 text-center">
						<UsersIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
						<p className="text-gray-400 text-sm sm:text-lg">
							{searchQuery ? t('users.noUsersFound') : t('users.noUsers')}
						</p>
					</div>
				) : (
					<>
						{/* Mobile Card Layout */}
						<div className="block md:hidden divide-y divide-gray-700/50">
							{filteredUsers.map((user) => (
								<div key={user.id} className="p-4 hover:bg-gray-800/30 transition-colors duration-200">
									<div className="flex items-start justify-between gap-3 mb-3">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
												{user.username.charAt(0).toUpperCase()}
											</div>
											<div className="min-w-0 flex-1">
												<div className="text-sm font-medium text-white truncate">{user.username}</div>
												<div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
													<Mail className="w-3 h-3 flex-shrink-0" />
													<span className="truncate">{user.email}</span>
												</div>
											</div>
										</div>
										<span
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${user.role === 'admin'
													? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
													: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
												}`}
										>
											<Shield className="w-3 h-3" />
											{user.role}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-xs text-gray-400">
											{new Date(user.created_at).toLocaleDateString()}
										</span>
										<div className="flex items-center gap-2">
											<button
												onClick={() => handleEditUser(user)}
												className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
												title={t('users.editUserTooltip')}
											>
												<Edit className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDeleteUser(user)}
												className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
												title={t('users.deleteUserTooltip')}
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Desktop Table Layout */}
						<div className="hidden md:block overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-800/50 border-b border-gray-700/50">
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
											{t('users.user')}
										</th>
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
											{t('users.email')}
										</th>
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
											{t('users.role')}
										</th>
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
											{t('users.created')}
										</th>
										<th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
											{t('users.actions')}
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-700/50">
									{filteredUsers.map((user) => (
										<tr
											key={user.id}
											className="hover:bg-gray-800/30 transition-colors duration-200"
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
														{user.username.charAt(0).toUpperCase()}
													</div>
													<div className="text-sm font-medium text-white">{user.username}</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-2 text-sm text-gray-300">
													<Mail className="w-4 h-4 text-gray-400" />
													{user.email}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span
													className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${user.role === 'admin'
															? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
															: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
														}`}
												>
													<Shield className="w-3 h-3" />
													{user.role}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
												{new Date(user.created_at).toLocaleDateString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<div className="flex items-center justify-end gap-2">
													<button
														onClick={() => handleEditUser(user)}
														className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
														title={t('users.editUserTooltip')}
													>
														<Edit className="w-4 h-4" />
													</button>
													<button
														onClick={() => handleDeleteUser(user)}
														className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
														title={t('users.deleteUserTooltip')}
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
