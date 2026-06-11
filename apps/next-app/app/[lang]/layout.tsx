import type { Metadata, Viewport } from "next";

import "../globals.css";
import { i18n } from '../i18n-config';
import { use } from 'react';
import { translations } from "@libs/i18n";
import { SharedAppWrapper } from "@/components/shared-app-wrapper";

const DEFAULT_APP_URL = "https://pixal3d.net";
const ICON_VERSION = "20260531";

function getAppUrl() {
  return (process.env.APP_BASE_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}

export async function generateViewport({ params }: { params: Promise<{ lang: string }> }): Promise<Viewport> {
  return {
    themeColor: '#3b82f6',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];
  const appUrl = getAppUrl();
  
  return {
    metadataBase: new URL(appUrl),
    title: t.home.metadata.title,
    description: t.home.metadata.description,
    keywords: t.home.metadata.keywords,
    icons: {
      icon: [
        { url: `/favicon.ico?v=${ICON_VERSION}`, type: "image/x-icon" },
        { url: `/favicon-16x16.png?v=${ICON_VERSION}`, sizes: "16x16", type: "image/png" },
        { url: `/favicon-32x32.png?v=${ICON_VERSION}`, sizes: "32x32", type: "image/png" },
      ],
      shortcut: [`/favicon.ico?v=${ICON_VERSION}`],
      apple: [
        { url: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png" },
      ],
      other: [
        { rel: "mask-icon", url: "/logo.svg", color: "#3b82f6" },
        { rel: "icon", url: `/android-chrome-192x192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
        { rel: "icon", url: `/android-chrome-512x512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
      ],
    },
    manifest: `/site.webmanifest?v=${ICON_VERSION}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: t.home.metadata.title,
    },
    other: {
      'msapplication-TileColor': '#3b82f6',
      'msapplication-TileImage': '/mstile-150x150.png',
      'msapplication-config': 'none',
    },
    openGraph: {
      type: 'website',
      locale: lang,
      url: appUrl,
      siteName: 'Pixal3D',
      title: t.home.metadata.title,
      description: t.home.metadata.description,
      images: [
        {
          url: `/android-chrome-512x512.png?v=${ICON_VERSION}`,
          width: 512,
          height: 512,
          alt: t.home.metadata.title,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: t.home.metadata.title,
      description: t.home.metadata.description,
      images: [`/android-chrome-512x512.png?v=${ICON_VERSION}`],
    },
  };
}

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const t = translations[lang as keyof typeof translations];
  const appUrl = getAppUrl();
  const webApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pixal3D",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: appUrl,
    description: t.home.metadata.description,
    "isBasedOn": {
      "@type": "SoftwareSourceCode",
      name: "Pixal3D",
      url: "https://github.com/TencentARC/Pixal3D",
      license: "https://github.com/TencentARC/Pixal3D/blob/main/LICENSE",
    },
  };
  
  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd) }}
        />
        <SharedAppWrapper>
          {children}
        </SharedAppWrapper>
      </body>
    </html>
  );
} 
