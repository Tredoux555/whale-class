// app/montree/library/feedback/page.tsx
//
// The public product board.
//
// A server component that fetches the first page through the repo directly —
// no internal HTTP hop — so the list is in the HTML. It works logged out, and
// it works with JavaScript disabled right up to the point where you want to
// vote or write, which is the right place for that line.

import { db } from '@/lib/montree/feedback/data';
import { clientViewer, getPageContext } from '@/lib/montree/feedback/server';
import { makeT } from '@/lib/montree/feedback/strings';
import type { PostStatus } from '@/lib/montree/feedback/types';
import { statusLabel } from '@/lib/montree/feedback/statuses';
import FeedbackBoard from '@/components/montree/feedback/FeedbackBoard';
import Shell from '@/components/montree/feedback/Shell';
import { StatusChip } from '@/components/montree/feedback/StatusChip';
import BoardNotReady from '@/components/montree/feedback/BoardNotReady';
import type { ListResult } from '@/lib/montree/feedback/types';

export const dynamic = 'force-dynamic';

const BOARD_REF = 'public';
const HREF_BASE = '/montree/library/feedback';

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getPageContext(BOARD_REF, sp.lang);
  if (!ctx.board || ctx.notReady) return <BoardNotReady lang={ctx.lang} />;

  const t = makeT(ctx.lang);

  let initial: ListResult = {
    posts: [],
    nextCursor: null,
    counts: { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 },
  };
  try {
    initial = await db.listPosts(ctx.board.id, { sort: 'trending' }, ctx.viewer.key);
  } catch (err) {
    console.error('[feedback/page] initial list failed', err);
    return <BoardNotReady lang={ctx.lang} />;
  }

  // The legend teaches the pipeline, so it is in READING order, not storage
  // order. Confirmed, Fixed and Answered are left out on purpose: the six
  // below already say what happens to a post, and a nine-line key stops being
  // a key.
  const legend: PostStatus[] = ['open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined'];

  return (
    <Shell
      lang={ctx.lang}
      viewer={clientViewer(ctx.viewer)}
      hrefBase={HREF_BASE}
      current="board"
      aside={
        <>
          <section className="fb-panel">
            <h2>{t('aboutBoard')}</h2>
            <p>{t('aboutBoardBody')}</p>
            <p>{t('initialsNudge')}</p>
          </section>
          <section className="fb-panel">
            <h2>{t('statusKey')}</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {legend.map((status) => (
                <li
                  key={status}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--fb-ink-2)' }}
                >
                  <StatusChip status={status} lang={ctx.lang} />
                  <span>{statusHint(status, ctx.lang)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      }
    >
      <FeedbackBoard
        board={ctx.board.ref}
        boardName={ctx.lang === 'zh' ? t('boardTitle') : ctx.board.name}
        lang={ctx.lang}
        viewer={clientViewer(ctx.viewer)}
        initial={initial}
        hrefBase={HREF_BASE}
      />
    </Shell>
  );
}

/** One short line per status, so the legend teaches rather than just labels. */
function statusHint(status: PostStatus, lang: 'en' | 'zh'): string {
  const hints: Record<string, { en: string; zh: string }> = {
    open: { en: 'nobody has picked it up', zh: '还没有人跟进' },
    under_review: { en: 'we are reading it', zh: '我们正在看' },
    planned: { en: 'on the list', zh: '已列入计划' },
    in_progress: { en: 'being built', zh: '正在开发' },
    fixed: { en: 'put right', zh: '已修好' },
    shipped: { en: 'live for everyone', zh: '所有人可用' },
    wont_fix: { en: 'with a reason', zh: '并说明原因' },
    declined: { en: 'with a reason', zh: '并说明原因' },
  };
  return hints[status]?.[lang] ?? statusLabel(status, lang);
}
