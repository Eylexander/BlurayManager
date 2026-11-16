"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { Plus, LogOut } from "lucide-react";
import { ROUTES } from "@/hooks/useRouteProtection";
import { GithubIcon } from "@/components/common";
import { navLinksFor, isActiveLink, NavLink } from "./navLinks";

const SidebarItem = ({ href, icon: Icon, label }: NavLink) => {
  const t = useTranslations();
  const isActive = isActiveLink(href, usePathname());

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ${
        isActive
          ? "bg-primary/10 text-foreground font-bold"
          : "text-muted-foreground font-medium hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`} />
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{t(label)}</span>
    </Link>
  );
};

export default function Sidebar() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();
  const canModify = user?.role === "admin" || user?.role === "moderator";

  return (
    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-background/60 backdrop-blur-xl border-r border-border overflow-y-auto">
      <nav className="py-5 px-3 h-full flex flex-col">
        <div className="space-y-0.5 flex-1">
          {navLinksFor(user?.role).map((link) => (
            <SidebarItem key={link.href} {...link} />
          ))}

          {canModify && (
            <Link
              href={ROUTES.DASHBOARD.ADD.ADD}
              className="group mt-6! flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold key-edge [--glow:hsl(var(--primary)/0.65)] transition-[filter,transform,box-shadow] duration-150 hover:brightness-110"
            >
              <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              <span>{t("nav.add")}</span>
            </Link>
          )}
        </div>

        <div>
          <div className="border-t border-border mb-4 pt-4">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-input text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {t("nav.logout")}
            </button>
          </div>

          <a
            href="https://github.com/Eylexander/BlurayManager"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>Eylexander &copy; {new Date().getFullYear()}</span>
          </a>
        </div>
      </nav>
    </aside>
  );
}
