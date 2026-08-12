// app/cms/layout.tsx
// THE CMS BRAND SURFACE BOUNDARY.
//
// CMS ("Harbor") is a protected brand inside the Montree repo, the same way PSS
// (`pt-*`, app/potato/**) and Montree Home are. Everything under /cms/** is
// light-first Harbor blue; nothing from the dark-forest surface may bleed in and
// nothing here may leak out. This one layout owns all three of the things that
// make that true:
//
//   1. THE THEME. `.cms-root` is the scope for every Harbor rule in
//      app/globals.css (see "CMS BUTTON SYSTEM — SOFT ELEVATION / HARBOR").
//      Montree's `body` paints #f8fafc dark-forest-adjacent chrome; the CMS root
//      repaints the Harbor canvas over it, full-height, and re-declares type.
//   2. THE FONTS. Source Serif 4 (headings) + Inter (body) + Noto Sans Arabic
//      (the RTL locale), loaded through next/font exactly the way the root layout
//      at app/layout.tsx loads Inter/Lora/Newsreader/Hanken — build-time
//      self-hosted, no render-blocking @import. They are exposed under CMS-only
//      variable names (--font-cms-*) so the root layout's --font-inter, which the
//      whole rest of the repo paints with, is never shadowed or disturbed.
//   3. THE SHELL. The Harbor AppShell (header + layer badge + nav + footer).
//      The skeleton did this with three route-group layouts; nesting under
//      app/cms/ means one layout, which derives the layer from the request path
//      via the `x-pathname` header that middleware.ts already sets for exactly
//      this purpose ("Create response with pathname header for layouts to read").
//      /cms itself is the landing page and carries its own header, so it renders
//      bare.
//
// `lang`/`dir` are set on the CMS root div rather than <html>, because <html>
// belongs to the root layout and is shared with every other brand. The Harbor
// CSS keys its Arabic rules off `.cms-root[lang='ar']` for the same reason.

import { headers } from 'next/headers';
import { Inter, Noto_Sans_Arabic, Source_Serif_4 } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { AppShell, type Layer } from '@/components/cms/AppShell';
import { dirFor } from '@/lib/cms/i18n/config';
import { I18nProvider } from '@/lib/cms/i18n/provider';
import { getServerT } from '@/lib/cms/i18n/server';

const cmsSerif = Source_Serif_4({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '600', '700'],
  variable: '--font-cms-head',
  display: 'swap',
});

const cmsSans = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cms-body',
  display: 'swap',
});

const cmsArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-cms-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CMS — Classroom Management System',
    template: '%s | CMS',
  },
  description:
    'Parent in, engine, teacher out. Every child accounted for, every day.',
};

export const viewport: Viewport = {
  themeColor: '#336FAF',
};

/**
 * Which end of the hourglass this request is standing in. Derived from the path,
 * never guessed: the landing page (/cms) returns null and renders without the
 * shell, because it is its own front door.
 */
function layerFor(pathname: string): Layer | null {
  // 🚨 PHASE 5 — A PRINT SURFACE WEARS NO CHROME. `/cms/teacher/documents/<doc>`
  // is a piece of PAPER: it renders its own screen-only Harbor toolbar and an
  // A4 sheet, and the AppShell's sticky header, nav and footer would print with
  // it. Hiding them with `@media print` from inside the page would mean a page
  // reaching up to restyle its own layout — so the layout decides instead, the
  // same way `/cms` (the landing page, its own front door) already does. The
  // route is still GATED: the role check lives in middleware.ts, not here.
  if (/^\/cms\/teacher\/documents\/[^/]+/.test(pathname)) return null;
  if (pathname.startsWith('/cms/parent')) return 'parent';
  if (pathname.startsWith('/cms/teacher')) return 'teacher';
  if (pathname.startsWith('/cms/org')) return 'org';
  return null;
}

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ locale }, h] = await Promise.all([getServerT(), headers()]);

  // middleware.ts sets x-pathname on every page request. If it is ever absent
  // (a direct render outside the middleware matcher), we fall back to the bare
  // surface rather than guessing a layer and showing the wrong nav.
  const pathname = h.get('x-pathname') ?? '';
  const layer = layerFor(pathname);

  const fontVars = `${cmsSerif.variable} ${cmsSans.variable} ${cmsArabic.variable}`;

  return (
    <div
      className={`cms-root ${fontVars}`}
      lang={locale}
      dir={dirFor(locale)}
      data-cms-brand="harbor"
    >
      <I18nProvider locale={locale}>
        {layer ? (
          <AppShell layer={layer} active={pathname}>
            {children}
          </AppShell>
        ) : (
          children
        )}
      </I18nProvider>
    </div>
  );
}
