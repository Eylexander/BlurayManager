'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { Home, BarChart3, Settings, Plus, Users, LogOut, Github } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: Home, label: 'nav.home', href: '/dashboard' },
  { icon: Plus, label: 'nav.add', href: '/dashboard/add', requiresPermission: true, special: true },
  { icon: BarChart3, label: 'nav.statistics', href: '/dashboard/statistics' },
  { icon: Settings, label: 'nav.settings', href: '/dashboard/settings' },
];

export default function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const canModify = user?.role === 'admin' || user?.role === 'moderator';
  const isGuest = user?.role === 'guest';

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  const getNavLayout = () => {
    let count = 2; 
    if (!isGuest) count += 2;
    if (canModify && !isGuest) count += 1;

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    };
  };

  return (
    <>
      {/* Backdrop */}
      {showMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Slide-up Menu */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-16 transition-transform duration-300 ease-out ${
          showMenu ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">

            {/* User Info */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</div>
              </div>
            </div>

            {/* Users Link (Admin Only) */}
            {user?.role === 'admin' && (
              <Link
                href="/dashboard/users"
                onClick={() => setShowMenu(false)}
                className={'flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}>
                <div className={'p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium flex-1">{t('nav.users')}</span>
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all active:scale-95"
            >
              <div className="p-2 rounded-lg bg-red-500/10">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium flex-1 text-left">{t('nav.logout')}</span>
            </button>

            {/* Credits */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <a
                href="https://github.com/Eylexander/BlurayManager"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Eylexander © 2026</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex items-center justify-between h-16 w-full">
          
          {/* Home */}
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              isActive('/dashboard') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t('nav.home')}</span>
          </Link>

          {/* Statistics */}
          {!isGuest && (
            <Link
              href="/dashboard/statistics"
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive('/dashboard/statistics') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('nav.statistics')}</span>
            </Link>
          )}

          {/* Add button */}
          {!isGuest && canModify && (
            <div className="flex-1 flex justify-center">
              <Link
                href="/dashboard/add"
                className="relative -top-1 flex items-center justify-center"
              >
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-3 shadow-lg shadow-blue-500/40 active:scale-90 transition-transform ">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </Link>
            </div>
          )}

          {/* Settings */}
          {!isGuest && (
            <Link
              href="/dashboard/settings"
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive('/dashboard/settings') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('nav.settings')}</span>
            </Link>
          )}

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              showMenu ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className="w-4 h-4 flex flex-col items-center justify-center gap-1">
              <div className={`w-5 h-0.5 rounded-full bg-current transition-all duration-200 ${showMenu ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-5 h-0.5 rounded-full bg-current transition-opacity duration-200 ${showMenu ? 'opacity-0' : 'opacity-100'}`} />
              <div className={`w-5 h-0.5 rounded-full bg-current transition-all duration-200 ${showMenu ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
