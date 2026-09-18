'use client';

/**
 * DarkPhonicsHub — montree.xyz's front door.
 *
 * One page, three tabs, no signup:
 *   Play       the shelf (/parents' own ParentLedLessons, unchanged)
 *   Classroom  the printables body of /montree/library/dark-phonics
 *   Community  the feedback board on scope `product:dark-phonics`
 *
 * THE FOUR RULES THIS FILE KEEPS
 *
 * 1. THE SHELF GETS THE VIEWPORT. ShelfPlayer sizes itself to 100dvh. A header
 *    sitting above it would make the page 100dvh + 64px tall — two scrollbars
 *    on a phone and the bottom of the work cut off on a 768px iPad. So while a
 *    lesson is open the header collapses to a 44px rail (`slim`) and the Play
 *    panel is the only scroll container on the page.
 * 2. THE PALETTE IS MONTREE'S. Deep forest, the landing's own ink and paper —
 *    `--dp-*`, declared once in the styled-jsx block at the bottom. The shelf's
 *    `--dpl-*` skin is imported by PlayTab and by nothing else; see the note in
 *    that file.
 * 3. THE URL IS THE STATE. ?tab= and /l/<n> are pushed with history.replaceState
 *    rather than a router navigation: a tab change must not remount the shelf,
 *    and re-rendering a server component to switch a tab would throw away the
 *    lesson a child is in the middle of.
 * 4. NOTHING HERE BLOCKS THE LESSON. Every beacon is fire-and-forget, every
 *    cookie read is in a try/catch, and the paywall fails open (see access.ts).
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import {
  DP_FREE_LESSONS,
  DP_UNLOCK_COPY,
  isLessonLocked,
  type DpTier,
} from '@/lib/montree/dark-phonics/access';
import { makeHubT, type HubLang } from '@/lib/montree/dark-phonics/hub-strings';
import { lessonPath } from '@/lib/montree/dark-phonics/share';
import { BOOK_WORKS_LESSON_NUMBERS, getBookWorks } from '@/lib/montree/dark-phonics/book-works';

import Hero from './Hero';
import HubTabs, { type HubTab } from './HubTabs';
import LeadStrip, { leadStripDismissed } from './LeadStrip';
import Pixel, { dpTrack } from './Pixel';
import ShareCard from './ShareCard';

/**
 * Both heavy panels load on demand.
 *
 * Classroom is ~1,200 lines and fetches two APIs on mount; Play carries the
 * shelf's whole design-token stylesheet. Splitting them means a visitor who
 * only ever opens one tab downloads only that one — and it is what keeps the
 * `--dpl-*` skin out of a Classroom-only session.
 */
const PlayTab = dynamic(() => import('./PlayTab'), {
  loading: () => <div className="dp-loading" role="status" aria-live="polite" />,
});
const DarkPhonicsClassroom = dynamic(() => import('./DarkPhonicsClassroom'), {
  loading: () => <div className="dp-loading" role="status" aria-live="polite" />,
});

const LANG_COOKIE = 'fb_lang';
/** A read-once preference has nothing to subscribe to. Same idiom as the shelf. */
const NO_SUBSCRIBE = () => () => {};
/** Lesson art for the hero when no intro video is configured. */
const HERO_LESSON = 5;

/**
 * Which door this hub is mounted behind.
 *
 *   'hub'     montree.xyz/dark-phonics — the front door. A visitor may never
 *             have heard of Dark Phonics, so the hero does the selling.
 *   'parents' teacherpotato.xyz/parents — the Whale Class door (2026-09-18,
 *             owner's request: he opened /parents and expected the discussion
 *             board). These parents were handed the tablet by their child's
 *             teacher and already know what this is, so the hero is dropped
 *             and the shelf is the first thing on the page — which is exactly
 *             what /parents was before the tabs arrived.
 *
 * 🚨 IT IS THE SAME COMPONENT, NOT A COPY. Everything else — the tabs, the
 * board, the share card, the measurement, the paywall — is identical on both
 * mounts, and there is no second implementation to keep in step.
 */
export type HubVariant = 'hub' | 'parents';

