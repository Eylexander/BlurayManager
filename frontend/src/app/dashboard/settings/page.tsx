'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Sun, Moon, Globe, User, Lock, Check, Settings } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter, usePathname } from 'next/navigation';
import useRouteProtection from '@/hooks/useRouteProtection';
import { Button, Input } from '@/components/common';

// Local Components
const SettingsCard = ({ icon, title, subtitle, children }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      {icon}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white">{title}</h2>
        <p className="text-xs sm:text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const OptionButton = ({ icon, label, isSelected, onClick }: {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`relative group p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 ${isSelected
      ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 to-blue-600/10 shadow-lg'
      : 'border-gray-700/50 bg-gray-700/30 hover:border-blue-500/50 hover:bg-gray-700/50'
      }`}
  >
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
      {icon}
      <span className={`font-semibold text-sm sm:text-lg ${isSelected ? 'text-white' : 'text-gray-300'}`}>{label}</span>
    </div>
    {isSelected && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 absolute top-2 right-2 sm:top-4 sm:right-4" />}
  </button>
);

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const { language, setLanguage } = useSettingsStore();
  const [selectedTheme, setSelectedTheme] = useState(theme || 'dark');
  const [selectedLanguage, setSelectedLanguage] = useState(locale || language || 'en-US');
  const [loading, setLoading] = useState(false);

  // Use route protection
  useRouteProtection(pathname);

  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (theme) setSelectedTheme(theme);
    // Use actual locale from next-intl as the source of truth
    const currentLanguage = locale || language;
    if (currentLanguage) setSelectedLanguage(currentLanguage);
    if (user) setNewUsername(user.username);
  }, [theme, language, user, locale]);

  const handleSave = async () => {
    setLoading(true);

    try {
      // Update theme
      setTheme(selectedTheme);

      // Update language
      setLanguage(selectedLanguage as 'en-US' | 'fr-FR');

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
            theme: selectedTheme as 'light' | 'dark',
            language: selectedLanguage as 'en-US' | 'fr-FR',
          },
        });
      }

      toast.success(t('settings.saved'));

      // Refresh to apply language change
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      toast.error(t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername || newUsername.trim() === '') {
      toast.error(t('settings.usernameRequired'));
      return;
    }

    if (newUsername === user?.username) {
      toast.error(t('settings.usernameUnchanged'));
      return;
    }

    setUsernameLoading(true);

    try {
      const response = await apiClient.updateUsername(newUsername);

      if (response.success !== true) {
        throw new Error(t('settings.usernameUpdateFailed'));
      }

      // Update user in store
      if (user) {
        updateUser({
          ...user,
          username: newUsername,
        });
      }

      toast.success(t('settings.usernameUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('settings.usernameUpdateFailed'));
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('settings.allFieldsRequired'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }

    setPasswordLoading(true);

    try {
      await apiClient.updatePassword(currentPassword, newPassword);

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success(t('settings.passwordUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('settings.passwordUpdateFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12">
      <div className="py-4 sm:py-6 mb-6 sm:mb-8">
        <div className="flex items-center space-x-5 sm:space-x-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Settings className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">{t('settings.title')}</h1>
        </div>
        <p className="text-gray-400 text-sm sm:text-lg">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-8">
        {/* Account Settings Section - Hide for Guest */}
        {user?.role !== 'guest' && (
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-4 mb-4 sm:mb-6">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">{t('settings.profile')}</h2>
                <p className="text-xs sm:text-sm text-gray-400">{t('settings.profileSubtitle')}</p>
              </div>
            </div>

            {/* Current User Info */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-5 bg-gray-700/30 rounded-xl border border-gray-600/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t('settings.currentUsername')}</p>
                  <p className="font-semibold text-white text-lg">{user?.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t('settings.email')}</p>
                  <p className="font-semibold text-white text-lg">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t('settings.role')}</p>
                  <p className="font-semibold text-white text-lg capitalize">{user?.role}</p>
                </div>
              </div>
            </div>

            {/* Username Change */}
            <div className="border-t border-gray-700/50 pt-4 sm:pt-6">
              <label htmlFor="username" className="block text-sm font-sm text-gray-300 mb-2 sm:mb-3">
                {t('settings.newUsername')}
              </label>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-700 transition-all duration-200"
                  placeholder={t('settings.newUsername')}
                  disabled={usernameLoading}
                />
                <Button
                  onClick={handleUsernameUpdate}
                  disabled={usernameLoading || newUsername === user?.username}
                  loading={usernameLoading}
                  className="whitespace-nowrap"
                >
                  {t('settings.updateUsername')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Section - Hide for Guest */}
        {user?.role !== 'guest' && (
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-4 mb-4 sm:mb-6">
              <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1.5 sm:mb-0.5">{t('settings.updatePassword')}</h2>
                <p className="text-xs sm:text-sm text-gray-400">{t('settings.updatePasswordSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <Input
                id="currentPassword"
                type="password"
                label={t('settings.currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('settings.currentPassword')}
                disabled={passwordLoading}
              />

              <Input
                id="newPassword"
                type="password"
                label={t('settings.newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('settings.newPassword')}
                disabled={passwordLoading}
              />

              <Input
                id="confirmPassword"
                type="password"
                label={t('settings.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('settings.confirmPassword')}
                disabled={passwordLoading}
              />

              <div className="flex justify-end pt-3 sm:pt-4">
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  loading={passwordLoading}
                >
                  {t('settings.updatePassword')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Theme Setting */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{t('settings.theme')}</h2>
            <p className="text-xs sm:text-sm text-gray-400">{t('settings.themeSubtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <OptionButton
              icon={<Sun className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${selectedTheme === 'light' ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />}
              label={t('settings.light')}
              isSelected={selectedTheme === 'light'}
              onClick={() => setSelectedTheme('light')}
            />
            <OptionButton
              icon={<Moon className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${selectedTheme === 'dark' ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />}
              label={t('settings.dark')}
              isSelected={selectedTheme === 'dark'}
              onClick={() => setSelectedTheme('dark')}
            />
          </div>
        </div>

        {/* Language Setting */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-xl">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{t('settings.language')}</h2>
            <p className="text-xs sm:text-sm text-gray-400">{t('settings.languageSubtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <OptionButton
              icon={<Globe className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${selectedLanguage === 'en-US' ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />}
              label={t('settings.english')}
              isSelected={selectedLanguage === 'en-US'}
              onClick={() => setSelectedLanguage('en-US')}
            />
            <OptionButton
              icon={<Globe className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${selectedLanguage === 'fr-FR' ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />}
              label={t('settings.french')}
              isSelected={selectedLanguage === 'fr-FR'}
              onClick={() => setSelectedLanguage('fr-FR')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            loading={loading}
            size="lg"
            className="font-semibold"
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
