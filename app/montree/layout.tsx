// /montree/layout.tsx — Session 158
// Montree PWA layout with manifest for "Add to Home Screen"
// Enhanced metadata for SEO + bilingual i18n provider
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import I18nClientWrapper from "@/components/montree/I18nClientWrapper";
import VisitorTracker from "@/components/montree/VisitorTracker";
import WebVitalsReporter from "@/components/montree/WebVitalsReporter";
// Mobile-style privacy lock. Self-mounts on every /montree/* route but
// internally gates on pathname — only sensitive surfaces (admin, dashboard,
// agent, super-admin, parent/*) actually trigger the lock overlay. Public
// pages (landing, library, login) opt out. The component itself is
// 'use client' and renders null until its visibilitychange listener fires,
// so the SSR output is empty. Next.js 16 forbids `dynamic({ ssr: false })`
// in Server Components, but a direct import of a client component is fine.
import AppLockOverlay from "@/components/montree/AppLockOverlay";
// Floating connectivity-status pill — appears top-of-screen when offline,
// briefly confirms 'Back online' when connectivity returns. Pointer-events
// none, so it never blocks interaction. Self-gates pathname.
import OnlineStatusBanner from "@/components/montree/OnlineStatusBanner";
import { isValidLocale, DEFAULT_LOCALE, type Locale } from "@/lib/montree/i18n/locales";

export const metadata: Metadata = {
  title: {
    default: "Montree — Montessori Classroom Management",
    template: "%s | Montree",
  },
  description:
    "Montessori classroom management platform for teachers and schools. Track progress, manage students, generate reports, and share with parents.",
  manifest: "/montree-manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Montree",
  },
  openGraph: {
    title: "Montree — Montessori Classroom Management",
    description:
      "Montessori classroom management platform for teachers and schools. Track progress, manage students, generate reports, and share with parents.",
    url: "https://montree.xyz/montree",
    siteName: "Montree",
    images: [
      {
        url: "https://montree.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Montree — Montessori Classroom Management Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Montree — Montessori Classroom Management",
    description:
      "Montessori classroom management platform for teachers and schools. Track progress and share with parents.",
    images: ["https://montree.xyz/og-image.png"],
  },
  alternates: {
    canonical: "https://montree.xyz/montree",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981",
};

// Server-side locale file loaders. Each `import()` call is a separate code-
// split chunk that Node loads only when needed. For non-en initial locales,
// we await one of these and pass the message data to the client provider —
// no English flash, no extra round trip. See PERF_HEALTH_CHECK.md Tier 1.4.
async function loadServerLocale(locale: Locale): Promise<Record<string, string> | undefined> {
  switch (locale) {
    case 'en': return undefined; // en is already in the client bundle
    case 'zh': return (await import('@/lib/montree/i18n/zh')).zh;
    case 'es': return (await import('@/lib/montree/i18n/es')).es;
    case 'de': return (await import('@/lib/montree/i18n/de')).de;
    case 'fr': return (await import('@/lib/montree/i18n/fr')).fr;
    case 'pt': return (await import('@/lib/montree/i18n/pt')).pt;
    case 'nl': return (await import('@/lib/montree/i18n/nl')).nl;
    case 'it': return (await import('@/lib/montree/i18n/it')).it;
    case 'ja': return (await import('@/lib/montree/i18n/ja')).ja;
    case 'ko': return (await import('@/lib/montree/i18n/ko')).ko;
    case 'uk': return (await import('@/lib/montree/i18n/uk')).uk;
    case 'ru': return (await import('@/lib/montree/i18n/ru')).ru;
    default: return undefined;
  }
}

export default async function MontreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the mt_locale cookie server-side so the client provider starts with
  // the right locale on first paint. Saves ~700KB of locale data per session
  // (only en + the user's locale ship, not all 12) and eliminates the
  // English-flash that would otherwise happen for non-en users on cold load.
  // See PERF_HEALTH_CHECK.md Tier 1.4.
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get('mt_locale')?.value;
  const initialLocale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  // For non-en users we also load the locale data here so the provider seeds
  // the cache before render. en is already statically imported on the client.
  const initialMessages = await loadServerLocale(initialLocale);

  return (
    <I18nClientWrapper initialLocale={initialLocale} initialMessages={initialMessages}>
      <VisitorTracker />
      <WebVitalsReporter />
      <AppLockOverlay />
      <OnlineStatusBanner />
      {children}
    </I18nClientWrapper>
  );
}
