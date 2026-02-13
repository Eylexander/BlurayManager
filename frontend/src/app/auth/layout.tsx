'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-200 to-gray-300 dark:from-primary-900 dark:via-dark-900 dark:to-dark-950 px-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt={useTranslations()('common.appName')}
            width={240}
            height={240}
            className="dark:hidden w-[180px] lg:w-[240px] object-contain"
            priority
          />
          <Image
            src="/logo_dark.png"
            alt={useTranslations()('common.appName')}
            width={240}
            height={240}
            className="hidden dark:block w-[180px] lg:w-[240px] object-contain"
            priority
          />
        </div>

        <div className="card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}