// components/montree/feedback/PostView.tsx
//
// One post: the official reply pinned above everything, then the body (or the
// Problem template rendered as a definition list), then flat comments with
// quote-reply, then a sticky composer.
//
// The reading order is the argument. Someone arriving from an email wants the
// ANSWER, not the thread — so the team's reply sits at the top, once, and the
// conversation follows it.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Comment, Lang, Post, Viewer } from '@/lib/montree/feedback/types';
import { FLAG_REASONS } from '@/lib/montree/feedback/types';
import { makeT, timeAgo } from '@/lib/montree/feedback/strings';
import { typeSupportsStatus, typeSupportsVoting } from '@/lib/montree/feedback/statuses';
import { RoleChip, StatusChip, TypeChip } from './StatusChip';
import { BackIcon, CheckIcon, CloseIcon, QuoteIcon } from './icons';
import VotePill from './VotePill';
import { createComment, flag, markAnswer, setSubscribed } from './api';

export default function PostView({
  board,
  post,
  comments: initialComments,
  lang,
  viewer,
  hrefBase,
  justPosted,
}: {
  board: string;
  post: Post;
  comments: Comment[];
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'displayName' | 'role' | 'isAdmin'>;
  hrefBase: string;
  justPosted?: boolean;
}) {
  const t = makeT(lang);
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [subscribed, setSubscribedState] = useState(!!post.viewerSubscribed);
  const [toast, setToast] = useState<string | null>(justPosted ? t('toastPosted') : null);
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // The pinned card is the FIRST official reply. Later ones stay in the thread
  // in time order, because a second "Team" card at the top would bury the one
  // that actually answered.
  const official = comments.find((c) => c.isOfficial) ?? null;
  const thread = comments.filter((c) => c.id !== official?.id);

  // A plain function, not a useCallback: it is passed to one onClick, so
  // memoising it buys nothing, and the manual dependency list was one the
  // React compiler could not verify.
  async function toggleFollow() {
    const next = !subscribed;
    setSubscribedState(next);
    try {
      await setSubscribed(board, post.id, next);
      setToast(next ? t('toastSubscribed') : t('toastUnsubscribed'));
    } catch {
      setSubscribedState(!next);
      setToast(t('errorGeneric'));
    }
  }

  return (
    <>
      <Link href={hrefBase} className="fb-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <BackIcon size={14} />
        {t('allPosts')}
      </Link>

      {/* A GRID, not a flex row with a sidebar. Desktop keeps the canvas's
          shape — vote pill on the left, title and meta beside it, the body
          starting at the title's left edge. On a phone the SAME five children
          re-flow into one column (feedback.css), which a nested flex layout
          could not do: the title lives inside the right-hand column there, so
          it could never become full width. */}
      <article className="fb-post">
        <h1 className="fb-post-title">{post.title}</h1>

        <div className="fb-post-vote">
          {typeSupportsVoting(post.type) ? (
            <VotePill
              board={board}
              postId={post.id}
              title={post.title}
              count={post.voteCount}
              voted={!!post.viewerHasVoted}
              lang={lang}
              size="large"
              canVote={viewer.kind !== 'anon'}
            />
          ) : null}
        </div>

        <div className="fb-post-actions">
          {viewer.kind !== 'anon' ? (
            <button
              type="button"
              className="fb-btn fb-btn--small"
              aria-pressed={subscribed}
              onClick={() => void toggleFollow()}
            >
              {subscribed ? t('subscribed') : t('subscribe')}
            </button>
          ) : null}
          {viewer.kind !== 'anon' ? (
            <button type="button" className="fb-btn fb-btn--small" onClick={() => setFlagging(true)}>
              {t('flag')}
            </button>
          ) : null}
        </div>

        <div className="fb-post-meta">
          <TypeChip type={post.type} lang={lang} />
          {typeSupportsStatus(post.type) ? <StatusChip status={post.status} lang={lang} /> : null}
          <span className="fb-meta">
            {post.authorName} · {timeAgo(post.createdAt, lang)} · {post.commentCount} {t('comments')}
          </span>
        </div>

        <div className="fb-post-main">
          {/* Body, or the Problem template */}
          <div className="fb-card" style={{ marginTop: 0, padding: '20px 22px' }}>
            {post.template ? (
              <dl className="fb-template">
                {post.template.what ? (
                  <div>
                    <dt>{t('whatHappened')}</dt>
                    <dd>{post.template.what}</dd>
                  </div>
                ) : null}
                {post.template.expected ? (
                  <div>
                    <dt>{t('whatExpected')}</dt>
                    <dd>{post.template.expected}</dd>
                  </div>
                ) : null}
                {post.template.where || post.template.url ? (
                  <div>
                    <dt>{t('whereHappened')}</dt>
                    <dd style={{ fontSize: 15, color: 'var(--fb-ink-2)' }}>
                      {[post.template.where, post.template.url].filter(Boolean).join(' · ')}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="fb-prose">{post.body}</p>
            )}

            {post.screenshotPath ? (
              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  border: '1px solid var(--fb-line)',
                  borderRadius: 'var(--fb-r-control)',
                  background: 'var(--fb-sunk)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/montree/feedback/v2/screenshot?path=${encodeURIComponent(post.screenshotPath)}`}
                  alt=""
                  style={{ width: 74, height: 54, objectFit: 'cover', borderRadius: 7, background: '#e0d9cb' }}
                />
                <span className="fb-meta">{t('addScreenshot')}</span>
              </div>
            ) : null}
          </div>

          {/* The official reply, pinned */}
          {official ? (
            <section className="fb-official" aria-label={t('officialReply')} style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, flexWrap: 'wrap' }}>
                <span className="fb-chip fb-chip--official">
                  <CheckIcon size={12} />
                  {t('officialReply')}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{official.authorName}</span>
                <span className="fb-meta">
                  {t('pinnedReply')} · {timeAgo(official.createdAt, lang)}
                </span>
              </div>
              <p>{official.body}</p>
              {official.isAnswer ? (
                <span className="fb-answer-mark">
                  <CheckIcon size={11} />
                  {t('markedAnswer')}
                </span>
              ) : null}
            </section>
          ) : null}

          {/* The thread */}
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {post.commentCount} {t('comments')}
            </h2>
            <span className="fb-meta">{t('commentsHint')}</span>
          </div>

          <CommentThread
            board={board}
            post={post}
            comments={thread}
            lang={lang}
            viewer={viewer}
            onAdded={(c) => setComments((prev) => [...prev, c])}
            onAnswerMarked={(id) =>
              setComments((prev) => prev.map((c) => ({ ...c, isAnswer: c.id === id })))
            }
          />
        </div>
      </article>

      {flagging ? (
        <FlagDialog
          board={board}
          targetId={post.id}
          lang={lang}
          onClose={() => setFlagging(false)}
          onDone={(hidden) => {
            setFlagging(false);
            setToast(hidden ? t('flagged') : t('flagged'));
            if (hidden) router.refresh();
          }}
        />
      ) : null}

      {toast ? (
        <div className="fb-toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}

// ── Comments ────────────────────────────────────────────────────────────────

function CommentThread({
  board,
  post,
  comments,
  lang,
  viewer,
  onAdded,
  onAnswerMarked,
}: {
  board: string;
  post: Post;
  comments: Comment[];
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'displayName' | 'role' | 'isAdmin'>;
  onAdded: (c: Comment) => void;
  onAnswerMarked: (id: string) => void;
}) {
  const t = makeT(lang);
  const [body, setBody] = useState('');
  const [quoteOf, setQuoteOf] = useState<Comment | null>(null);
  const [official, setOfficial] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsIdentity = viewer.kind !== 'user' && !viewer.displayName;
  const canMarkAnswer = post.type === 'question' && viewer.isAdmin;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createComment(board, post.id, {
        body: body.trim(),
        quoteOf: quoteOf?.id ?? null,
        official: official && viewer.isAdmin,
        name: needsIdentity ? name.trim() : undefined,
        email: needsIdentity ? email.trim() : undefined,
        website: honeypot,
      });
      onAdded({
        ...result.comment,
        quoteAuthorName: quoteOf?.authorName ?? null,
        quoteExcerpt: quoteOf ? excerpt(quoteOf.body) : null,
      });
      setBody('');
      setQuoteOf(null);
      setOfficial(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ul className="fb-list" style={{ marginTop: 12 }}>
        {comments.map((c) => (
          <li key={c.id} className="fb-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.authorName}</span>
              <RoleChip role={c.authorRole} lang={lang} />
              <span className="fb-meta">
                {timeAgo(c.createdAt, lang)}
                {c.isAuthor ? ` \u00b7 ${t('author')}` : ''}
              </span>
              <div style={{ flexGrow: 1 }} />
              {viewer.kind !== 'anon' ? (
                <button
                  type="button"
                  className="fb-btn fb-btn--small"
                  onClick={() => setQuoteOf(c)}
                  aria-label={`${t('quoteReply')}: ${c.authorName}`}
                >
                  <QuoteIcon size={13} />
                  {t('reply')}
                </button>
              ) : null}
              {canMarkAnswer && !c.isAnswer ? (
                <button
                  type="button"
                  className="fb-btn fb-btn--small"
                  onClick={() =>
                    void markAnswer(board, post.id, c.id).then(() => onAnswerMarked(c.id))
                  }
                >
                  {t('markAnswer')}
                </button>
              ) : null}
            </div>
            {c.quoteExcerpt ? (
              <blockquote className="fb-quote">
                {c.quoteAuthorName}: “{c.quoteExcerpt}”
              </blockquote>
            ) : null}
            <p className="fb-prose fb-prose--small">{c.body}</p>
            {c.isAnswer ? (
              <span className="fb-answer-mark">
                <CheckIcon size={11} />
                {t('markedAnswer')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {viewer.kind === 'anon' && !needsIdentity ? null : (
        <form
          onSubmit={submit}
          style={{
            marginTop: 14,
            background: 'var(--fb-raised)',
            border: '1px solid var(--fb-line-strong)',
            borderRadius: 'var(--fb-r-card)',
            padding: '14px 16px',
          }}
        >
          <label className="fb-label" htmlFor="fb-comment">
            {t('addComment')}
          </label>
          {quoteOf ? (
            <blockquote className="fb-quote" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ flexGrow: 1 }}>
                {quoteOf.authorName}: “{excerpt(quoteOf.body)}”
              </span>
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => setQuoteOf(null)}
                style={{ border: 0, background: 'transparent', color: 'var(--fb-muted-2)' }}
              >
                <CloseIcon size={13} />
              </button>
            </blockquote>
          ) : null}
          <textarea
            id="fb-comment"
            className="fb-textarea"
            rows={2}
            value={body}
            placeholder={t('commentPlaceholder')}
            onChange={(e) => setBody(e.target.value)}
          />

          {needsIdentity ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <input
                className="fb-input"
                style={{ flex: '1 1 140px' }}
                type="text"
                placeholder={t('yourName')}
                aria-label={t('yourName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="fb-input"
                style={{ flex: '1 1 180px' }}
                type="email"
                inputMode="email"
                placeholder={t('yourEmail')}
                aria-label={t('yourEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : null}

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

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {viewer.isAdmin ? (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={official} onChange={(e) => setOfficial(e.target.checked)} />
                {t('officialReply')}
              </label>
            ) : null}
            <span className="fb-meta" style={{ flexGrow: 1 }}>
              {needsIdentity ? t('emailNeverShown') : `${t('postingAs')} ${viewer.displayName ?? ''}`}
            </span>
            <button type="submit" className="fb-btn fb-btn--primary" disabled={busy || !body.trim()}>
              {t('comment')}
            </button>
          </div>
          {error ? (
            <p className="fb-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </>
  );
}

// ── Flag dialog ─────────────────────────────────────────────────────────────

function FlagDialog({
  board,
  targetId,
  lang,
  onClose,
  onDone,
}: {
  board: string;
  targetId: string;
  lang: Lang;
  onClose: () => void;
  onDone: (hidden: boolean) => void;
}) {
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);
  const labels = {
    spam: t('flagSpam'),
    rude: t('flagRude'),
    private_info: t('flagPrivateInfo'),
    other: t('flagOther'),
  } as const;

  return (
    <div
      className="fb-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="fb-sheet fb-sheet--narrow" role="dialog" aria-modal="true" aria-label={t('flagTitle')}>
        <header className="fb-sheet-head">
          <h2>{t('flagTitle')}</h2>
          <button type="button" className="fb-iconbtn" aria-label={t('close')} onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>
        <div className="fb-sheet-body">
          {FLAG_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="fb-btn"
              disabled={busy}
              style={{ justifyContent: 'flex-start' }}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await flag(board, 'post', targetId, reason);
                  onDone(r.hidden);
                } catch {
                  onDone(false);
                }
              }}
            >
              {labels[reason]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function excerpt(body: string): string {
  return body.length > 90 ? `${body.slice(0, 90)}…` : body;
}

export { StatusChip };
