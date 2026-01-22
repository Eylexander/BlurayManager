'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
	const t = useTranslations();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			await apiClient.requestPasswordReset(email.toLowerCase());
			toast.success(t('auth.resetLinkSent'));
			setSent(true);
		} catch (error: any) {
			toast.error(error.response?.data?.error || t('auth.resetLinkError'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="mb-6">
				<h3 className="text-2xl font-bold text-center">{t('auth.resetPassword')}</h3>
				<p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
					{!sent ? t('auth.resetPasswordDescription') : ''}
				</p>
			</div>

			{!sent ? (
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label htmlFor="email" className="block text-sm font-medium mb-2">
							{t('auth.email')}
						</label>
						<div className="relative">
							<input
								id="email"
								name="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t('auth.emailPlaceholder')}
								autoComplete="username"
								disabled={loading}
								required
								className='input'
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? t('common.loading') : t('auth.sendResetLink')}
					</button>
				</form>
			) : (
				<div className="text-center py-4">
					<div className="mb-4 text-green-600 dark:text-green-400">
						<svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6">
						{t('auth.resetLinkSent')}
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{t('auth.resetPasswordInstructions')}
					</p>
				</div>
			)}

			<div className="mt-6 text-center">
				<Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
					{t('auth.backToLogin')}
				</Link>
			</div>
		</>
	);
}