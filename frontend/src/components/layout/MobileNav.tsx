'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { Home, BarChart3, Settings, Plus, Users, LogOut, Github, MoreHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink } from '@/components/common/NavLink';

export default function MobileNav() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  
  const canModify = user?.role === 'admin' || user?.role === 'moderator';
  const isGuest = user?.role === 'guest';

  const closeMenu = () => {
    setShowMenu(false);
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  return (
    <>
      {/* Backdrop with Blur */}
      {showMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-md z-[60] transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Slide-up Drawer */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-[70] transition-transform duration-300 cubic-bezier(0.32, 0.72, 0, 1) ${
          showMenu ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-6 mb-32 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden">
          <div className="p-8">
            {/* Header / User Profile */}
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <span className="text-lg font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{user?.username}</h3>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider">{user?.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <NavLink href="/dashboard" icon={Home} label="nav.home" onClick={closeMenu} />
              {!isGuest && (
                <>
                  <NavLink href="/dashboard/statistics" icon={BarChart3} label="nav.statistics" onClick={closeMenu} />
                  <NavLink href="/dashboard/settings" icon={Settings} label="nav.settings" onClick={closeMenu} />
                </>
              )}
              
              {user?.role === 'admin' && (
                <NavLink href="/dashboard/users" icon={Users} label="nav.users" onClick={closeMenu} />
              )}

              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('nav.logout')}</span>
              </button>
            </div>

            <div className="mt-1 flex justify-center">
              <a
                href="https://github.com/Eylexander/BlurayManager"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity"
              >
                <Github className="w-4 h-4" />
                <span className="text-[10px] font-medium tracking-tight">Eylexander © 2026</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Dock */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center items-center z-[80] pointer-events-none px-6">
        <nav className="pointer-events-auto flex items-center dark:bg-gray-900/90 bg-white/90 backdrop-blur-lg px-4 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 dark:border-black/10 gap-4">
          
          {/* Add Action (Only if permitted) */}
          {!isGuest && canModify && (
            <Link
              href="/dashboard/add"
              className="w-12 h-12 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all active:scale-90 shadow-lg shadow-blue-500/40"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </Link>
          )}

          {/* Vertical Divider (Only if Add button exists) */}
          {!isGuest && canModify && (
            <div className="w-[1px] h-6 dark:bg-white/20 bg-black/20" />
          )}

          {/* Menu Toggle */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all active:scale-95 ${
              showMenu ? 'text-blue-400' : 'dark:text-white text-gray-900'
            }`}
          >
            {showMenu ? (
              <X className="w-6 h-6 animate-in fade-in zoom-in duration-300" />
            ) : (
              <MoreHorizontal className="w-6 h-6" />
            )}
            <span className="text-sm font-bold pr-1">{showMenu ? 'Close' : 'Menu'}</span>
          </button>
        </nav>
      </div>
    </>
  );
}