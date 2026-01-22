'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function InstallPage() {
	const t = useTranslations();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [success, setSuccess] = useState(false);
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		confirmPassword: ''
	});

	useEffect(() => {
		const checkSetup = async () => {
			try {
				const data = await apiClient.checkAdminExists();

				if (!data.needsSetup) {
					// Admin already exists, redirect to login
					router.push('/auth/login');
				} else {
					setLoading(false);
				}
			} catch (err) {
				toast.error(t('auth.installError'));
				setLoading(false);
			}
		};
		setLoading(false);

		checkSetup();
	}, [router, t]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (formData.password !== formData.confirmPassword) {
			toast.error(t('auth.passwordsDoNotMatch'));
			return;
		}

		if (formData.password.length < 6) {
			toast.error(t('auth.passwordTooShort'));
			return;
		}

		try {
			const data = await apiClient.completeSetup(
				formData.username,
				formData.email,
				formData.password
			);

			if (!data.user) {
				throw new Error(t('auth.installError'));
			}

			setSuccess(true);
			setTimeout(() => {
				router.push('/auth/login');
			}, 2000);
		} catch (err: any) {
			toast.error(err.message || t('auth.installError'));
		}
	};

	if (loading) {
		return (
			<div className="text-white text-xl text-center">{t('auth.installCheck')}</div>
		);
	}

	if (success) {
		toast.success(t('auth.installSuccess'));
		return (
			<div className="text-white text-xl text-center">{t('auth.installSuccess')}</div>
		);
	}

	return (
		<>
			<div className="mb-6">
				<h3 className="text-2xl font-bold text-center">{t('auth.install')}</h3>
				<p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
					{t('auth.installSubtitle')}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label htmlFor="username" className="block text-sm font-medium mb-2">
						{t('auth.username')}
					</label>
					<div className="relative">
						<input
							id="username"
							type="text"
							value={formData.username}
							onChange={(e) => setFormData({ ...formData, username: e.target.value })}
							disabled={loading}
							placeholder={t('auth.username')}
							required
							minLength={3}
							className='input'
						/>
					</div>
				</div>

				<div>
					<label htmlFor="email" className="block text-sm font-medium mb-2">
						{t('auth.email')}
					</label>
					<div className="relative">
						<input
							id="email"
							type="email"
							value={formData.email}
							onChange={(e) => setFormData({ ...formData, email: e.target.value })}
							disabled={loading}
							placeholder={t('auth.emailPlaceholder')}
							required
							className='input'
						/>
					</div>
				</div>

				<div>
					<label htmlFor="password" className="block text-sm font-medium mb-2">
						{t('auth.password')}
					</label>
					<div className="relative">
						<input
							id="password"
							type="password"
							value={formData.password}
							onChange={(e) => setFormData({ ...formData, password: e.target.value })}
							disabled={loading}
							placeholder={t('auth.password')}
							required
							minLength={8}
							className='input'
						/>
					</div>
				</div>

				<div>
					<label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
						{t('auth.confirmPassword')}
					</label>
					<div className="relative">
						<input
							id="confirmPassword"
							type="password"
							value={formData.confirmPassword}
							onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
							disabled={loading}
							placeholder={t('auth.confirmPassword')}
							required
							minLength={8}
							className='input'
						/>
					</div>
				</div>

				<button
					type="submit"
					className="w-full btn-primary py-3"
					disabled={loading}
				>
					{loading ? t('auth.installLoading') : t('auth.installButton')}
				</button>
			</form>

			<div className="mt-6 text-center text-sm text-gray-400">
				<p>{t('auth.installNotice')}</p>
			</div>

		</>
	)
}