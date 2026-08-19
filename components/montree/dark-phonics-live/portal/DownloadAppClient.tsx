'use client';

/**
 * DownloadAppClient — the platform-aware half of /dark-phonics-app.
 *
 * The page around it is a server component; everything that needs to know WHO
 * is looking lives here:
 *
 *   1. WeChat's in-app browser (userAgent contains `MicroMessenger`) silently
 *      refuses .apk downloads. Nothing we can do in-page fixes that, so we show
 *      the standard China pattern instead: a full-screen overlay with an arrow
 *      at the top-right corner and "请点击右上角 ··· 选择「在浏览器打开」".
 *      Dismissible — a parent who only wants the iPhone instructions shouldn't
 *      be trapped behind it.
 *   2. iOS has no APK. iPhone users get the Add-to-Home-Screen (PWA) route to
 *      the existing parent portal, promoted to the top when we detect iOS.
 *   3. The version line is fetched from the public app-version endpoint. That
 *      endpoint and the APK ship together, so before the first release it may
 *      404 — that is expected and must degrade quietly, never as an error.
 *
 * HYDRATION: every UA-derived value starts as null and is filled in an effect,
 * so the server HTML and the first client render are identical.
 */

import { useEffect, useState } from 'react';

/** Where the APK is served from. Committed by the release job, may 404 before then. */
const APK_PATH = '/downloads/dark-phonics-live.apk';
const VERSION_ENDPOINT = '/api/montree/dark-phonics-live/app-version';
/** The installable web app iPhone users are pointed at. */
const PARENT_PORTAL_URL = 'https://montree.xyz/montree/parent/online-classes';

interface AndroidRelease {
  version?: string;
  versionCode?: number;
  url?: string;
  notes?: string;
  /** Forward-compatible slot: the endpoint does not send this yet, so the UI
   *  falls back to a placeholder rather than inventing a number. */
  sizeLabel?: string;
}

type Platform = 'android' | 'ios' | 'other';

interface Ua {
  platform: Platform;
  isWeChat: boolean;
}

function readUserAgent(): Ua {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const isWeChat = /MicroMessenger/i.test(ua);
  // iPadOS 13+ reports a desktop Safari UA, so also treat a touch-capable Mac
  // as iOS — those users need the Add-to-Home-Screen route, not an APK.
  const isIos =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const platform: Platform = /Android/i.test(ua) ? 'android' : isIos ? 'ios' : 'other';
  return { platform, isWeChat };
}

/* -------------------------------------------------------------------------- */
/* Glyphs                                                                     */
/* -------------------------------------------------------------------------- */

/** iOS share sheet glyph — the exact icon a parent taps in Safari's toolbar. */
function ShareIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* box */}
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
      {/* arrow out of the box */}
      <path d="M12 15V3" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
    </svg>
  );
}

/** Downward arrow for the primary APK button. */
function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v13" />
      <path d="m6.5 11.5 5.5 5.5 5.5-5.5" />
      <path d="M4 20h16" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* WeChat overlay                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The universal China pattern: a translucent full-screen sheet with a curved
 * arrow aimed at WeChat's own ··· menu in the top-right corner, because that
 * menu is the ONLY way out of the in-app browser (which blocks .apk).
 */
function WeChatOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="请在浏览器中打开 Open in browser"
      className="fixed inset-0 z-50 flex flex-col items-end bg-black/85 p-5 backdrop-blur-sm"
    >
      {/* Arrow: starts under the ··· and curves up to point at it. */}
      <svg
        viewBox="0 0 120 150"
        className="mr-2 h-[150px] w-[120px] flex-none text-[var(--dpl-accent2)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 145C20 95 40 45 104 16" />
        <path d="M78 16h26v26" />
      </svg>

      <div className="w-full max-w-md self-center text-center">
        <p className="font-[var(--dpl-font-display)] text-[22px] font-semibold leading-snug text-[var(--dpl-ink)]">
          请点击右上角 <span className="tracking-[0.2em]">···</span>
          <br />
          选择「在浏览器打开」
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--dpl-ink2)]">
          Tap the ··· menu at the top right, then “Open in Browser”.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--dpl-ink3)]">
          微信内置浏览器不支持下载安装包。
          <br />
          WeChat’s built-in browser can’t download the app file.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-7 rounded-[var(--dpl-r-pill)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-6 py-3 text-[14px] text-[var(--dpl-ink2)]"
        >
          我知道了 Got it
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function DownloadAppClient() {
  const [ua, setUa] = useState<Ua | null>(null);
  const [wechatDismissed, setWechatDismissed] = useState(false);
  const [release, setRelease] = useState<AndroidRelease | null>(null);
  /** null = still asking, true = endpoint answered, false = 404/offline. */
  const [releaseOk, setReleaseOk] = useState<boolean | null>(null);

  useEffect(() => {
    setUa(readUserAgent());
  }, []);

  useEffect(() => {
    let cancelled = false;
    // A 404 here is the EXPECTED state before the first APK release — swallow
    // every failure and fall back to the placeholder line.
    fetch(VERSION_ENDPOINT, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { android?: AndroidRelease }) => {
        if (cancelled) return;
        setRelease(body?.android ?? null);
        setReleaseOk(Boolean(body?.android?.version));
      })
      .catch(() => {
        if (!cancelled) setReleaseOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showWeChat = ua?.isWeChat === true && !wechatDismissed;
  const isIos = ua?.platform === 'ios';

  const versionLine =
    releaseOk && release?.version
      ? `版本 ${release.version} · ${release.sizeLabel ?? '安装包约 —— MB'}`
      : '版本信息稍后更新';
  const versionLineEn =
    releaseOk && release?.version
      ? `Version ${release.version} · Android APK`
      : 'Version details coming soon · Android APK';

  const androidCard = (
    <section
      aria-labelledby="dpl-android-heading"
      className="rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-6 shadow-[var(--dpl-shadow)]"
    >
      <h2
        id="dpl-android-heading"
        className="font-[var(--dpl-font-display)] text-[20px] font-semibold text-[var(--dpl-ink)]"
      >
        安卓手机 · 下载 App
      </h2>
      <p className="mt-1 text-[13px] text-[var(--dpl-ink2)]">Android — download the app</p>

      <a
        href={APK_PATH}
        download
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-[var(--dpl-r-pill)] bg-[var(--dpl-accent)] px-6 py-4 font-[var(--dpl-font-display)] text-[18px] font-semibold text-[var(--dpl-accent-ink)] shadow-[var(--dpl-pill-shadow)]"
      >
        <DownloadIcon className="h-6 w-6" />
        下载安装包 Download APK
      </a>

      <p className="mt-3 text-center text-[13px] text-[var(--dpl-ink2)]">{versionLine}</p>
      <p className="text-center text-[12px] text-[var(--dpl-ink3)]">{versionLineEn}</p>

      {/* Android blocks sideloading until the browser is trusted once. Saying so
          BEFORE it happens turns a scary system dialog into an expected step. */}
      <p className="mt-5 rounded-[var(--dpl-r-sm)] border border-[var(--dpl-badge-line)] bg-[var(--dpl-badge-bg)] px-4 py-3 text-[13px] leading-relaxed text-[var(--dpl-ink2)]">
        首次安装需允许「安装未知应用」——在弹出的系统提示中点击「设置」并打开即可，安全无害。
        <br />
        <span className="text-[var(--dpl-ink3)]">
          First install only: allow installs from this source when your phone asks.
        </span>
      </p>
    </section>
  );

  const iosSteps = [
    { zh: '用 Safari 打开下方链接', en: 'Open the link below in Safari' },
    { zh: '点击底部的「分享」按钮', en: 'Tap the Share button', icon: true },
    { zh: '选择「添加到主屏幕」', en: 'Choose “Add to Home Screen”' },
    { zh: '完成——图标会出现在桌面上', en: 'Done — the icon appears on your home screen' },
  ];

  const iosCard = (
    <section
      aria-labelledby="dpl-ios-heading"
      className="rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-6 shadow-[var(--dpl-shadow)]"
    >
      <h2
        id="dpl-ios-heading"
        className="font-[var(--dpl-font-display)] text-[20px] font-semibold text-[var(--dpl-ink)]"
      >
        iPhone · 添加到主屏幕
      </h2>
      <p className="mt-1 text-[13px] text-[var(--dpl-ink2)]">
        iPhone — add to Home Screen (no App Store needed)
      </p>

      <ol className="mt-5 space-y-3">
        {iosSteps.map((step, i) => (
          <li key={step.en} className="flex gap-3">
            <span className="mt-[2px] flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--dpl-badge-line)] bg-[var(--dpl-badge-bg)] text-[12px] font-semibold text-[var(--dpl-accent-text)]">
              {i + 1}
            </span>
            <span className="text-[15px] leading-snug text-[var(--dpl-ink)]">
              <span className="inline-flex items-center gap-2">
                {step.zh}
                {step.icon ? (
                  <ShareIcon className="h-[18px] w-[18px] text-[var(--dpl-accent-text)]" />
                ) : null}
              </span>
              <span className="mt-[2px] block text-[12px] text-[var(--dpl-ink3)]">{step.en}</span>
            </span>
          </li>
        ))}
      </ol>

      <a
        href={PARENT_PORTAL_URL}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--dpl-r-pill)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome)] px-6 py-3 text-[15px] font-semibold text-[var(--dpl-ink)]"
      >
        打开家长端 Open the parent portal
      </a>
      <p className="mt-2 break-all text-center text-[11px] text-[var(--dpl-ink3)]">
        montree.xyz/montree/parent/online-classes
      </p>
    </section>
  );

  return (
    <>
      {showWeChat ? <WeChatOverlay onDismiss={() => setWechatDismissed(true)} /> : null}

      {/* On an iPhone the APK is useless, so the PWA card leads. Everywhere
          else (including before hydration) Android leads — it is the product
          this page exists to hand out. */}
      <div className="mt-8 flex flex-col gap-5">
        {isIos ? iosCard : androidCard}
        {isIos ? androidCard : iosCard}
      </div>
    </>
  );
}
