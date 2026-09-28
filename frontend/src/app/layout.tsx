import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#14161b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bluray.eylexander.xyz"),
  title: {
    default: "Bluray Manager",
    template: "%s | Bluray Manager",
  },
  description: "Personal Bluray collection manager - Organize, track, and manage your physical media library",
  applicationName: "Bluray Manager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bluray Manager",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Bluray Manager",
    description: "Personal Bluray collection manager - Organize, track, and manage your physical media library",
    url: "https://bluray.eylexander.xyz",
    siteName: "Bluray Manager",
    images: [
      {
        url: "/logo_dark.png",
        width: 1920,
        height: 1080,
      },
    ],
    locale: "en-US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: "Bluray Manager",
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192x192.png",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            {children}
            <ToasterProvider />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
