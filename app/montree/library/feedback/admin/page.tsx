// app/montree/library/feedback/admin/page.tsx
//
// The team's queue.
//
// The gate here is a SECOND check, not the only one: every route the queue
// calls re-checks admin server-side, so a visitor who somehow rendered this
// page would find every button returns 403. Hiding it is courtesy; the routes
// are the security.

import type { Metadata } from 'next';
import { db } from '@/lib/montree/feedback/data';
import { clientViewer, getPageContext } from '@/lib/montree/feedback/server';
import { makeT } from '@/lib/montree/feedback/strings';
import Shell from '@/components/montree/feedback/Shell';
import AdminQueue from '@/components/montree/feedback/AdminQueue';
import BoardNotReady from '@/components/montree/feedback/BoardNotReady';
import type { ListResult } from '@/lib/montree/feedback/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Queue · Feedback · Montree',
  robots: { index: false, follow: false },
};

const BOARD_REF = 'public';
const HREF_BASE = '/montree/library/feedback';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getPageContext(BOARD_REF, sp.lang);
  if (!ctx.board || ctx.notReady) return <BoardNotReady lang={ctx.lang} />;

  const t = makeT(ctx.lang);

  if (!ctx.viewer.isAdmin) {
    return (
      <div className="fb-root">
        <div className="fb-page">
          <main className="fb-main">
            <div className="fb-empty" style={{ marginTop: 48 }}>
              <h2>{ctx.lang === 'zh' ? '这里只对团队开放' : 'This page is for the team'}</h2>
              <p>
                {ctx.lang === 'zh'
                  ? '如果你应该有权限，请让管理员把你的用户 ID 加入 FEEDBACK_ADMIN_USER_IDS。'
                  : 'If you should have access, ask for your user id to be added to FEEDBACK_ADMIN_USER_IDS.'}
              </p>
              <a className="fb-btn" href={HREF_BASE}>
                {t('allPosts')}
              </a>
            </div>
          </main>
        </div>
      </div>
    );
  }

  let initial: ListResult = {
    posts: [],
    nextCursor: null,
    counts: { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 },
  };
  let stats = { unanswered: 0, flagged: 0, autoHidden: 0 };
  try {
    [initial, stats] = await Promise.all([
      db.listPosts(ctx.board.id, { sort: 'unanswered', includeHidden: true, limit: 50 }, ctx.viewer.key),
      db.adminStats(ctx.board.id),
    ]);
  } catch (err) {
    console.error('[feedback/admin] load failed', err);
    return <BoardNotReady lang={ctx.lang} />;
  }

  return (
    <Shell lang={ctx.lang} viewer={clientViewer(ctx.viewer)} hrefBase={HREF_BASE} current="admin" admin>
      <AdminQueue board={ctx.board.ref} lang={ctx.lang} initial={initial} stats={stats} hrefBase={HREF_BASE} />
    </Shell>
  );
}
