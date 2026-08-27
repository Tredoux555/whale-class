'use client';

/**
 * PotatoAppDownloadClient — the platform-aware half of /potato-app.
 *
 * The page around it is a server component; everything that needs to know WHO
 * is looking lives here:
 *
 *   1. WeChat's in-app browser (userAgent contains `MicroMessenger`) silently
 *      refuses .apk downloads. Nothing in-page fixes that, so we show the
 *      standard China pattern: a full-screen overlay with an arrow at the
 *      top-right corner and "tap ··· → Open in Browser". Dismissible — a
 *      teacher who only wants the iPhone instructions shouldn't be trapped.
 *   2. iOS has no APK. iPhone users get the Add-to-Home-Screen route to the
 *      existing web app, promoted to the top when we detect iOS.
 *   3. The version line comes from the public app-version endpoint. That
 *      endpoint and the APK ship together, so before the first release the APK
 *      link 404s — expected, and it must degrade quietly, never as an error.
 *
 * 🚨 NO CROSS-MODULE IMPORT. The equivalent Dark Phonics Live component was
 * read and its logic copied here on purpose: app/potato and components/potato
 * import nothing from lib/montree/* or components/montree/*, and that
 * isolation is worth more than the ~40 duplicated lines. Fix a bug in one and
 * you must decide, deliberately, whether the other has it too.
 *
 * HYDRATION: every UA-derived value starts as null and is filled in an effect,
 * so the server HTML and the first client render are identical.
 */

import React, { useEffect, useState } from 'react';

/** Where the APK is served from. Committed by the release job; 404s before then. */
const APK_PATH = '/downloads/potato-snaps.apk';
const VERSION_ENDPOINT = '/api/potato/app-version';
/** The installable web app iPhone users are pointed at. */
const TEACHER_WEB_URL = 'https://montree.xyz/potato/teacher';

interface AndroidRelease {
  version?: string;
  versionCode?: number;
  url?: string;
  notes?: string;
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
  // as iOS — those users need Add-to-Home-Screen, not an APK.
  const isIos =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const platform: Platform = /Android/i.test(ua) ? 'android' : isIos ? 'ios' : 'other';
  return { platform, isWeChat };
}

/* ---------------------------------------------------------------- glyphs -- */

/** iOS share-sheet glyph — the exact icon a teacher taps in Safari's toolbar. */
function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3E93C4"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
      <path d="M12 15V3" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
    </svg>
  );
}

/** Downward arrow for the primary APK button. */
function DownloadIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#23395B"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <path d="M12 3v13" />
      <path d="m6.5 11.5 5.5 5.5 5.5-5.5" />
      <path d="M4 20h16" />
    </svg>
  );
}

/* --------------------------------------------------------- WeChat overlay -- */

/**
 * The universal China pattern: a full-screen sheet with a curved arrow aimed at
 * WeChat's own ··· menu in the top-right corner, because that menu is the ONLY
 * way out of the in-app browser (which blocks .apk downloads outright).
 */
function WeChatOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Open in browser"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        padding: 20,
        background: 'rgba(35,57,91,.90)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Arrow: starts low and curves up to point at the ··· menu. */}
      <svg
        viewBox="0 0 120 150"
        width={112}
        height={140}
        fill="none"
        stroke="#FFD466"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ marginRight: 8, flex: 'none' }}
      >
        <path d="M20 145C20 95 40 45 104 16" />
        <path d="M78 16h26v26" />
      </svg>

      <div style={{ alignSelf: 'center', maxWidth: 380, textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--pt-disp)',
            fontWeight: 800,
            fontSize: 22,
            lineHeight: 1.3,
            color: '#FFFDF6',
            margin: 0,
          }}
        >
          Tap <span style={{ letterSpacing: '.2em' }}>···</span> at the top right,
          <br />
          then “Open in Browser”
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14.5, fontWeight: 700, color: '#FFD466' }}>
          请点击右上角 ··· 选择「在浏览器打开」
        </p>
        <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,253,246,.72)' }}>
          WeChat’s built-in browser can’t download the app file.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="pt-btn pt-btn--md"
          style={{ margin: '26px auto 0', background: 'var(--pt-butter)', color: 'var(--pt-ink)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ main -- */

const CARD: React.CSSProperties = {
  background: 'var(--pt-paper)',
  border: '1.5px solid var(--pt-sand-line)',
  borderRadius: 'var(--pt-r-card)',
  boxShadow: 'var(--pt-sh-card)',
  padding: '20px 18px',
};

const CARD_TITLE: React.CSSProperties = {
  fontFamily: 'var(--pt-disp)',
  fontWeight: 800,
  fontSize: 19,
  margin: 0,
  letterSpacing: '-.01em',
};

const CARD_SUB: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--pt-ink-50)',
};

