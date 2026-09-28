'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Rendered unconditionally: next-themes is SSR-safe (the root <html> carries
// suppressHydrationWarning). Mounting it only after hydration would swap the
// tree's root element and remount every page on first load.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
