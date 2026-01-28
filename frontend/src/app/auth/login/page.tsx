'use client';

import { useAuthStore } from "@/store/authStore";
import { Eye, EyeOff, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/dist/client/components/navigation";
import { useState } from "react";
import toast from 'react-hot-toast';
import Link from "next/link";

export default function LoginPage() {
	const t = useTranslations();
	const router = useRouter();
	const { login } = useAuthStore();
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (loading) return;

		setLoading(true);

		try {
			await login(identifier.trim(), password);
			toast.success(t('auth.loginSuccess'));
			router.push('/dashboard');
		} catch (error: any) {
			console.error('Login error:', error);
			const errorMessage = error?.response?.data?.error || error?.message || t('auth.loginError');
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleGuestLogin = async () => {
		if (loading) return;

		setLoading(true);

		try {
			await login('guest@bluray-manager.local', 'guest');
			toast.success(t('auth.guestLoginSuccess'));
			router.push('/dashboard');
		} catch (error: any) {
			console.error('Guest login error:', error);
			toast.error(t('auth.guestLoginError'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="mb-6">
				<h3 className="text-2xl font-bold text-center">{t('auth.login')}</h3>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label htmlFor="identifier" className="block text-sm font-medium mb-2">
						{t('auth.emailOrUsername')}
					</label>
					<div className="relative">
						<input
							id="identifier"
							name="identifier"
							type="text"
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							placeholder={t('auth.emailOrUsername')}
							autoComplete="username"
							disabled={loading}
							required
							className='input'
						/>
					</div>
				</div>

				<div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium mb-2">
							{t('auth.password')}
						</label>
						<div className="relative">
							<input
								id="password"
								name="password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								autoComplete="current-password"
								disabled={loading}
								required
								className='input pr-10'
							/>
							<div className="absolute right-3 top-[60%] -translate-y-1/2">
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									tabIndex={-1}
								>
									{showPassword ? (
										<EyeOff className="w-5 h-5" />
									) : (
										<Eye className="w-5 h-5" />
									)}
								</button>
							</div>
						</div>
					</div>
					<div className="mt-2 text-right">
						<Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
							{t('auth.forgotPassword')}
						</Link>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? t('common.loading') : t('auth.loginButton')}
				</button>
			</form>

			<div className="mt-6 text-center">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					{t('auth.dontHaveAccount')}{' '}
					<Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
						{t('auth.register')}
					</Link>
				</p>
			</div>

			{/* Guest Login Section */}
			<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
				<div className="text-center mb-4">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{t('auth.guestAccess')}
					</p>
				</div>
				<button
					type="button"
					onClick={handleGuestLogin}
					disabled={loading}
					className="
						w-full flex items-center justify-center
						gap-2 px-4 py-3
						bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
						text-gray-700 dark:text-gray-300
						rounded-lg font-medium
						transition-colors duration-200
						disabled:opacity-50 disabled:cursor-not-allowed border
						border-gray-300 dark:border-gray-600"
				>
					<UserCircle className="w-5 h-5" />
					{loading ? t('common.loading') : t('auth.continueAsGuest')}
				</button>
			</div>
		</>
	);
}