'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* Soft brand glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-3xl"
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

        <div className="card p-6 sm:p-8 shadow-lg shadow-black/5">
          {children}
        </div>
      </div>
    </div>
  );
}
