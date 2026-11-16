'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { Plus, LogOut, Menu, X } from 'lucide-react';
import { ROUTES } from '@/hooks/useRouteProtection';
import { GithubIcon } from '@/components/common';
import { navLinksFor, isActiveLink, NavLink } from './navLinks';

const MobileLink = ({ href, icon: Icon, label, onClick }: NavLink & { onClick: () => void }) => {
  const t = useTranslations();
  const active = isActiveLink(href, usePathname());

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-4 px-4 py-3.5 border-l-[3px] text-sm transition-colors active:bg-accent ${
        active ? 'border-primary text-foreground font-bold' : 'border-transparent text-muted-foreground font-medium'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
      {t(label)}
    </Link>
  );
};

export default function MobileNav() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const canModify = user?.role === 'admin' || user?.role === 'moderator';

  const closeMenu = () => setShowMenu(false);

  return (
    <>
      {showMenu && <div className="lg:hidden fixed inset-0 bg-black/60 z-60 animate-fade-in" onClick={closeMenu} />}

      {/* Slide-up sheet */}
      <div
        aria-hidden={!showMenu}
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-70 transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          showMenu ? 'translate-y-0' : 'translate-y-full invisible'
        }`}
      >
        <div className="mx-4 mb-28 bg-card rounded-lg shadow-2xl border border-border border-t-4 border-t-primary overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <div className="grid place-items-center w-11 h-11 rounded-md bg-brand text-white font-display text-2xl">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground leading-tight truncate">{user?.username}</h3>
              <p className="label-caps text-muted-foreground mt-0.5">{user?.role}</p>
            </div>
          </div>

          <div className="py-2">
            {navLinksFor(user?.role).map((link) => (
              <MobileLink key={link.href} {...link} onClick={closeMenu} />
            ))}
          </div>

          <div className="px-4 pb-4 pt-2 border-t border-border">
            <button
              onClick={() => {
                closeMenu();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-md border border-destructive/40 text-destructive text-sm font-semibold transition-colors active:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
            <a
              href="https://github.com/Eylexander/BlurayManager"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              Eylexander © {new Date().getFullYear()}
            </a>
          </div>
        </div>
      </div>

      {/* Floating dock, inverted like a remote control */}
      <div className="lg:hidden fixed bottom-5 left-0 right-0 flex justify-center z-80 pointer-events-none px-6 pb-[env(safe-area-inset-bottom)]">
        <nav className="pointer-events-auto flex items-stretch bg-foreground text-background rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
          {canModify && (
            <Link
              href={ROUTES.DASHBOARD.ADD.ADD}
              aria-label={t('nav.add')}
              className="grid place-items-center w-14 bg-primary text-primary-foreground transition-[filter] active:brightness-90"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </Link>
          )}

          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-expanded={showMenu}
            className="flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-opacity active:opacity-70"
          >
            {showMenu ? <X className="w-5 h-5 animate-in" /> : <Menu className="w-5 h-5" />}
            {showMenu ? t('common.close') : t('common.menu')}
          </button>
        </nav>
      </div>
    </>
  );
}
