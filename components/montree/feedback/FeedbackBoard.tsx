// components/montree/feedback/FeedbackBoard.tsx
//
// The board-agnostic root. THIS is the mount point another product uses:
//
//   <FeedbackBoard board="school:8f2c…" lang="en" viewer={viewer}
//                  initial={initialListResult} />
//
// It knows nothing about Montree's library routes beyond the `hrefBase` it is
// handed, and nothing about which board it is showing beyond the `board`
// string it puts on every request. Everything under it is the same.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Lang, ListResult, PostStatus, PostType, SortKey, Viewer } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';
import ComposeSheet from './ComposeSheet';
import EmptyState from './EmptyState';
import Filters, { type FilterState } from './Filters';
import PostRow from './PostRow';
import { PlusIcon } from './icons';
import { listPosts } from './api';

export interface FeedbackBoardProps {
  /** 'public' | 'school:<uuid>' */
  board: string;
  boardName: string;
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'displayName' | 'role' | 'isAdmin'>;
  /** Server-rendered first page, so the board is readable before any JS runs. */
  initial: ListResult;
  /** Where a post's page lives, e.g. '/montree/library/feedback'. */
  hrefBase: string;
}

export default function FeedbackBoard({
  board,
  boardName,
  lang,
  viewer,
  initial,
  hrefBase,
}: FeedbackBoardProps) {
  const t = makeT(lang);
  const [result, setResult] = useState<ListResult>(initial);
  const [filters, setFilters] = useState<FilterState>({
    q: '',
    type: null,
    status: null,
    sort: 'trending',
  });
  const [loading, setLoading] = useState(false);
  // ?write=1 opens the composer. That is what the header's Write button links
  // to, so it works as a plain <a> before any JavaScript has run and as a
  // shareable link into the compose sheet afterwards.
  const searchParams = useSearchParams();
  const [composing, setComposing] = useState(searchParams?.get('write') === '1');
  const [toast, setToast] = useState<string | null>(null);
  const firstRender = useRef(true);

  const refetch = useCallback(
    async (next: FilterState, cursor: string | null = null) => {
      setLoading(true);
      try {
        const data = await listPosts(board, {
          q: next.q || undefined,
          type: next.type,
          status: next.status,
          sort: next.sort,
          cursor,
        });
        setResult((prev) =>
          cursor ? { ...data, posts: [...prev.posts, ...data.posts] } : data,
        );
      } catch {
        setToast(t('errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [board, t],
  );

  // Debounced refetch. The first render is the server's list, already correct;
  // refetching it immediately would be a wasted request and a visible flicker.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => void refetch(filters), filters.q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters, refetch]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const onChange = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const filtered = filters.q || filters.type || filters.status;
  const showEmpty = result.posts.length === 0;

  return (
    <>
      <div>
        <h1 className="fb-h1">{boardName || t('boardTitle')}</h1>
        <p className="fb-lede">{t('boardIntro')}</p>
      </div>

      <Filters lang={lang} state={filters} counts={result.counts} onChange={onChange} />

      {showEmpty ? (
        <EmptyState lang={lang} kind={filtered ? 'search' : 'board'} onWrite={() => setComposing(true)} />
      ) : (
        <>
          <ul className="fb-list" aria-busy={loading}>
            {result.posts.map((post) => (
              <PostRow
                key={post.id}
                board={board}
                post={post}
                lang={lang}
                viewer={viewer}
                hrefBase={hrefBase}
                onNeedsIdentity={() => setComposing(true)}
              />
            ))}
          </ul>
          {result.nextCursor ? (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="fb-btn"
                disabled={loading}
                onClick={() => void refetch(filters, result.nextCursor)}
              >
                {loading ? t('loading') : t('sortNew')}
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* The sticky Write button. Visible only under 640px (see feedback.css);
          the desktop one lives in the header. */}
      <button
        type="button"
        className="fb-btn fb-btn--primary fb-sticky-write"
        onClick={() => setComposing(true)}
      >
        <PlusIcon size={16} />
        {t('write')}
      </button>

      {composing ? (
        <ComposeSheet
          board={board}
          boardName={boardName}
          lang={lang}
          viewer={viewer}
          hrefBase={hrefBase}
          onClose={() => setComposing(false)}
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

/** Opens the compose sheet from anywhere else on the page (e.g. the header). */
export function useComposeTrigger() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export type { FilterState, PostStatus, PostType, SortKey };
