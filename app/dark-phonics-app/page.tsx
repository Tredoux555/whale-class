/**
 * Dark Phonics Live — public app download page.
 *
 * Route: https://montree.xyz/dark-phonics-app  (PUBLIC — no login, no session)
 *
 * This is the one URL we hand out: printed on posters, pasted into WeChat, and
 * encoded in the QR below. It answers exactly one question — "how do I get the
 * app on this phone?" — and it has to answer it for three audiences at once:
 * Android (download the APK), iPhone (install the web app to the Home Screen),
 * and anyone who opened the link inside WeChat (whose browser blocks the APK).
 *
 * It sits at the TOP level, not under /montree/**, deliberately: it is
 * marketing collateral for people who do not have an account yet, and the
 * shorter the URL on a poster the better. middleware.ts's `publicPaths` list
 * carries '/dark-phonics-app' so the legacy Supabase gate doesn't bounce
 * anonymous visitors to '/'.
 *
 * Server component. Only the platform-dependent parts (UA detection, the
 * WeChat overlay, the version fetch) are client — see DownloadAppClient.
 *
 * Bilingual, Chinese first: the audience is Chinese parents; English rides
 * along as a subtitle rather than as the primary voice.
 */

import type { Metadata } from 'next';

import '@/styles/dark-phonics-live-tokens.css';

import DarkPhonicsAppQr from '@/components/montree/dark-phonics-live/portal/DarkPhonicsAppQr';
import DownloadAppClient from '@/components/montree/dark-phonics-live/portal/DownloadAppClient';

export const metadata: Metadata = {
  title: 'Dark Phonics Live 下载 | 在线自然拼读课',
  description:
    '下载 Dark Phonics Live 安卓 App，或把家长端添加到 iPhone 主屏幕。一对一 25 分钟在线自然拼读课。',
};

/** Static brand mark — the same five-bar equalizer as the live classroom, frozen. */
function EqualizerMark() {
  const bars = [9, 17, 22, 13, 19];
  return (
    <span
      className="flex h-[46px] w-[46px] flex-none items-end justify-center rounded-[var(--dpl-r-sm)] border border-[var(--dpl-mark-line)] bg-[var(--dpl-mark-bg)] px-2 py-[10px]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 26 22" preserveAspectRatio="none" className="h-full w-full">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 5.2}
            y={22 - h}
            width={4}
            height={h}
            rx={1.6}
            fill={i % 2 === 1 ? 'var(--dpl-accent2)' : 'var(--dpl-accent)'}
          />
        ))}
      </svg>
    </span>
  );
}

export default function DarkPhonicsAppDownloadPage() {
  return (
    <main className="min-h-screen bg-[var(--dpl-bg)] font-[var(--dpl-font-body)] text-[var(--dpl-ink)]">
      {/* Ambient violet glow, same trick as the classroom chrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-[var(--dpl-glow-op)]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, var(--dpl-glow-1) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-lg px-5 pb-20 pt-12">
        {/* ---- 1. brand lockup + pitch ------------------------------------ */}
        <header>
          <div className="flex items-center gap-3">
            <EqualizerMark />
            <span className="font-[var(--dpl-font-display)] text-[15px] font-semibold uppercase tracking-[var(--dpl-brand-ls)] text-[var(--dpl-ink)]">
              Dark Phonics Live
            </span>
          </div>

          <h1 className="mt-6 font-[var(--dpl-font-display)] text-[34px] font-semibold leading-tight text-[var(--dpl-ink)]">
            在线自然拼读课
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--dpl-ink2)]">
            一对一 25 分钟真人直播，49 节课带孩子学会自己拼读。
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--dpl-ink3)]">
            Live one-to-one phonics, 25 minutes a class — 49 lessons to reading on their own.
          </p>
        </header>

        {/* ---- 2-5. platform cards (Android / iPhone / install note) ------- */}
        <DownloadAppClient />

        {/* ---- 6. QR of this page, for posters + WeChat sharing ----------- */}
        <section
          aria-labelledby="dpl-qr-heading"
          className="mt-5 rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-6 text-center"
        >
          <h2
            id="dpl-qr-heading"
            className="font-[var(--dpl-font-display)] text-[17px] font-semibold text-[var(--dpl-ink)]"
          >
            分享这个页面
          </h2>
          <p className="mt-1 text-[12px] text-[var(--dpl-ink3)]">Share this page</p>

          <div className="mt-4 inline-flex rounded-[var(--dpl-r-md)] bg-[var(--dpl-slide-bg)] p-3">
            <DarkPhonicsAppQr size={148} />
          </div>

          <p className="mt-4 text-[13px] text-[var(--dpl-ink2)]">
            长按识别二维码，或截图发给其他家长。
          </p>
          <p className="mt-1 text-[12px] text-[var(--dpl-ink3)]">
            Scan or screenshot it for other parents.
          </p>
          <p className="mt-3 text-[12px] text-[var(--dpl-ink3)]">montree.xyz/dark-phonics-app</p>
        </section>
      </div>
    </main>
  );
}
