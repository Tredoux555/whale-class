'use client';

/**
 * Hero — the five seconds in which a teacher decides.
 *
 * One line, one sub, one picture and two buttons. It shows only above the Play
 * tab and only while no lesson is open: the moment a shelf is on screen the
 * hero is noise, and the shelf wants the height.
 *
 * The picture slot is a video when NEXT_PUBLIC_DP_INTRO_VIDEO_URL is set and the
 * lesson-5 cover art when it is not — never an empty box, and never a request
 * to a video host that does not exist.
 */

import type { HubLang } from '@/lib/montree/dark-phonics/hub-strings';

const INTRO_VIDEO = process.env.NEXT_PUBLIC_DP_INTRO_VIDEO_URL || '';

export default function Hero({
  t,
  lang,
  coverImage,
  onPlayFirst,
  onPrint,
}: {
  t: (key: string) => string;
  lang: HubLang;
  /** Cover art for the fallback slot — lesson 5's book, passed in by the hub. */
  coverImage: string | null;
  onPlayFirst: () => void;
  onPrint: () => void;
}) {
  return (
    <section className="dp-hero" aria-labelledby="dp-hero-title">
      <div className="dp-hero-copy">
        <h1 id="dp-hero-title" className="dp-hero-title" lang={lang}>
          {t('hero.title')}
        </h1>
        <p className="dp-hero-sub">{t('hero.sub')}</p>
        <div className="dp-hero-actions">
          <button type="button" className="dp-btn dp-btn-primary" onClick={onPlayFirst}>
            {t('hero.play')}
          </button>
          <button type="button" className="dp-btn dp-btn-ghost" onClick={onPrint}>
            {t('hero.print')}
          </button>
        </div>
      </div>

      <div className="dp-hero-media">
        {INTRO_VIDEO ? (
          <video
            className="dp-hero-video"
            src={INTRO_VIDEO}
            controls
            playsInline
            preload="none"
            aria-label={t('hero.videoLabel')}
          />
        ) : coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size
          <img className="dp-hero-cover" src={coverImage} alt={t('hero.coverAlt')} loading="eager" />
        ) : (
          <div className="dp-hero-cover dp-hero-cover-empty" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
