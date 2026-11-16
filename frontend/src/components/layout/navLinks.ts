import { Home, BarChart3, Settings, Users, FileDown, TagIcon, LucideIcon } from "lucide-react";
import { ROUTES } from "@/hooks/useRouteProtection";

export interface NavLink {
  href: string;
  /** Translation key */
  label: string;
  icon: LucideIcon;
}

/** The pages a role can open, shared by the sidebar and the mobile menu. */
export function navLinksFor(role?: string): NavLink[] {
  const isAdmin = role === "admin";
  const isGuest = role === "guest";

  return [
    { href: ROUTES.DASHBOARD.HOME, label: "nav.home", icon: Home, show: true },
    { href: ROUTES.DASHBOARD.STATISTICS, label: "nav.statistics", icon: BarChart3, show: !isGuest },
    { href: ROUTES.DASHBOARD.SETTINGS, label: "nav.settings", icon: Settings, show: !isGuest },
    { href: ROUTES.DASHBOARD.USERS, label: "nav.users", icon: Users, show: isAdmin },
    { href: ROUTES.DASHBOARD.TAGS, label: "nav.tags", icon: TagIcon, show: isAdmin },
    { href: ROUTES.DASHBOARD.IMPORT_EXPORT, label: "nav.importExport", icon: FileDown, show: isAdmin },
  ].filter((link) => link.show);
}

/** Home only matches exactly; the others also match their sub-pages. */
export const isActiveLink = (href: string, pathname: string) =>
  href === ROUTES.DASHBOARD.HOME ? pathname === href : pathname.startsWith(href);
