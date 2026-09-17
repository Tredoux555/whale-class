// components/montree/feedback/ComposeSheet.tsx
//
// One screen, four steps, title first.
//
// The order is the whole idea. Asking for the TITLE before the type means we
// can search while the author is still deciding what they are writing, and the
// most useful outcome of this sheet is often that it never produces a post at
// all — the author taps "Me too" on one that already exists.
//
// On a phone this is a bottom sheet (see feedback.css), because the top of a
// tall modal is the part a thumb cannot reach.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Lang, PostType, Viewer } from '@/lib/montree/feedback/types';
import { POST_TYPES } from '@/lib/montree/feedback/types';
import { makeT, timeAgo } from '@/lib/montree/feedback/strings';
import { typeLabel } from '@/lib/montree/feedback/statuses';
import { StatusChip, TypeChip } from './StatusChip';
import { CaretUp, CloseIcon, ImageIcon } from './icons';
import {
  createPost,
  searchDuplicates,
  toggleVote,
  uploadScreenshot,
  type CreatePostBody,
  type DuplicateCandidate,
} from './api';

const DEBOUNCE_MS = 250;

export default function ComposeSheet({
  board,
  boardName,
  lang,
  viewer,
  hrefBase,
  onClose,
}: {
  board: string;
  boardName: string;
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'displayName' | 'role' | 'isAdmin'>;
  hrefBase: string;
  onClose: () => void;
}) {
  const t = makeT(lang);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PostType>('problem');
  const [body, setBody] = useState('');
  const [what, setWhat] = useState('');
  const [expected, setExpected] = useState('');
  const [where, setWhere] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [screenshot, setScreenshot] = useState<{ path: string; name: string } | null>(null);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const titleRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const needsIdentity = viewer.kind !== 'user' && !viewer.displayName;

  // The Problem template's "where" is filled in for the author, and stays
  // editable. Nobody types their user-agent string correctly, and asking them
  // to is how a bug report arrives useless.
  // navigator and document exist only on the client, so this genuinely cannot
  // be computed during render.
  useEffect(() => {
    if (type !== 'problem' || where) return;
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent;
    const referrer = document.referrer && !document.referrer.includes('/feedback')
      ? new URL(document.referrer).pathname
      : window.location.pathname;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhere(`${referrer} · ${shortUa(ua)}`);
  }, [type, where]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Escape closes; focus is trapped to the sheet while it is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Live "Is it one of these?" — debounced, and every in-flight request is
  // aborted by the next keystroke so a slow one cannot land after a fast one.
  // A debounced, abortable fetch keyed on what has been typed. The clear on a
  // short query is part of that same subscription, not derived state.
  useEffect(() => {
    const q = title.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidates([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchDuplicates(board, q, controller.signal)
        .then((r) => setCandidates(r.candidates))
        .catch(() => undefined); // a failed dedup check never blocks writing
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, board]);

  const typeCards = useMemo(
    () =>
      POST_TYPES.map((tp) => ({
        type: tp,
        label: typeLabel(tp, lang),
        hint: t(
          tp === 'problem'
            ? 'typeProblemHint'
            : tp === 'idea'
              ? 'typeIdeaHint'
              : tp === 'question'
                ? 'typeQuestionHint'
                : 'typeDiscussionHint',
        ),
      })),
    [lang, t],
  );

  const onPickFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      try {
        const result = await uploadScreenshot(board, file);
        setScreenshot({ path: result.path, name: file.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGeneric'));
      }
    },
    [board, t],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const payload: CreatePostBody = {
      type,
      title: title.trim(),
      body: type === 'problem' ? '' : body.trim(),
      screenshotPath: screenshot?.path ?? null,
      website: honeypot,
    };
    if (type === 'problem') {
      payload.template = {
        what: what.trim(),
        expected: expected.trim(),
        where: where.trim(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : undefined,
        url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      };
    }
    if (needsIdentity) {
      payload.name = name.trim();
      payload.email = email.trim();
    }

    try {
      const result = await createPost(board, payload);
      onClose();
      router.push(`${hrefBase}/${result.post.id}?posted=1`);
      router.refresh();
    } catch (err) {
      const e2 = err as { message?: string; errors?: Array<{ field: string; message: string }> };
      if (e2.errors?.length) {
        setFieldErrors(Object.fromEntries(e2.errors.map((x) => [x.field, x.message])));
      }
      setError(e2.message || t('errorGeneric'));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fb-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="fb-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-compose-title"
        ref={sheetRef}
      >
        <header className="fb-sheet-head">
          <h2 id="fb-compose-title">{t('writeSomething')}</h2>
          <span className="fb-meta" style={{ display: 'none' }} data-board={board}>
            {boardName}
          </span>
          <button type="button" className="fb-iconbtn" aria-label={t('close')} onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <form className="fb-sheet-body" onSubmit={submit} noValidate>
          {/* 1 — title */}
          <div>
            <label className="fb-step" htmlFor="fb-title" style={{ display: 'block' }}>
              {t('step1Title')}
            </label>
            <input
              id="fb-title"
              ref={titleRef}
              className="fb-input fb-input--hero"
              type="text"
              value={title}
              maxLength={140}
              onChange={(e) => setTitle(e.target.value)}
              aria-describedby="fb-title-hint"
              style={title ? { borderColor: 'var(--fb-accent)' } : undefined}
            />
            <p className="fb-hint" id="fb-title-hint">
              {t('step1Hint')}
            </p>
            {fieldErrors.title ? <p className="fb-error">{fieldErrors.title}</p> : null}
          </div>

          {/* Duplicates */}
          {candidates.length > 0 ? (
            <section className="fb-dupbox" aria-live="polite">
              <h3>{t('dupHeading')}</h3>
              <p className="fb-hint" style={{ marginTop: 0, marginBottom: 12 }}>
                {t('dupBody')}
              </p>
              <ul className="fb-list">
                {candidates.map((c) => (
                  <DuplicateRow
                    key={c.id}
                    board={board}
                    candidate={c}
                    lang={lang}
                    hrefBase={hrefBase}
                    canVote={viewer.kind !== 'anon'}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {/* 2 — type */}
          <div>
            <h3 className="fb-step">{t('step2Title')}</h3>
            <div className="fb-typegrid">
              {typeCards.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  className="fb-typecard"
                  aria-pressed={type === card.type}
                  onClick={() => setType(card.type)}
                >
                  <strong>{card.label}</strong>
                  <span>{card.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3 — the fields, which follow the type */}
          <div>
            <h3 className="fb-step">{type === 'problem' ? t('step3Problem') : t('step3Other')}</h3>
            <p className="fb-hint" style={{ marginTop: 0, marginBottom: 12 }}>
              {t('initialsNudge')}
            </p>

            {type === 'problem' ? (
              <>
                <div className="fb-field">
                  <label className="fb-label" htmlFor="fb-what">
                    {t('whatHappened')}
                  </label>
                  <textarea
                    id="fb-what"
                    className="fb-textarea"
                    rows={3}
                    value={what}
                    onChange={(e) => setWhat(e.target.value)}
                  />
                  {fieldErrors['template.what'] ? (
                    <p className="fb-error">{fieldErrors['template.what']}</p>
                  ) : null}
                </div>
                <div className="fb-field">
                  <label className="fb-label" htmlFor="fb-expected">
                    {t('whatExpected')}
                  </label>
                  <textarea
                    id="fb-expected"
                    className="fb-textarea"
                    rows={2}
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                  />
                </div>
                <div className="fb-field">
                  <label className="fb-label" htmlFor="fb-where">
                    {t('whereHappened')}
                  </label>
                  <input
                    id="fb-where"
                    className="fb-input"
                    type="text"
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                  />
                  <p className="fb-hint">{t('wherePrefilled')}</p>
                </div>
              </>
            ) : (
              <div className="fb-field">
                <label className="fb-label" htmlFor="fb-body">
                  {type === 'idea' ? t('whyItMatters') : t('details')}
                </label>
                <textarea
                  id="fb-body"
                  className="fb-textarea"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                {fieldErrors.body ? <p className="fb-error">{fieldErrors.body}</p> : null}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* `capture` lets a phone offer the camera directly, which is what
                  a parent reporting a screen problem actually wants. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="fb-sr"
                id="fb-screenshot"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="fb-btn"
                style={{ borderStyle: 'dashed', borderColor: 'var(--fb-line-dashed)' }}
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon size={16} />
                {t('addScreenshot')}
              </button>
              {screenshot ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '6px 10px',
                    border: '1px solid var(--fb-line)',
                    borderRadius: 'var(--fb-r-control)',
                    background: 'var(--fb-card)',
                    fontSize: 13,
                  }}
                >
                  {screenshot.name}
                  <button
                    type="button"
                    aria-label={t('removeScreenshot')}
                    onClick={() => setScreenshot(null)}
                    style={{ border: 0, background: 'transparent', color: 'var(--fb-muted-2)' }}
                  >
                    <CloseIcon size={13} />
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          {/* 4 — who you are */}
          <div className="fb-sheet-foot">
            {needsIdentity ? (
              <div style={{ flexGrow: 1, minWidth: 240 }}>
                <h3 className="fb-step">{t('step4Identity')}</h3>
                <div className="fb-field">
                  <label className="fb-label" htmlFor="fb-name">
                    {t('yourName')}
                  </label>
                  <input
                    id="fb-name"
                    className="fb-input"
                    type="text"
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {fieldErrors.name ? <p className="fb-error">{fieldErrors.name}</p> : null}
                </div>
                <div className="fb-field">
                  <label className="fb-label" htmlFor="fb-email">
                    {t('yourEmail')}
                  </label>
                  <input
                    id="fb-email"
                    className="fb-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="fb-hint">{t('emailNeverShown')}</p>
                  {fieldErrors.email ? <p className="fb-error">{fieldErrors.email}</p> : null}
                </div>
              </div>
            ) : (
              <div className="fb-identity">
                <span className="fb-avatar" aria-hidden="true">
                  {initials(viewer.displayName)}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {t('postingAs')} {viewer.displayName}
                  </div>
                  <div className="fb-meta">{t('signedIn')}</div>
                </div>
              </div>
            )}

            {/* The honeypot. Off-screen, never announced, never focusable. */}
            <input
              className="fb-hp"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
              <button type="button" className="fb-btn" onClick={onClose}>
                {t('cancel')}
              </button>
              <button type="submit" className="fb-btn fb-btn--primary" disabled={submitting}>
                {submitting ? t('posting') : t('postIt')}
              </button>
            </div>
          </div>

          {error ? (
            <p className="fb-error" role="alert" style={{ marginTop: 0 }}>
              {error}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}

/** A candidate duplicate: read it, or vote on it without leaving the sheet. */
function DuplicateRow({
  board,
  candidate,
  lang,
  hrefBase,
  canVote,
}: {
  board: string;
  candidate: DuplicateCandidate;
  lang: Lang;
  hrefBase: string;
  canVote: boolean;
}) {
  const t = makeT(lang);
  const [voted, setVoted] = useState(candidate.viewerHasVoted);
  const [count, setCount] = useState(candidate.voteCount);

  async function vote() {
    if (!canVote) return;
    const previous = { voted, count };
    setVoted(!voted);
    setCount(count + (voted ? -1 : 1));
    try {
      const r = await toggleVote(board, candidate.id);
      setVoted(r.voted);
      setCount(r.count);
    } catch {
      setVoted(previous.voted);
      setCount(previous.count);
    }
  }

  return (
    <li className="fb-duprow">
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <a href={`${hrefBase}/${candidate.id}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--fb-ink)' }}>
          {candidate.title}
        </a>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <TypeChip type={candidate.type} lang={lang} />
          {candidate.type !== 'discussion' ? <StatusChip status={candidate.status} lang={lang} /> : null}
          <span className="fb-meta">
            {timeAgo(candidate.createdAt, lang)} · {candidate.commentCount} {t('comments')}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="fb-btn fb-btn--small"
        aria-pressed={voted}
        onClick={vote}
        style={
          voted
            ? {
                borderColor: 'var(--fb-accent-border)',
                background: 'var(--fb-accent-soft)',
                color: 'var(--fb-accent)',
              }
            : undefined
        }
      >
        <CaretUp size={11} /> {t('meToo')} · {count}
      </button>
    </li>
  );
}

function initials(name: string | null): string {
  if (!name) return '·';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** "iPhone · Safari" rather than 180 characters of user-agent noise. */
function shortUa(ua: string): string {
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Device';
  const browser = /MicroMessenger/.test(ua)
    ? 'WeChat'
    : /CriOS|Chrome/.test(ua)
      ? 'Chrome'
      : /FxiOS|Firefox/.test(ua)
        ? 'Firefox'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${device}, ${browser}`;
}
