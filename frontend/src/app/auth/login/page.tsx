"use client";

import { Button, Input } from "@/components/common";
import { getApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard
  useRouteProtection(pathname, false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const { languageChanged } = await login(identifier.trim(), password);
      toast.success(t("auth.loginSuccess"));
      
      if (languageChanged) {
        window.location.href = ROUTES.DASHBOARD.HOME;
      } else {
        router.push(ROUTES.DASHBOARD.HOME);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        getApiError(error, t("auth.loginError"));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const { languageChanged } = await login("guest@bluray-manager.local", "guest");
      toast.success(t("auth.guestLoginSuccess"));
      
      if (languageChanged) {
        window.location.href = ROUTES.DASHBOARD.HOME;
      } else {
        router.push(ROUTES.DASHBOARD.HOME);
      }
    } catch (error: any) {
      console.error("Guest login error:", error);
      toast.error(t("auth.guestLoginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-center">{t("auth.login")}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Input
          label={t("auth.emailOrUsername")}
          id="identifier"
          name="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t("auth.emailOrUsername")}
          autoComplete="username"
          disabled={loading}
          required
        />

        <div>
          <Input
            label={t("auth.password")}
            revealable
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            required
          />
          <div className="mt-2 text-right">
            <Link
              href={ROUTES.AUTH.FORGOT_PASSWORD}
              className="text-sm text-primary hover:underline underline-offset-4 font-medium"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.loginButton")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.dontHaveAccount")}{" "}
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="text-primary hover:text-primary font-medium"
          >
            {t("auth.register")}
          </Link>
        </p>
      </div>

      {/* Guest Login Section */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {t("auth.guestAccess")}
          </p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleGuestLogin}
          disabled={loading}
          icon={<UserCircle />}
        >
          {t("auth.continueAsGuest")}
        </Button>
      </div>
    </>
  );
}
