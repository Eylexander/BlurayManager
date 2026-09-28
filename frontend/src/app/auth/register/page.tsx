"use client";

import { Button, Input } from "@/components/common";
import { getApiError } from "@/lib/api-client";
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
      toast.error(getApiError(error, t("auth.registerError")));
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

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Input
          label={t("auth.username")}
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          placeholder={t("auth.username")}
          required
          minLength={3}
        />

        <Input
          label={t("auth.email")}
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder={t("auth.emailPlaceholder")}
          required
        />

        <Input
          label={t("auth.password")}
          revealable
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder={t("auth.password")}
          required
          minLength={8}
        />

        <Input
          label={t("auth.confirmPassword")}
          revealable
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          placeholder={t("auth.confirmPassword")}
          required
          minLength={8}
        />

        {/* --- Submit Button --- */}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.registerButton")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="text-primary hover:text-primary font-medium"
          >
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </>
  );
}
