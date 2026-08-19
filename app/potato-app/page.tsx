/**
 * Potato Snaps — public app download page.
 *
 * Route: https://montree.xyz/potato-app  (PUBLIC — no login, no session)
 *
 * The one URL we hand out: pinned in the staff room, pasted into a chat, and
 * encoded in the QR below. It answers exactly one question — "how do I get the
 * app on this phone?" — for three audiences at once: Android (download the
 * APK), iPhone (Add to Home Screen), and anyone who opened the link inside
 * WeChat, whose browser blocks the APK.
 *
 * It sits at the TOP level rather than under /potato/**, deliberately: it is
 * handout collateral, and the shorter the URL the better. middleware.ts's
 * `publicPaths` carries '/potato-app' so the legacy Supabase gate doesn't
 * bounce anonymous visitors to '/'.
 *
 * 🚨 THE STYLESHEET IS INJECTED HERE, not inherited. app/potato/layout.tsx
 * injects POTATO_CSS for everything under /potato; this page lives outside
 * that segment, so it does the same job itself — same constant, same
 * <style dangerouslySetInnerHTML> (never <style jsx>: Turbopack rejects a
 * styled-jsx tag that is not the direct child of the outermost element, and
 * that rule has cost this repo twelve failed deploys).
 *
 * Server component. Only the platform-dependent parts (UA detection, the
 * WeChat overlay, the version fetch) are client — see PotatoAppDownloadClient.
 *
 * English throughout, like the rest of app/potato: the audience is the four
 * teachers, and no i18n import means the strict 12-locale pre-commit gate
 * stays dormant for this commit.
 */

import type { Metadata, Viewport } from 'next';

import { POTATO_CSS, POTATO_FONTS_HREF } from '@/lib/potato/ui';
import { Mascot } from '@/components/potato/PotatoBits';
import PotatoAppQr from '@/components/potato/PotatoAppQr';
import PotatoAppDownloadClient from '@/components/potato/PotatoAppDownloadClient';

export const metadata: Metadata = {
  title: 'Get Potato Snaps',
  description:
    'Download the Potato Snaps camera app for Android, or add the teacher web app to your iPhone Home Screen.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFDF6',
};

export default function PotatoAppDownloadPage() {
  return (
    <>
      {/* React hoists these into <head>. The font stack in POTATO_CSS falls
          back to rounded system faces, so a blocked Google Fonts request
          degrades gracefully rather than breaking the layout. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={POTATO_FONTS_HREF} />
      <style dangerouslySetInnerHTML={{ __html: POTATO_CSS }} />

      <div className="pt-root">
        <main
          style={{
            minHeight: '100dvh',
            background: 'var(--pt-cream)',
            padding: `calc(28px + env(safe-area-inset-top)) 18px calc(44px + env(safe-area-inset-bottom))`,
          }}
        >
          <div style={{ margin: '0 auto', width: '100%', maxWidth: 460 }}>
            {/* ---- 1. brand lockup + pitch ------------------------------- */}
            <header style={{ textAlign: 'center' }}>
              <div className="pt-halo" style={{ margin: '0 auto' }}>
                <Mascot size={140} shadow={false} />
              </div>
              <h1 className="pt-wordmark">Potato Snaps</h1>
              <div className="pt-wordrule" />
              <p className="pt-logintag" style={{ margin: '12px 0 0' }}>
                {'Little films of your child’s week — snapped, sorted, sent.'}
              </p>
            </header>

            {/* ---- 2. platform cards (Android / iPhone / WeChat overlay) -- */}
            <PotatoAppDownloadClient />

            {/* ---- 3. QR of this page, for the staff room wall ----------- */}
            <section
              aria-labelledby="pt-qr-heading"
              style={{
                marginTop: 14,
                padding: '22px 18px',
                textAlign: 'center',
                background: 'var(--pt-paper)',
                border: '1.5px solid var(--pt-sand-line)',
                borderRadius: 'var(--pt-r-card)',
                boxShadow: 'var(--pt-sh-card)',
              }}
            >
              <h2
                id="pt-qr-heading"
                style={{ fontFamily: 'var(--pt-disp)', fontWeight: 800, fontSize: 17, margin: 0 }}
              >
                Share this page
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--pt-ink-50)' }}>
                Scan it, or screenshot it for the next teacher
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  marginTop: 16,
                  padding: 10,
                  background: 'var(--pt-sand)',
                  borderRadius: 'var(--pt-r-tile)',
                }}
              >
                <PotatoAppQr size={150} />
              </div>

              <p style={{ margin: '14px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--pt-ink-35)' }}>
                montree.xyz/potato-app
              </p>
            </section>

            <div className="pt-byline" style={{ marginTop: 22 }}>
              Teacher Potato
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
