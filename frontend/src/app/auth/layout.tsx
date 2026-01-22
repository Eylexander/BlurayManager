'use client';

import { useTranslations } from 'next-intl';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎬</h1>
          <h2 className="text-3xl font-bold text-white mb-2">{useTranslations()('common.appName')}</h2>
        </div>

        <div className="card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}