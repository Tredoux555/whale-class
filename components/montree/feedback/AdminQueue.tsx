// components/montree/feedback/AdminQueue.tsx
//
// The team's side of the board: unanswered first, one-click status, merge,
// hide and restore.
//
// It is deliberately a WORKING view, not a dashboard. Everything an admin does
// most — move a status, reply, hide — is one control on the row, and the row
// keeps the same shape whether it is a Problem with five statuses or a
// Question with two, so the eye does not have to re-learn the line.
//
// Every control here still goes through the same API as the public board, and
// every one of those routes re-checks admin server-side. Rendering this
// component does not make anyone an admin.

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Lang, ListResult, Post, PostStatus } from '@/lib/montree/feedback/types';
import { makeT, timeAgo } from '@/lib/montree/feedback/strings';
import { allowedTransitions, statusLabel, typeSupportsStatus } from '@/lib/montree/feedback/statuses';
import { TypeChip } from './StatusChip';
import { ArrowDownIcon, CloseIcon, EyeOffIcon } from './icons';
import { listPosts, mergeInto, patchPost } from './api';

export default function AdminQueue({
  board,
  lang,
  initial,
  stats,
  hrefBase,
}: {
  board: string;
  lang: Lang;
  initial: ListResult;
  stats: { unanswered: number; flagged: number; autoHidden: number };
  hrefBase: string;
}) {
  const t = makeT(lang);
  const [posts, setPosts] = useState<Post[]>(initial.posts);
  const [unansweredFirst, setUnansweredFirst] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [merging, setMerging] = useState<Post | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await listPosts(board, {
        sort: unansweredFirst ? 'unanswered' : 'trending',
        includeHidden: true,
      });
      setPosts(data.posts);
    } catch {
      setToast(t('errorGeneric'));
    }
  }, [board, unansweredFirst, t]);

  // The queue re-reads when its sort changes. This is a fetch, not a derived
  // value, so an effect is the right tool.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function changeStatus(post: Post, status: PostStatus) {
    const previous = posts;
    setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, status } : x)));
    try {
      await patchPost(board, post.id, { status });
      setToast(`${post.title.slice(0, 40)} → ${statusLabel(status, lang)}`);
    } catch (err) {
      setPosts(previous);
      setToast(err instanceof Error ? err.message : t('errorGeneric'));
    }
  }

  async function setHidden(post: Post, hidden: boolean) {
    const previous = posts;
    setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, hidden } : x)));
    try {
      await patchPost(board, post.id, { hidden });
    } catch {
      setPosts(previous);
      setToast(t('errorGeneric'));
    }
  }

  const visible = flaggedOnly ? posts.filter((p) => p.hidden) : posts;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, minWidth: 220 }}>
          <h1 className="fb-h1" style={{ fontSize: 24 }}>
            {t('adminQueue')}
          </h1>
          <p className="fb-lede" style={{ fontSize: 14 }}>
            {stats.unanswered} {lang === 'zh' ? '条还没有团队回复' : 'posts with no team reply'} ·{' '}
            {stats.flagged} {lang === 'zh' ? '条被举报' : 'flagged'} · {stats.autoHidden}{' '}
            {t('autoHidden')}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={unansweredFirst}
          className="fb-toggle"
          onClick={() => setUnansweredFirst((v) => !v)}
        >
          <span className="fb-toggle-track" aria-hidden="true">
            <span className="fb-toggle-knob" />
          </span>
          {t('adminUnansweredFirst')}
        </button>

        <button
          type="button"
          className="fb-btn fb-btn--small"
          aria-pressed={flaggedOnly}
          onClick={() => setFlaggedOnly((v) => !v)}
          style={
            flaggedOnly
              ? { borderColor: 'var(--fb-accent-border)', background: 'var(--fb-accent-soft)' }
              : undefined
          }
        >
          {t('adminFlaggedOnly')}
        </button>
      </div>

      <ul className="fb-list" style={{ marginTop: 16 }}>
        {visible.map((post) => {
          const flagged = post.hidden;
          const unanswered = !post.hasOfficialReply;
          const rowClass = [
            'fb-queue-row',
            flagged ? 'fb-queue-row--flagged' : unanswered ? 'fb-queue-row--unanswered' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const options = [post.status, ...allowedTransitions(post.type, post.status)];

          return (
            <li key={post.id} className={rowClass}>
              <div className="fb-queue-votes">
                <strong>{post.voteCount || '—'}</strong>
                <span>{post.voteCount ? t('votes') : lang === 'zh' ? '无支持' : 'no vote'}</span>
              </div>

              <div className="fb-queue-main">
                <Link href={`${hrefBase}/${post.id}`} className="fb-row-title" style={{ fontSize: 17 }}>
                  {post.title}
                </Link>
                <div className="fb-row-meta" style={{ marginTop: 5 }}>
                  <TypeChip type={post.type} lang={lang} />
                  {flagged ? (
                    <span className="fb-chip fb-chip--amber">{t('autoHidden')}</span>
                  ) : unanswered ? (
                    <span className="fb-flag-note">
                      <span className="fb-dot" />
                      {t('noTeamReply')}
                    </span>
                  ) : (
                    <span className="fb-chip fb-chip--green">{t('teamReplied')}</span>
                  )}
                  <span className="fb-meta">
                    {post.authorName} · {timeAgo(post.lastActivityAt, lang)} · {post.commentCount}{' '}
                    {t('comments')}
                  </span>
                </div>
              </div>

              <div className="fb-queue-actions">
                {typeSupportsStatus(post.type) && !flagged ? (
                  <>
                    <label className="fb-sr" htmlFor={`fb-st-${post.id}`}>
                      {t('adminStatus')}: {post.title}
                    </label>
                    <select
                      id={`fb-st-${post.id}`}
                      className="fb-select"
                      value={post.status}
                      onChange={(e) => void changeStatus(post, e.target.value as PostStatus)}
                    >
                      {options.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s, lang)}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                <button type="button" className="fb-btn fb-btn--small" onClick={() => setMerging(post)}>
                  {t('merge')}
                </button>

                <Link href={`${hrefBase}/${post.id}`} className="fb-btn fb-btn--small">
                  {post.type === 'question' ? t('markAnswer') : t('reply')}
                </Link>

                {flagged ? (
                  <button
                    type="button"
                    className="fb-btn fb-btn--small"
                    onClick={() => void setHidden(post, false)}
                  >
                    {t('restore')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="fb-btn fb-btn--small"
                    aria-label={`${t('hide')}: ${post.title}`}
                    onClick={() => void setHidden(post, true)}
                  >
                    <EyeOffIcon size={17} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {merging ? (
        <MergeDialog
          board={board}
          lang={lang}
          survivor={merging}
          candidates={posts.filter((p) => p.id !== merging.id && !p.mergedInto)}
          onClose={() => setMerging(null)}
          onMerged={() => {
            setMerging(null);
            void reload();
            setToast(t('merge'));
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

/**
 * Merge. The dialog states the arithmetic BEFORE it happens — votes, subscribers,
 * comments — because a merge is irreversible from the UI and "31 votes (24 + 7,
 * duplicates dropped)" is the only sentence that makes that safe to press.
 */
function MergeDialog({
  board,
  lang,
  survivor,
  candidates,
  onClose,
  onMerged,
}: {
  board: string;
  lang: Lang;
  survivor: Post;
  candidates: Post[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const t = makeT(lang);
  const [duplicateId, setDuplicateId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duplicate = candidates.find((c) => c.id === duplicateId) ?? null;

  return (
    <div
      className="fb-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="fb-sheet fb-sheet--narrow" role="dialog" aria-modal="true" aria-label={t('mergeTitle')}>
        <header className="fb-sheet-head">
          <h2>{t('mergeTitle')}</h2>
          <button type="button" className="fb-iconbtn" aria-label={t('close')} onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="fb-sheet-body">
          <p className="fb-lede" style={{ fontSize: 14 }}>
            {t('mergeBody')}
          </p>

          <div>
            <label className="fb-label" htmlFor="fb-dup">
              {t('mergeDuplicate')}
            </label>
            <select
              id="fb-dup"
              className="fb-select"
              style={{ width: '100%' }}
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
            >
              <option value="">—</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {duplicate ? (
            <>
              <div className="fb-merge-slot">
                <div className="fb-merge-kicker">{t('mergeDuplicate')}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{duplicate.title}</div>
                <div className="fb-meta" style={{ marginTop: 5 }}>
                  {duplicate.voteCount} {t('votes')} · {duplicate.commentCount} {t('comments')}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--fb-faint)' }} aria-hidden="true">
                <ArrowDownIcon size={20} />
              </div>
              <div className="fb-merge-slot fb-merge-slot--survivor">
                <div className="fb-merge-kicker" style={{ color: 'var(--fb-accent-deep)' }}>
                  {t('mergeSurvivor')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{survivor.title}</div>
                <div className="fb-meta" style={{ marginTop: 5, color: '#46513a' }}>
                  {survivor.voteCount} {t('votes')} · {survivor.commentCount} {t('comments')}
                </div>
              </div>

              <div className="fb-merge-after">
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    ≤ {survivor.voteCount + duplicate.voteCount}
                  </div>
                  <div className="fb-meta">
                    {t('votes')} ({survivor.voteCount} + {duplicate.voteCount}
                    {lang === 'zh' ? '，重复的会去掉' : ', duplicates dropped'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {survivor.commentCount + duplicate.commentCount}
                  </div>
                  <div className="fb-meta">{t('comments')}</div>
                </div>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="fb-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="fb-sheet-foot">
            <span className="fb-meta" style={{ flexGrow: 1 }}>
              {lang === 'zh' ? '此操作会记录在状态历史里' : 'Recorded in the status history'}
            </span>
            <button type="button" className="fb-btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              disabled={!duplicate || busy}
              onClick={async () => {
                if (!duplicate) return;
                setBusy(true);
                setError(null);
                try {
                  await mergeInto(board, survivor.id, duplicate.id);
                  onMerged();
                } catch (err) {
                  setError(err instanceof Error ? err.message : t('errorGeneric'));
                  setBusy(false);
                }
              }}
            >
              {t('mergeConfirm')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
