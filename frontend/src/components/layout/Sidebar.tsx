'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from 'next-themes';
import { Home, Film, Tv, BarChart3, Settings, Plus, Tag, LogOut, Users, Github, FileDown } from 'lucide-react';

export default function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const canModify = user?.role === 'admin' || user?.role === 'moderator';
  const isGuest = user?.role === 'guest';

  // Build menu items based on role
  const baseMenuItems = [
    { icon: Home, label: 'nav.home', href: '/dashboard' },
    ...(isGuest ? [] : [{ icon: BarChart3, label: 'nav.statistics', href: '/dashboard/statistics' }]),
    ...(isGuest ? [] : [{ icon: Settings, label: 'nav.settings', href: '/dashboard/settings' }]),
  ];

  const menuItems = isAdmin
    ? [
        ...baseMenuItems.slice(0, 2),
        { icon: FileDown, label: 'nav.importExport', href: '/dashboard/import-export' },
        baseMenuItems[2],
      ]
    : baseMenuItems;

  const isActive = (href: string) => {
    // For homepage, require exact match to avoid matching sub-pages
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    // For other pages, allow both exact match and sub-routes
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-850 border-r border-gray-200 dark:border-dark-700/50 overflow-y-auto">
      <nav className="p-6 h-full flex flex-col">
        <div className="space-y-4 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-white dark:bg-dark-800 border border-blue-200 dark:border-blue-900/50 shadow-md dark:shadow-lg dark:shadow-dark-950/30 text-gray-900 dark:text-white'
                : 'hover:bg-white dark:hover:bg-dark-800 border border-transparent hover:border-gray-200 dark:hover:border-dark-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-dark-950/20'
            }`}
          >
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 group-hover:from-blue-500/20 group-hover:to-blue-600/20'
            }`}>
              <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                isActive(item.href)
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
              }`} />
            </div>
            <span className={`font-medium flex-1 transition-colors duration-200 ${
              isActive(item.href) ? 'font-semibold' : ''
            }`}>
              {t(item.label)}
            </span>
            <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 transition-opacity duration-200 ${
              isActive(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}></div>
          </Link>
        ))}

        {/* Admin Only - Users Management */}
        {user?.role === 'admin' && (
          <Link
            href="/dashboard/users"
            className={`group flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-200 ${
              isActive('/dashboard/users')
                ? 'bg-white dark:bg-dark-800 border border-purple-200 dark:border-purple-900/50 shadow-md dark:shadow-lg dark:shadow-dark-950/30 text-gray-900 dark:text-white'
                : 'hover:bg-white dark:hover:bg-dark-800 border border-transparent hover:border-gray-200 dark:hover:border-dark-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-dark-950/20'
            }`}
          >
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              isActive('/dashboard/users')
                ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                : 'bg-gradient-to-br from-purple-500/10 to-purple-600/10 group-hover:from-purple-500/20 group-hover:to-purple-600/20'
            }`}>
              <Users className={`w-5 h-5 transition-colors duration-200 ${
                isActive('/dashboard/users')
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
              }`} />
            </div>
            <span className={`font-medium flex-1 transition-colors duration-200 ${
              isActive('/dashboard/users') ? 'font-semibold' : ''
            }`}>
              {t('nav.users')}
            </span>
            <div className={`w-1.5 h-1.5 rounded-full bg-purple-500 transition-opacity duration-200 ${
              isActive('/dashboard/users') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}></div>
          </Link>
        )}

        {canModify && (
          <Link
            href="/dashboard/add"
            className="group flex items-center space-x-3 px-4 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 mt-8 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-95"
          >
            <div className="p-2 rounded-lg bg-white/20 group-hover:bg-white/30 transition-all duration-200">
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </div>
            <span className="font-semibold flex-1">{t('nav.add')}</span>
          </Link>
        )}
        </div>

        {/* Bottom Section */}
        <div>
          <div className="border-t border-gray-200 dark:border-dark-700/50 mb-4 pt-4">
            <button
              onClick={logout}
              className="w-full group flex items-center space-x-3 px-4 py-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 text-red-600 dark:text-red-400 transition-all duration-200 hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-all duration-200">
                <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
              <span className="font-medium flex-1 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-200">
                {t('nav.logout')}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 transition-opacity duration-200 opacity-0 group-hover:opacity-100"></div>
            </button>
          </div>

          {/* Credits */}
          <div className="pb-4">
            <a
              href="https://github.com/Eylexander/BlurayManager"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Eylexander &copy; 2026</span>
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
}