export interface DarkPhonicsHubProps {
  initialTab: HubTab;
  /** From /dark-phonics/l/<n>; null on the plain hub. */
  initialLesson: number | null;
  initialLang: HubLang;
  tier: DpTier;
  paywallOn: boolean;
  /** The Community panel, rendered on the server (the board needs a db read). */
  communitySlot: React.ReactNode;
  /** The query string this page was opened with, for the attribution stamp. */
  search: string;
  variant?: HubVariant;
  /** The route this hub is mounted at — what ?tab= is written back onto. */
  basePath?: string;
  brandHref?: string;
  backHref?: string;
  backLabel?: string;
}

export default function DarkPhonicsHub({
  initialTab,
  initialLesson,
  initialLang,
  tier,
  paywallOn,
  communitySlot,
  search,
  variant = 'hub',
  basePath = '/dark-phonics',
  brandHref = '/montree',
  backHref,
  backLabel,
}: DarkPhonicsHubProps) {
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [lang, setLang] = useState<HubLang>(initialLang);
  const [openLesson, setOpenLesson] = useState<number | null>(initialLesson);
  const [shareFor, setShareFor] = useState<number | null>(null);
  const [lockedFor, setLockedFor] = useState<number | null>(null);

  /**
   * The lead strip's dismissal cookie, read hydration-safely.
   *
   * 🚨 NOT an effect that calls setState on mount — that is a cascading render,
   * and the repo has been bitten by the initializer version of the same bug
   * (see the long note on useStoredPreference in ParentLedLessons). The server
   * snapshot is "not dismissed", the client reads the real cookie, and React
   * reconciles the difference itself. The subscription is a no-op because
   * nothing else in the tab changes this cookie underneath us.
   */
  const dismissedByCookie = useSyncExternalStore(NO_SUBSCRIBE, leadStripDismissed, () => false);
  const [dismissedNow, setDismissedNow] = useState(false);
  const leadOpen = !dismissedByCookie && !dismissedNow;

  const t = useMemo(() => makeHubT(lang), [lang]);

  const lockedLessons = useMemo(
    () => (paywallOn ? BOOK_WORKS_LESSON_NUMBERS.filter((n) => isLessonLocked(n, tier, true)) : []),
    [paywallOn, tier],
  );
  const freeLessons = useMemo(
    () => (paywallOn ? DP_FREE_LESSONS : []),
    [paywallOn],
  );

  const heroCover = useMemo(() => getBookWorks(HERO_LESSON)?.coverImage ?? null, []);

  /* ── The URL mirrors the state, without a navigation ───────────────────── */
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (openLesson !== null) {
        // A lesson is open → the canonical deep link, so a copied address bar
        // is the same link the share card hands out.
        //
        // 🚨 ONLY ON THE HUB. /parents is a PWA scoped to that exact path (see
        // app/parents/layout.tsx); rewriting the address bar to /dark-phonics/l/5
        // would push a home-screen launch outside its own scope and drop the
        // standalone chrome mid-lesson. The share card still hands out the
        // canonical /dark-phonics/l/<n> link on both mounts, which is right —
        // that link works on either host.
        if (variant === 'hub') {
          window.history.replaceState(null, '', `${lessonPath(openLesson)}${url.search}`);
        }
        return;
      }
      url.pathname = basePath;
      if (tab === 'play') url.searchParams.delete('tab');
      else url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    } catch {
      /* a browser that refuses history is still a working hub */
    }
  }, [tab, openLesson, basePath, variant]);

  /* ── Measurement ───────────────────────────────────────────────────────── */
  const firedHubView = useRef(false);
  useEffect(() => {
    if (firedHubView.current) return;
    firedHubView.current = true;
    dpTrack('hub_view', { props: { tab: initialTab } });
    if (initialLesson !== null) dpTrack('lesson_open', { lesson: initialLesson, props: { via: 'deeplink' } });
  }, [initialTab, initialLesson]);

  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    dpTrack('tab_view', { props: { tab } });
    if (tab === 'community') dpTrack('community_view');
  }, [tab]);

  /* ── Language, in the cookie the feedback board already uses ───────────── */
  const changeLang = useCallback((next: HubLang) => {
    setLang(next);
    try {
      document.cookie = `${LANG_COOKIE}=${next}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
    } catch {
      /* the toggle still works for this visit */
    }
  }, []);

  /* ── Shelf callbacks ───────────────────────────────────────────────────── */
  const onLessonOpen = useCallback((n: number) => {
    dpTrack('lesson_open', { lesson: n, props: { via: 'picker' } });
  }, []);

  const onStageDone = useCallback((n: number, stageKey: string, index: number) => {
    dpTrack('stage_done', { lesson: n, stage: stageKey, props: { index } });
  }, []);

  const onLessonDone = useCallback((n: number) => {
    dpTrack('lesson_done', { lesson: n });
    setShareFor(n);
  }, []);

  const onLockedLesson = useCallback((n: number) => {
    dpTrack('paywall_view', { lesson: n });
    setLockedFor(n);
  }, []);

  const playFirst = useCallback(() => {
    setTab('play');
    setOpenLesson(1);
    onLessonOpen(1);
  }, [onLessonOpen]);

  const goPrint = useCallback(() => setTab('classroom'), []);

  const shareBook = shareFor === null ? null : getBookWorks(shareFor);
  const lessonIsOpen = openLesson !== null;

  return (
    <div
      className={`dp-root${tab === 'play' && lessonIsOpen ? ' dp-root-locked' : ''}`}
      data-dp-lang={lang}
    >
      <Pixel search={search} />

      <a className="dp-skip" href="#dp-panel-play">
        {t('skip')}
      </a>

      <HubTabs
        tab={tab}
        onTab={(next) => {
          // Leaving Play closes the lesson: a shelf running behind a printables
          // list is a video still playing in a tab you have left.
          if (next !== 'play') setOpenLesson(null);
          setTab(next);
        }}
        lang={lang}
        onLang={changeLang}
        t={t}
        slim={tab === 'play' && lessonIsOpen}
        brandHref={brandHref}
        backHref={backHref}
        backLabel={backLabel}
      />

      <main className="dp-main" id="dp-main">
        {/* ── PLAY ───────────────────────────────────────────────────────── */}
        <section
          id="dp-panel-play"
          role="tabpanel"
          aria-labelledby="dp-tab-play"
          hidden={tab !== 'play'}
          className={`dp-panel dp-panel-play${lessonIsOpen ? ' dp-panel-full' : ''}`}
        >
          {!lessonIsOpen && variant === 'hub' ? (
            <Hero t={t} lang={lang} coverImage={heroCover} onPlayFirst={playFirst} onPrint={goPrint} />
          ) : null}

          <PlayTab
            openLesson={openLesson}
            onOpenChange={setOpenLesson}
            freeLessons={freeLessons}
            lockedLessons={lockedLessons}
            freeLabel={t('play.free')}
            lockedLabel={t('play.locked')}
            onLessonOpen={onLessonOpen}
            onLessonDone={onLessonDone}
            onStageDone={onStageDone}
            onLockedLesson={onLockedLesson}
            backHref={variant === 'parents' ? undefined : backHref}
            backLabel={backLabel}
          />

          {!lessonIsOpen && leadOpen ? <LeadStrip t={t} onDismiss={() => setDismissedNow(true)} /> : null}
        </section>

        {/* ── CLASSROOM ──────────────────────────────────────────────────── */}
        <section
          id="dp-panel-classroom"
          role="tabpanel"
          aria-labelledby="dp-tab-classroom"
          hidden={tab !== 'classroom'}
          className="dp-panel"
        >
          {tab === 'classroom' ? (
            <>
              <DarkPhonicsClassroom embedded />
              {leadOpen ? <LeadStrip t={t} onDismiss={() => setDismissedNow(true)} /> : null}
            </>
          ) : null}
        </section>

        {/* ── COMMUNITY ──────────────────────────────────────────────────── */}
        <section
          id="dp-panel-community"
          role="tabpanel"
          aria-labelledby="dp-tab-community"
          hidden={tab !== 'community'}
          className="dp-panel dp-panel-community"
        >
          {communitySlot}
        </section>
      </main>

      {/* The share card, over everything, after a lesson's last DONE. */}
      {shareFor !== null && shareBook ? (
        <ShareCard
          lesson={shareFor}
          bookTitle={shareBook.bookTitle}
          lang={lang}
          t={t}
          onClose={() => setShareFor(null)}
        />
      ) : null}

      {/* The unlock panel. Unreachable while DARK_PHONICS_PAYWALL is off,
          because no lesson is ever in `lockedLessons` then. */}
      {lockedFor !== null ? (
        <div className="dp-share-backdrop" role="presentation" onClick={() => setLockedFor(null)}>
          <div
            className="dp-share"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dp-lock-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dp-share-title" id="dp-lock-title">
              {t('paywall.title')}
            </h2>
            <p className="dp-share-body">{t('paywall.body')}</p>
            <div className="dp-share-actions">
              <Link
                className="dp-btn dp-btn-primary"
                href="/dark-phonics/account?next=/dark-phonics"
                onClick={() => dpTrack('checkout_start', { lesson: lockedFor })}
              >
                {t('paywall.cta')}
              </Link>
              <button type="button" className="dp-btn dp-btn-ghost" onClick={() => setLockedFor(null)}>
                {t('share.close')}
              </button>
            </div>
            <p className="dp-share-wechat">{DP_UNLOCK_COPY[lang]}</p>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        /* ────────────────────────────────────────────────────────────────
         * Dark Phonics hub skin — montree.xyz's deep-forest palette.
         * These are the LANDING's values, not the shelf's: the hub is a page
         * on montree.xyz and has to look like one. The shelf keeps its own
         * --dpl-* tokens inside the Play panel and the two never meet.
         * ──────────────────────────────────────────────────────────────── */
        .dp-root {
          --dp-bg: #06140e;
          --dp-bg-2: #0a1f16;
          --dp-line: rgba(255, 255, 255, 0.09);
          --dp-line-2: rgba(255, 255, 255, 0.16);
          --dp-ink: rgba(255, 250, 240, 0.94);
          --dp-ink-2: rgba(255, 250, 240, 0.62);
          --dp-ink-3: rgba(255, 250, 240, 0.38);
          --dp-accent: #82d9ae;
          --dp-accent-deep: #1d6b48;
          --dp-head-h: 60px;

          min-height: 100dvh;
          background: var(--dp-bg);
          color: var(--dp-ink);
          display: flex;
          flex-direction: column;
        }

        .dp-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .dp-skip {
          position: absolute;
          left: -9999px;
          top: 0;
          z-index: 200;
          background: var(--dp-accent);
          color: #06140e;
          padding: 12px 18px;
          border-radius: 0 0 10px 0;
          font-weight: 700;
          text-decoration: none;
        }
        .dp-skip:focus {
          left: 0;
        }

        .dp-root :focus-visible {
          outline: 2px solid var(--dp-accent);
          outline-offset: 2px;
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .dp-head {
          position: sticky;
          top: 0;
          z-index: 60;
          background: rgba(6, 20, 14, 0.94);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--dp-line);
          padding-top: env(safe-area-inset-top);
        }
        .dp-head-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          max-width: 1180px;
          margin: 0 auto;
          min-height: var(--dp-head-h);
          flex-wrap: wrap;
        }
        .dp-head-slim {
          --dp-head-h: 44px;
        }
        .dp-head-slim .dp-head-inner {
          padding: 3px 12px;
          flex-wrap: nowrap;
        }
        .dp-head-slim .dp-brand-word {
          display: none;
        }
        .dp-head-slim .dp-tab {
          padding: 7px 10px;
          font-size: 0.78rem;
        }

        .dp-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          color: var(--dp-ink);
          min-height: 44px;
          flex-shrink: 0;
        }
        .dp-brand-mark {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          background: linear-gradient(135deg, #1d6b48 0%, #0c2419 100%);
          border: 1px solid rgba(130, 217, 174, 0.3);
          flex: none;
        }
        .dp-brand-word {
          font-weight: 700;
          font-size: 0.98rem;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        /* The /parents mount's way out, next to the wordmark. It is a plain
           <a>, not a Link: it leaves this route's PWA scope on purpose. */
        .dp-back {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 10px;
          color: var(--dp-ink-3);
          text-decoration: none;
          font-size: 0.82rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .dp-back:hover {
          color: var(--dp-ink);
        }
        .dp-head-slim .dp-back {
          display: none;
        }

        .dp-tabs {
          display: flex;
          gap: 4px;
          margin-left: auto;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--dp-line);
          border-radius: 999px;
          padding: 3px;
        }
        .dp-tab {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--dp-ink-2);
          font: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 9px 15px;
          border-radius: 999px;
          cursor: pointer;
          min-height: 38px;
          transition: background 180ms ease, color 180ms ease;
        }
        .dp-tab:hover {
          color: var(--dp-ink);
        }
        .dp-tab-on {
          background: rgba(130, 217, 174, 0.16);
          color: #d6f5e6;
        }

        .dp-lang {
          display: flex;
          gap: 2px;
          border: 1px solid var(--dp-line);
          border-radius: 999px;
          padding: 3px;
          flex-shrink: 0;
        }
        .dp-lang-btn {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--dp-ink-3);
          font: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 8px 11px;
          min-height: 36px;
          min-width: 38px;
          border-radius: 999px;
          cursor: pointer;
        }
        .dp-lang-on {
          background: rgba(255, 255, 255, 0.1);
          color: var(--dp-ink);
        }

        /* ── Panels ─────────────────────────────────────────────────────── */
        .dp-main {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .dp-panel {
          flex: 1;
          min-height: 0;
        }
        .dp-panel[hidden] {
          display: none;
        }
        /* 🚨 WHILE A LESSON IS OPEN THE SHELF IS THE PAGE.
           ShelfPlayer's root is min-h-[100dvh]. Put a 53px header above that
           and the DOCUMENT is 100dvh + 53px: two scrollbars, and the bottom of
           the work off the screen on a 768px iPad (measured 854/800 desktop,
           897/844 phone before this).
           The fix locks the ROOT to the viewport and lets flex hand the panel
           whatever the header did not take — no hard-coded header height, so
           it stays right when the rail grows a safe-area inset. */
        .dp-root-locked {
          height: 100dvh;
          overflow: hidden;
        }
        .dp-root-locked .dp-main,
        .dp-root-locked .dp-panel-full {
          min-height: 0;
          overflow: hidden;
        }
        .dp-root-locked .dp-panel-full,
        .dp-root-locked .dp-play,
        .dp-root-locked .dp-play > [data-shelf-root] {
          height: 100%;
          min-height: 0;
        }
        .dp-loading {
          min-height: 40vh;
        }

        /* ── Hero ───────────────────────────────────────────────────────── */
        .dp-hero {
          display: flex;
          flex-direction: column;
          gap: 22px;
          padding: 34px 16px 30px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        .dp-hero-title {
          font-size: clamp(1.7rem, 6vw, 2.5rem);
          line-height: 1.12;
          letter-spacing: -0.02em;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--dp-ink);
        }
        .dp-hero-sub {
          font-size: 1.02rem;
          line-height: 1.65;
          color: var(--dp-ink-2);
          margin: 0 0 22px;
          max-width: 46ch;
        }
        .dp-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dp-hero-media {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--dp-line);
          background: rgba(255, 255, 255, 0.03);
        }
        .dp-hero-video,
        .dp-hero-cover {
          display: block;
          width: 100%;
          height: auto;
          max-height: 420px;
          object-fit: contain;
          background: #fff;
        }
        .dp-hero-cover-empty {
          height: 220px;
          background: rgba(255, 255, 255, 0.04);
        }

        /* ── Buttons ────────────────────────────────────────────────────── */
        .dp-btn {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 12px 22px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.94rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          border: 1px solid transparent;
          transition: filter 180ms ease, background 180ms ease;
        }
        .dp-btn-primary {
          background: linear-gradient(135deg, #2e8f63, #1d6b48);
          border-color: rgba(130, 217, 174, 0.4);
          color: #f3fff8;
        }
        .dp-btn-primary:hover {
          filter: brightness(1.1);
        }
        .dp-btn-primary:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .dp-btn-ghost {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--dp-line-2);
          color: var(--dp-ink);
        }
        .dp-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* ── Lead strip ─────────────────────────────────────────────────── */
        .dp-lead {
          position: relative;
          margin: 0 auto 34px;
          max-width: 1100px;
          width: calc(100% - 32px);
          box-sizing: border-box;
          border: 1px solid var(--dp-line);
          border-radius: 16px;
          background: rgba(130, 217, 174, 0.06);
          padding: 18px 16px 16px;
        }
        .dp-lead-title {
          margin: 0 0 12px;
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--dp-ink);
          padding-right: 70px;
        }
        .dp-lead-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dp-lead-input,
        .dp-lead-select {
          flex: 1 1 200px;
          min-width: 0;
          min-height: 44px;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1px solid var(--dp-line-2);
          background: rgba(0, 0, 0, 0.3);
          color: var(--dp-ink);
          font: inherit;
          font-size: 0.94rem;
        }
        .dp-lead-select {
          flex: 0 1 150px;
        }
        .dp-lead-submit {
          flex: 0 0 auto;
        }
        .dp-lead-error {
          margin: 10px 0 0;
          color: #ffb4a8;
          font-size: 0.85rem;
        }
        .dp-lead-dismiss {
          position: absolute;
          top: 10px;
          right: 10px;
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--dp-ink-3);
          font: inherit;
          font-size: 0.8rem;
          padding: 11px 12px;
          min-height: 44px;
          cursor: pointer;
          border-radius: 8px;
        }
        .dp-lead-dismiss:hover {
          color: var(--dp-ink);
        }
        .dp-honey {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        /* ── Share card / unlock panel ──────────────────────────────────── */
        .dp-share-backdrop {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(3, 10, 7, 0.78);
          backdrop-filter: blur(4px);
        }
        .dp-share {
          width: min(440px, 100%);
          box-sizing: border-box;
          background: linear-gradient(160deg, #0d2a1d, #071811);
          border: 1px solid rgba(130, 217, 174, 0.28);
          border-radius: 20px;
          padding: 26px 22px 20px;
          text-align: center;
          box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.9);
          animation: dp-pop 220ms ease-out;
        }
        @keyframes dp-pop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .dp-share-emoji {
          font-size: 2.2rem;
          margin: 0 0 6px;
        }
        .dp-share-title {
          margin: 0 0 8px;
          font-size: 1.2rem;
          font-weight: 600;
          line-height: 1.3;
        }
        .dp-share-title em {
          font-style: italic;
          color: var(--dp-accent);
        }
        .dp-share-body {
          margin: 0 0 16px;
          color: var(--dp-ink-2);
          font-size: 0.94rem;
        }
        .dp-share-url {
          width: 100%;
          box-sizing: border-box;
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--dp-line-2);
          background: rgba(0, 0, 0, 0.35);
          color: var(--dp-ink-2);
          font-size: 0.8rem;
          text-align: center;
        }
        .dp-share-actions {
          display: flex;
          gap: 9px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .dp-share-wechat {
          margin: 14px 0 0;
          font-size: 0.8rem;
          color: var(--dp-ink-3);
        }
        .dp-share-close {
          margin-top: 12px;
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--dp-ink-2);
          font: inherit;
          font-size: 0.86rem;
          padding: 12px 16px;
          min-height: 44px;
          cursor: pointer;
          border-radius: 10px;
        }
        .dp-share-close:hover {
          color: var(--dp-ink);
        }

        /* ── Community panel ────────────────────────────────────────────── */
        .dp-panel-community {
          background: var(--dp-bg);
        }

        /* ── Tablet and up ──────────────────────────────────────────────── */
        @media (min-width: 760px) {
          .dp-hero {
            flex-direction: row;
            align-items: center;
            gap: 40px;
            padding: 52px 24px 44px;
          }
          .dp-hero-copy {
            flex: 1 1 52%;
          }
          .dp-hero-media {
            flex: 1 1 48%;
            min-width: 0;
          }
          .dp-head-inner {
            padding: 8px 24px;
          }
          .dp-lead {
            width: calc(100% - 48px);
          }
        }

        /* ── Phone ──────────────────────────────────────────────────────
           At 390px the header was wrapping to THREE rows (brand+back, tabs,
           EN/中) and spending 170px of a 844px screen before the shelf began.
           Dropping the tabs' auto-margin lets them share row two with the
           language toggle, which is two rows and ~110px. */
        @media (max-width: 540px) {
          .dp-tabs {
            margin-left: 0;
            flex: 1 1 auto;
            justify-content: center;
          }
          .dp-tab {
            flex: 1 1 auto;
            padding: 9px 8px;
            font-size: 0.8rem;
            text-align: center;
          }
          .dp-head-inner {
            gap: 8px;
            padding: 6px 12px;
          }
          .dp-back {
            margin-left: auto;
          }
        }

        /* ── Motion ─────────────────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .dp-root *,
          .dp-share {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </div>
  );
}
