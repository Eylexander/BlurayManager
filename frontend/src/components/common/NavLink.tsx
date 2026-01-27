import { useTranslations } from "next-intl";
import { usePathname } from "next/dist/client/components/navigation";
import Link from "next/link";

export function NavLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: any;
  label: string;
  onClick?: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-95 ${isActive(href)
          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      onClick={onClick}
    >
      <Icon className={`w-5 h-5 ${isActive(href) ? 'text-blue-600' : 'text-gray-500'}`} />
      <span className="font-semibold text-sm">{t(label)}</span>
    </Link>
  );
}