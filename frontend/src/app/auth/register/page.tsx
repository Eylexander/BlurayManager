"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { useTranslations } from "next-intl";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const { register } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const { languageChanged } = await register(username, email.toLowerCase(), password);
      toast.success(t("auth.registerSuccess"));
      
      if (languageChanged) {
        // Refresh page to apply new language
        window.location.href = ROUTES.DASHBOARD.HOME;
      } else {
        router.push(ROUTES.DASHBOARD.HOME);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  // Use route protection to prevent access if already authenticated
  const pathname = usePathname();
  useRouteProtection(pathname, false);

  return (
    <>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-center">{t("auth.register")}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Username Field --- */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            {t("auth.username")}
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder={t("auth.username")}
              required
              minLength={3}
              className="input"
            />
          </div>
        </div>

        {/* --- Email Field --- */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            {t("auth.email")}
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder={t("auth.emailPlaceholder")}
              required
              className="input"
            />
          </div>
        </div>

        {/* --- Password Field --- */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            {t("auth.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder={t("auth.password")}
              required
              minLength={8}
              className="input"
            />
          </div>
        </div>

        {/* --- Confirm Password Field --- */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-2"
          >
            {t("auth.confirmPassword")}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder={t("auth.confirmPassword")}
              required
              minLength={8}
              className="input"
            />
          </div>
        </div>

        {/* --- Submit Button --- */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("common.loading") : t("auth.registerButton")}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </>
  );
}
