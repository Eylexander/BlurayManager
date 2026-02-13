import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bluray.eylexander.xyz"),
  title: {
    default: "Bluray Manager",
    template: "%s | Bluray Manager",
  },
  description: "Personal Bluray collection manager - Organize, track, and manage your physical media library",
  openGraph: {
    title: "Bluray Manager",
    description: "Personal Bluray collection manager - Organize, track, and manage your physical media library",
    url: "https://bluray.eylexander.xyz",
    siteName: "Bluray Manager",
    images: [
      {
        url: "/og.png",
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
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <ToasterProvider />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
