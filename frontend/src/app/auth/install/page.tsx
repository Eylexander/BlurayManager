"use client";

import { Button, Input } from "@/components/common";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { ROUTES } from "@/hooks/useRouteProtection";

export default function InstallPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const data = await apiClient.checkAdminExists();

        if (!data.needsSetup) {
          // Admin already exists, redirect to login
          router.push(ROUTES.AUTH.LOGIN);
        } else {
          setLoading(false);
        }
      } catch (err) {
        toast.error(t("auth.installError"));
        setLoading(false);
      }
    };

    checkSetup();
  }, [router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    try {
      const data = await apiClient.completeSetup(
        formData.username,
        formData.email,
        formData.password,
      );

      if (!data.user) {
        throw new Error(t("auth.installError"));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.AUTH.LOGIN);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || t("auth.installError"));
    }
  };

  if (loading) {
    return (
      <div className="text-white text-xl text-center">
        {t("auth.installCheck")}
      </div>
    );
  }

  if (success) toast.success(t("auth.installSuccess"));

  return (
    <>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-center">{t("auth.install")}</h3>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {t("auth.installSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Input
          label={t("auth.username")}
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value }) }
          disabled={loading}
          placeholder={t("auth.username")}
          required
          minLength={3}
        />

        <Input
          label={t("auth.email")}
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value }) }
          disabled={loading}
          placeholder={t("auth.emailPlaceholder")}
          required
        />

        <Input
          label={t("auth.password")}
          revealable
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value }) }
          disabled={loading}
          placeholder={t("auth.password")}
          required
          minLength={6}
        />

        <Input
          label={t("auth.confirmPassword")}
          revealable
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value }) }
          disabled={loading}
          placeholder={t("auth.confirmPassword")}
          required
          minLength={6}
        />

        <Button type="submit" size="lg" fullWidth loading={loading} loadingText={t("auth.installLoad")}>
          {t("auth.installButton")}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>{t("auth.installNotice")}</p>
      </div>
    </>
  );
}