export default function PotatoAppDownloadClient() {
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
    // A failure here is the EXPECTED state before the first APK release —
    // swallow it and fall back to the placeholder line, never an error.
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
      ? `Version ${release.version} · Android APK`
      : 'Version details coming soon · Android APK';

  const androidCard = (
    <section aria-labelledby="pt-android-heading" style={CARD}>
      <h2 id="pt-android-heading" style={CARD_TITLE}>
        Android phone
      </h2>
      <p style={CARD_SUB}>Install the Potato Snaps app</p>

      <a
        href={APK_PATH}
        download
        className="pt-btn pt-btn--primary pt-btn--lg"
        style={{ marginTop: 16, textDecoration: 'none' }}
      >
        <DownloadIcon />
        Download the app
      </a>

      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--pt-ink-50)' }}>
        {versionLine}
      </p>

      {/* Android blocks sideloading until the browser is trusted once, and the
          app then asks for two permissions of its own. Naming all three BEFORE
          they happen turns a run of scary system dialogs into expected steps. */}
      <div
        style={{
          margin: '16px 0 0',
          padding: '11px 13px',
          borderRadius: 'var(--pt-r-tile)',
          background: 'var(--pt-butter-soft)',
          border: '1.5px solid #F4DFA6',
          fontSize: 13,
          lineHeight: 1.55,
          fontWeight: 700,
          color: 'var(--pt-ink-70)',
        }}
      >
        <p style={{ margin: 0 }}>
          First install only: your phone will ask permission to install from this
          source. Tap “Settings”, turn it on, and carry on — it’s safe.
        </p>
        <p style={{ margin: '9px 0 0' }}>
          Then the app asks for two things: <b>Camera</b>, the first time you tap
          the shutter, and <b>Photos and videos</b>, the first time a snap is
          saved. Say yes to both — the second is what puts your photos in your
          own gallery, in an album called “Potato Snaps”.
        </p>
      </div>

      {/* 🚨 The v1.1.0 APK is a different package from the build teachers
          installed before it (xyz.teacherpotato.snaps vs xyz.montree.potatosnaps)
          and is signed with a different key, so Android cannot install it over
          the old one — it lands as a SECOND icon with the same name. Saying so
          here is the only warning she gets; the alternative is a teacher with
          two identical potatoes and no idea which one is current. */}
      <p
        style={{
          margin: '10px 0 0',
          padding: '11px 13px',
          borderRadius: 'var(--pt-r-tile)',
          background: 'var(--pt-sky)',
          border: '1.5px solid #BBDCF0',
          fontSize: 13,
          lineHeight: 1.55,
          fontWeight: 700,
          color: 'var(--pt-blue-deep)',
        }}
      >
        Already have Potato Snaps? This is a fresh version, so it installs as a
        second app rather than replacing the old one. Once it opens and you can
        see your class, <b>uninstall the older Potato Snaps</b> — otherwise
        you’ll have two potatoes on your home screen.
      </p>
    </section>
  );

  const iosSteps = [
    { text: 'Open the link below in Safari', icon: false },
    { text: 'Tap the Share button', icon: true },
    { text: 'Choose “Add to Home Screen”', icon: false },
    { text: 'Done — the potato appears on your home screen', icon: false },
  ];

  const iosCard = (
    <section aria-labelledby="pt-ios-heading" style={CARD}>
      <h2 id="pt-ios-heading" style={CARD_TITLE}>
        iPhone
      </h2>
      <p style={CARD_SUB}>No App Store needed — add the web app to your Home Screen</p>

      <ol style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 10 }}>
        {iosSteps.map((step, i) => (
          <li key={step.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span
              style={{
                flex: 'none',
                width: 24,
                height: 24,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--pt-sky)',
                color: 'var(--pt-blue-deep)',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, display: 'inline-flex', gap: 7, alignItems: 'center' }}>
              {step.text}
              {step.icon ? <ShareIcon /> : null}
            </span>
          </li>
        ))}
      </ol>

      <a
        href={TEACHER_WEB_URL}
        className="pt-btn pt-btn--blue pt-btn--md"
        style={{ marginTop: 16, width: '100%', textDecoration: 'none' }}
      >
        Open the teacher web app
      </a>
      <p
        style={{
          margin: '8px 0 0',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--pt-ink-35)',
          wordBreak: 'break-all',
        }}
      >
        montree.xyz/potato/teacher
      </p>
    </section>
  );

  return (
    <>
      {showWeChat ? <WeChatOverlay onDismiss={() => setWechatDismissed(true)} /> : null}

      {/* On an iPhone the APK is useless, so the Home Screen card leads.
          Everywhere else (including before hydration) Android leads — it is the
          product this page exists to hand out. */}
      <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
        {isIos ? iosCard : androidCard}
        {isIos ? androidCard : iosCard}
      </div>
    </>
  );
}
