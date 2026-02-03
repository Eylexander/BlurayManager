'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { Home, BarChart3, Settings, Plus, Users, LogOut, Github, MoreHorizontal, X, TagIcon, FileDown, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ROUTES } from '@/hooks/useRouteProtection';

interface MobileLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

const MobileLink = ({ href, icon: Icon, label, onClick }: MobileLinkProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  
  // Strict check for home, partial check for sub-routes
  const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
  
  const baseStyles = "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-95";
  const activeStyles = "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
  const idleStyles = "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${baseStyles} ${active ? activeStyles : idleStyles}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
      <span className="font-semibold text-sm">{t(label)}</span>
    </Link>
  );
};

export default function MobileNav() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  
  const role = user?.role;
  const isAdmin = role === 'admin';
  const canModify = role === 'admin' || role === 'moderator';
  const isGuest = role === 'guest';

  const closeMenu = () => setShowMenu(false);

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  // Centralized Link Configuration
  const navLinks = [
    { 
      href: ROUTES.DASHBOARD.HOME, 
      label: 'nav.home', 
      icon: Home, 
      show: true 
    },
    { 
      href: ROUTES.DASHBOARD.STATISTICS, 
      label: 'nav.statistics', 
      icon: BarChart3, 
      show: !isGuest 
    },
    { 
      href: ROUTES.DASHBOARD.SETTINGS, 
      label: 'nav.settings', 
      icon: Settings, 
      show: !isGuest 
    },
    { 
      href: ROUTES.DASHBOARD.USERS, 
      label: 'nav.users', 
      icon: Users, 
      show: isAdmin 
    },
    { 
      href: ROUTES.DASHBOARD.TAGS, 
      label: 'nav.tags', 
      icon: TagIcon, 
      show: isAdmin 
    },
    { 
      href: ROUTES.DASHBOARD.IMPORT_EXPORT, 
      label: 'nav.importExport', 
      icon: FileDown, 
      show: isAdmin 
    },
  ];

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
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider">{role}</p>
              </div>
            </div>

            {/* Navigation Links Grid */}
            <div className="grid grid-cols-1 gap-2">
              {navLinks
                .filter(link => link.show)
                .map((link) => (
                  <MobileLink 
                    key={link.href}
                    {...link}
                    onClick={closeMenu}
                  />
                ))}

              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('nav.logout')}</span>
              </button>
            </div>

            {/* Footer */}
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
            <span className="text-sm font-bold pr-1">
              {showMenu ? t("common.close") : t("common.menu")}
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}