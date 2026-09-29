"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/authStore";
import { apiClient, getApiError } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Sun, Moon, Monitor, Globe, User, Lock, Check, Settings, Play } from "lucide-react";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import useRouteProtection from "@/hooks/useRouteProtection";
import { Button, Input, PageHeader } from "@/components/common";

// Local Components
const SettingsCard = ({
  icon,
  title,
  subtitle,
  tone = "primary",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: "primary" | "danger";
  children: React.ReactNode;
}) => (
  <section className="card p-5 sm:p-6">
    <div className="flex items-center gap-3 mb-5">
      <div
        className={`grid place-items-center w-10 h-10 shrink-0 rounded-lg [&_svg]:w-5 [&_svg]:h-5 ${
          tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const OptionButton = ({
  icon,
  label,
  isSelected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={isSelected}
    onClick={onClick}
    className={`relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 h-20 sm:h-16 rounded-lg border text-sm font-medium transition-colors [&_svg]:w-5 [&_svg]:h-5 ${
      isSelected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
    }`}
  >
    {icon}
    {label}
    {isSelected && <Check className="!w-4 !h-4 absolute top-2 right-2" />}
  </button>
);

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, updateUser, setLanguage } = useAuthStore();
  // Unsaved picks; until the user chooses, fall back to the live values so the
  // form stays in sync with the theme/locale/user as they load.
  const [themeChoice, setSelectedTheme] = useState<string | null>(null);
  const [languageChoice, setSelectedLanguage] = useState<string | null>(null);
  const selectedTheme = themeChoice ?? theme ?? "dark";
  const selectedLanguage =
    languageChoice ?? locale ?? user?.settings?.language ?? "en-US";
  const [loading, setLoading] = useState(false);

  // Use route protection
  useRouteProtection(pathname);

  // Username change state
  const [usernameDraft, setNewUsername] = useState<string | null>(null);
  const newUsername = usernameDraft ?? user?.username ?? "";
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Jellyfin link state
  const [jellyfinDraft, setJellyfinDraft] = useState<string | null>(null);
  const jellyfinUrl = jellyfinDraft ?? user?.settings?.jellyfin_url ?? "";
  const [jellyfinLoading, setJellyfinLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    try {
      // Update theme
      setTheme(selectedTheme);

      // Update language
      setLanguage(selectedLanguage as "en-US" | "fr-FR");

      // Save to backend if user is logged in
      if (user) {
        await apiClient.updateUserSettings({
          theme: selectedTheme,
          language: selectedLanguage,
        });

        // Update user in store
        updateUser({
          ...user,
          settings: {
            ...user.settings,
            theme: selectedTheme as "light" | "dark",
            language: selectedLanguage as "en-US" | "fr-FR",
          },
        });
      }

      toast.success(t("settings.saved"));

      // Refresh to apply language change
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      toast.error(t("settings.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername || newUsername.trim() === "") {
      toast.error(t("settings.usernameRequired"));
      return;
    }

    if (newUsername === user?.username) {
      toast.error(t("settings.usernameUnchanged"));
      return;
    }

    setUsernameLoading(true);

    try {
      const response = await apiClient.updateUsername(newUsername);

      if (response.success !== true) {
        throw new Error(t("settings.usernameUpdateFailed"));
      }

      // Update user in store
      if (user) {
        updateUser({
          ...user,
          username: newUsername,
        });
      }

      toast.success(t("settings.usernameUpdated"));
    } catch (error: any) {
      toast.error(
        getApiError(error, t("settings.usernameUpdateFailed")),
      );
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("settings.allFieldsRequired"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    setPasswordLoading(true);

    try {
      await apiClient.updatePassword(currentPassword, newPassword);

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success(t("settings.passwordUpdated"));
    } catch (error: any) {
      toast.error(
        getApiError(error, t("settings.passwordUpdateFailed")),
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleJellyfinUpdate = async () => {
    setJellyfinLoading(true);

    try {
      const response = await apiClient.updateUserSettings({ jellyfin_url: jellyfinUrl });
      const saved: string = response.settings?.jellyfin_url ?? "";

      if (user) {
        updateUser({ ...user, settings: { ...user.settings, jellyfin_url: saved } });
      }
      setJellyfinDraft(null);

      toast.success(t("settings.jellyfinSaved"));
    } catch (error: any) {
      toast.error(getApiError(error, t("settings.jellyfinSaveFailed")));
    } finally {
      setJellyfinLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader icon={<Settings />} title={t("settings.title")} description={t("settings.subtitle")} />

      <div className="space-y-6">
        {/* Account settings are hidden for the shared guest account */}
        {user?.role !== "guest" && (
          <SettingsCard icon={<User />} title={t("settings.profile")} subtitle={t("settings.profileSubtitle")}>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mb-5 rounded-lg bg-muted/40 border border-border">
              {[
                [t("settings.currentUsername"), user?.username],
                [t("settings.email"), user?.email],
                [t("settings.role"), user?.role ? t(`users.${user.role}`) : ""],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-foreground truncate">{value}</dd>
                </div>
              ))}
            </dl>

            <form
              className="flex flex-col sm:flex-row sm:items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleUsernameUpdate();
              }}
            >
              <Input
                id="username"
                label={t("settings.newUsername")}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t("settings.newUsername")}
                disabled={usernameLoading}
              />
              <Button
                type="submit"
                disabled={newUsername === user?.username}
                loading={usernameLoading}
              >
                {t("settings.updateUsername")}
              </Button>
            </form>
          </SettingsCard>
        )}

        {user?.role !== "guest" && (
          <SettingsCard
            icon={<Lock />}
            tone="danger"
            title={t("settings.updatePassword")}
            subtitle={t("settings.updatePasswordSubtitle")}
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordUpdate();
              }}
            >
              <Input
                id="currentPassword"
                type="password"
                revealable
                autoComplete="current-password"
                label={t("settings.currentPassword")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordLoading}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="newPassword"
                  type="password"
                  revealable
                  autoComplete="new-password"
                  label={t("settings.newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                />
                <Input
                  id="confirmPassword"
                  type="password"
                  revealable
                  autoComplete="new-password"
                  label={t("settings.confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  loading={passwordLoading}
                >
                  {t("settings.updatePassword")}
                </Button>
              </div>
            </form>
          </SettingsCard>
        )}

        {user?.role !== "guest" && (
          <SettingsCard icon={<Play />} title={t("settings.jellyfin")} subtitle={t("settings.jellyfinSubtitle")}>
            <form
              className="flex flex-col sm:flex-row sm:items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleJellyfinUpdate();
              }}
            >
              <Input
                id="jellyfinUrl"
                type="url"
                inputMode="url"
                label={t("settings.jellyfinUrl")}
                value={jellyfinUrl}
                onChange={(e) => setJellyfinDraft(e.target.value)}
                placeholder="https://jellyfin.example.com"
                disabled={jellyfinLoading}
              />
              <Button
                type="submit"
                disabled={jellyfinUrl === (user?.settings?.jellyfin_url ?? "")}
                loading={jellyfinLoading}
              >
                {t("common.save")}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">{t("settings.jellyfinHint")}</p>
          </SettingsCard>
        )}

        <SettingsCard icon={<Sun />} title={t("settings.theme")} subtitle={t("settings.themeSubtitle")}>
          <div className="grid grid-cols-3 gap-3">
            <OptionButton
              icon={<Sun />}
              label={t("settings.light")}
              isSelected={selectedTheme === "light"}
              onClick={() => setSelectedTheme("light")}
            />
            <OptionButton
              icon={<Moon />}
              label={t("settings.dark")}
              isSelected={selectedTheme === "dark"}
              onClick={() => setSelectedTheme("dark")}
            />
            <OptionButton
              icon={<Monitor />}
              label={t("settings.system")}
              isSelected={selectedTheme === "system"}
              onClick={() => setSelectedTheme("system")}
            />
          </div>
        </SettingsCard>

        <SettingsCard icon={<Globe />} title={t("settings.language")} subtitle={t("settings.languageSubtitle")}>
          <div className="grid grid-cols-2 gap-3">
            <OptionButton
              icon={<span className="text-xs font-bold tracking-wide">EN</span>}
              label={t("settings.english")}
              isSelected={selectedLanguage === "en-US"}
              onClick={() => setSelectedLanguage("en-US")}
            />
            <OptionButton
              icon={<span className="text-xs font-bold tracking-wide">FR</span>}
              label={t("settings.french")}
              isSelected={selectedLanguage === "fr-FR"}
              onClick={() => setSelectedLanguage("fr-FR")}
            />
          </div>
        </SettingsCard>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={loading} size="lg">
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
