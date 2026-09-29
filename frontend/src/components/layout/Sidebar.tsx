"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import {
  Home,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Users,
  FileDown,
  TagIcon,
  LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/hooks/useRouteProtection";
import { GithubIcon } from "@/components/common";

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

const SidebarItem = ({ href, icon: Icon, label }: SidebarItemProps) => {
  const t = useTranslations();
  const pathname = usePathname();

  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 ${
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground font-medium hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{t(label)}</span>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
    </Link>
  );
};

export default function Sidebar() {
  const t = useTranslations();
  const { user, logout } = useAuthStore();

  const role = user?.role;
  const isAdmin = role === "admin";
  const isGuest = role === "guest";
  const canModify = role === "admin" || role === "moderator";

  // centralized Link Configuration
  const navLinks = [
    {
      href: ROUTES.DASHBOARD.HOME,
      label: "nav.home",
      icon: Home,
      show: true,
    },
    {
      href: ROUTES.DASHBOARD.STATISTICS,
      label: "nav.statistics",
      icon: BarChart3,
      show: !isGuest,
    },
    {
      href: ROUTES.DASHBOARD.SETTINGS,
      label: "nav.settings",
      icon: Settings,
      show: !isGuest,
    },
    {
      href: ROUTES.DASHBOARD.USERS,
      label: "nav.users",
      icon: Users,
      show: isAdmin,
    },
    {
      href: ROUTES.DASHBOARD.TAGS,
      label: "nav.tags",
      icon: TagIcon,
      show: isAdmin,
    },
    {
      href: ROUTES.DASHBOARD.IMPORT_EXPORT,
      label: "nav.importExport",
      icon: FileDown,
      show: isAdmin,
    },
  ];

  return (
    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-background border-r border-border overflow-y-auto">
      <nav className="p-4 h-full flex flex-col">
        {/* Main Navigation Links */}
        <div className="space-y-1 flex-1">
          {navLinks
            .filter((link) => link.show)
            .map((link) => (
              <SidebarItem key={link.href} {...link} />
            ))}

          {/* Add Button (Distinct Style) */}
          {canModify && (
            <Link
              href={ROUTES.DASHBOARD.ADD.ADD}
              className="group !mt-6 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 transition-colors duration-200 hover:bg-primary/90 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              <span>{t("nav.add")}</span>
            </Link>
          )}
        </div>

        {/* Bottom Section (Logout & Footer) */}
        <div>
          <div className="border-t border-border mb-4 pt-4">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {t("nav.logout")}
            </button>
          </div>

          <div className="pb-4">
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
        </div>
      </nav>
    </aside>
  );
}
