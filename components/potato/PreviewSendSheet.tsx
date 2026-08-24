// components/potato/PreviewSendSheet.tsx
// Preview & send — design spec tab 13. The new product law made physical.
//
// 🚨 WHY THIS SCREEN EXISTS
// On Aug 8 a film rendered and was instantly visible to parents, unseen by
// anyone. Making a film and sending it are now two different decisions, and
// between them sits this sheet: a player, a lock pill, and a teacher's
// judgement.
//
// The most important sentence here is six words long — "Only you can see this"
// — and it sits directly under the player, because a teacher must never have to
// wonder whether tapping play has already published something.
//
// Hierarchy: one honey Send with a warm glow; Remake is a quiet outline
// underneath — reachable, clearly secondary, and it returns to the picker with
// the selection intact.

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IconX, IconCheck, IconSend, IconRedo, IconLock, IconDownload, Mascot } from '@/components/potato/PotatoBits';
import { postJson, messageFrom, downloadMedia, mediaFilename } from '@/lib/potato/client';

export interface PreviewFilm {
  jobId: string;
  kind: 'child' | 'class';
  /**
   * 🚨 The child this film belongs to — null for a class film.
   *
   * Every action that navigates back to a child (Remake) keys on THIS, never on
   * `title`. `title` is a display string, and in a kindergarten two children
   * called Emma is a Tuesday: a name match would happily reopen the wrong
   * child's picker and then render the wrong child's film.
   */
  childId: string | null;
  /** "Emma" for a child film, the class name for a class film — display only */
  title: string;
  weekLabel: string;
  /** raw ISO week-start (e.g. "2026-08-17"), for a human download filename */
  weekStart?: string;
  photoCount: number;
  videoUrl: string | null;
  /** class films only: how many families this reaches */
  familyCount?: number;
}

interface PreviewSendSheetProps {
  film: PreviewFilm;
  onClose: () => void;
  /** back to the picker, selection intact */
  onRemake: () => void;
  /** the film is now published — refresh the board */
  onSent: () => void;
}

export default function PreviewSendSheet({ film, onClose, onRemake, onSent }: PreviewSendSheetProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const isClass = film.kind === 'class';

  const send = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await postJson(`/api/potato/montages/${film.jobId}/send`, {});
      setSent(true);
    } catch (err) {
      setError(messageFrom(err, 'Could not send that film.'));
      setSending(false);
    }
  }, [film.jobId, sending]);

  const download = useCallback(async () => {
    if (downloading || !film.videoUrl) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadMedia(film.videoUrl, mediaFilename(film.title, film.weekStart ?? ''));
    } catch (err) {
      setError(messageFrom(err, 'Could not download that film.'));
    } finally {
      setDownloading(false);
    }
  }, [downloading, film.videoUrl, film.title, film.weekStart]);

  // ---- the sent moment: one warm confirmation, then straight back to work ---
  if (sent) {
    const headline = isClass
      ? `Sent to ${film.familyCount ?? 0} ${film.familyCount === 1 ? 'family' : 'families'}`
      : `Sent to ${film.title}’s parents`;
    return (
      <div className="pt-sheet" role="dialog" aria-modal="true" aria-label="Film sent">
        <div className="pt-sentwrap">
          <div className="pt-sentring">
            <div className="pt-sentdisc">
              <IconCheck size={42} color="#FFFDF6" weight={3.2} />
            </div>
          </div>
          <h2>{headline}</h2>
          <p>{'It’s on their feed now.'}</p>
          <div style={{ marginTop: 30, width: '100%', maxWidth: 290 }}>
            <button
              type="button"
              className="pt-btn pt-btn--primary pt-btn--lg"
              onClick={() => {
                onSent();
                onClose();
              }}
            >
              Back to board
            </button>
          </div>
          <div className="pt-emptyhint" style={{ marginTop: 22 }}>
            <Mascot size={22} camera={false} shadow={false} />
            made with PSS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-sheet" role="dialog" aria-modal="true" aria-label="Preview and send">
      <div className="pt-grab" />
      <div className="pt-sheetbar pt-sheetbar--bare">
        <button
          type="button"
          className="pt-iconbtn pt-iconbtn--sm"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
        >
          <IconX size={20} />
        </button>
        <div className="pt-sheetbar__t">
          <h1>{isClass ? 'Class film' : `${film.title}’s film`}</h1>
          <p>
            {film.weekLabel}
            <span className="pt-sep">·</span>
            {`${film.photoCount} ${film.photoCount === 1 ? 'photo' : 'photos'}`}
          </p>
        </div>
      </div>

      <div className="pt-preview">
        <div className="pt-readytag">
          <IconCheck size={15} color="#23395B" weight={3.6} /> Film ready
        </div>

        <div className="pt-vplayer">
          {film.videoUrl ? (
            // The teacher may watch her own unsent film: the media proxy already
            // admits any teacher of the class, so nothing had to be loosened.
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={film.videoUrl} controls playsInline preload="metadata" />
          ) : null}
        </div>

        {/* Six words. The most important sentence on this screen. */}
        <div className="pt-privatepill">
          <IconLock size={14} color="rgba(35,57,91,.5)" /> Only you can see this
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            className="pt-btn pt-btn--quiet pt-btn--sm"
            onClick={download}
            disabled={downloading || !film.videoUrl}
          >
            <IconDownload size={15} color="rgba(35,57,91,.6)" />
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>

        {error ? (
          <div className="pt-err" style={{ marginTop: 16, maxWidth: 300 }}>{error}</div>
        ) : null}
      </div>

      <div className="pt-sendfoot">
        <button
          type="button"
          className="pt-btn pt-btn--primary pt-btn--glow pt-btn--lg"
          onClick={send}
          disabled={sending || !film.videoUrl}
        >
          <IconSend size={20} />
          {sending
            ? 'Sending…'
            : isClass
              ? `Send to all parents · ${film.familyCount ?? 0}`
              : `Send to ${film.title}’s parents`}
        </button>
        <button
          type="button"
          className="pt-btn pt-btn--quiet pt-btn--md"
          onClick={onRemake}
          disabled={sending}
        >
          <IconRedo size={17} color="rgba(35,57,91,.6)" /> Remake
        </button>
        <p className="pt-sendnote">Nothing has reached a parent yet.</p>
      </div>
    </div>
  );
}
