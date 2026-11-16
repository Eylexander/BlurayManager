'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* A disc resting at the corner of the page, turning slowly */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18vmin] -bottom-[18vmin] w-[70vmin] aspect-square disc opacity-40 dark:opacity-25 motion-safe:animate-disc-slow"
      />
      <div className="relative max-w-md w-full animate-in">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt={t('common.appName')}
            width={960}
            height={960}
            className="dark:hidden w-[180px] lg:w-[220px] object-contain"
            priority
          />
          <Image
            src="/logo_dark.png"
            alt={t('common.appName')}
            width={960}
            height={960}
            className="hidden dark:block w-[180px] lg:w-[220px] object-contain"
            priority
          />
        </div>

        <div className="card border-t-4 border-t-primary p-6 sm:p-8 shadow-xl shadow-black/10">{children}</div>
      </div>
    </div>
  );
}
