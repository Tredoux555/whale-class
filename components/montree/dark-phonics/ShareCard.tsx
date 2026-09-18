'use client';

/**
 * ShareCard — the overlay after the last stage of a lesson says DONE.
 *
 * "🎉 We finished In the Pit!" and one way onwards. Web Share where it exists
 * (every phone this reaches), copy-link everywhere else, and a WeChat hint
 * under both, because on the platform this curriculum actually travels on there
 * is no share sheet to call — a person long-presses the link.
 *
 * The link is the lesson's canonical deep link with the medium in utm_medium,
 * so the funnel can tell a native share from a pasted one.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { shareText, shareTitle, shareUrl } from '@/lib/montree/dark-phonics/share';
import type { HubLang } from '@/lib/montree/dark-phonics/hub-strings';
import { dpTrack } from './Pixel';

export default function ShareCard({
  lesson,
  bookTitle,
  lang,
  t,
  onClose,
}: {
  lesson: number;
  bookTitle: string;
  lang: HubLang;
  t: (key: string) => string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Focus lands inside the dialog, and Escape leaves it. The card is the only
  // thing on screen that matters at this moment, so it takes the focus rather
  // than leaving it on a DONE button that has just been unmounted.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    dpTrack('share_open', { lesson });
  }, [lesson]);

  const origin = typeof window === 'undefined' ? null : window.location.origin;

  const doShare = useCallback(async () => {
    const url = shareUrl(lesson, 'share', origin);
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title: shareTitle(bookTitle, lang), text: shareText(bookTitle, lang), url });
        dpTrack('share_done', { lesson, props: { medium: 'share' } });
        return;
      } catch {
        /* the person cancelled the sheet — fall through to copy */
      }
    }
    void doCopy();
    // doCopy is stable for this render; listing it would loop the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, bookTitle, lang, origin]);

  const doCopy = useCallback(async () => {
    const url = shareUrl(lesson, 'copy', origin);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard permission (or an http origin): select the text instead so
      // the person can copy it by hand rather than being told nothing happened.
      const input = cardRef.current?.querySelector<HTMLInputElement>('.dp-share-url');
      input?.select();
    }
    setCopied(true);
    dpTrack('share_done', { lesson, props: { medium: 'copy' } });
    window.setTimeout(() => setCopied(false), 2200);
  }, [lesson, origin]);

  return (
    <div className="dp-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dp-share"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dp-share-title"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="dp-share-emoji" aria-hidden="true">
          🎉
        </p>
        <h2 className="dp-share-title" id="dp-share-title">
          {t('share.title')} <em>{bookTitle}</em>
        </h2>
        <p className="dp-share-body">{t('share.body')}</p>

        <input
          className="dp-share-url"
          readOnly
          value={shareUrl(lesson, 'copy', origin)}
          aria-label={t('share.copy')}
          onFocus={(e) => e.currentTarget.select()}
        />

        <div className="dp-share-actions">
          <button type="button" className="dp-btn dp-btn-primary" onClick={() => void doShare()}>
            {t('share.share')}
          </button>
          <button type="button" className="dp-btn dp-btn-ghost" onClick={() => void doCopy()}>
            {copied ? t('share.copied') : t('share.copy')}
          </button>
        </div>

        <p className="dp-share-wechat">{t('share.wechat')}</p>

        <button type="button" className="dp-share-close" onClick={onClose} ref={closeRef}>
          {t('share.close')}
        </button>

        <span className="dp-sr" role="status" aria-live="polite">
          {copied ? t('share.copied') : ''}
        </span>
      </div>
    </div>
  );
}
