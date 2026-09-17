// app/montree/library/feedback/[postId]/page.tsx
//
// One post. Server-rendered including the comments, because the most common
// arrival here is a link in a notification email opened on a phone — and that
// reader should see the answer, not a spinner.

import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/montree/feedback/data';
import { clientViewer, getPageContext } from '@/lib/montree/feedback/server';
import { makeT, timeAgo } from '@/lib/montree/feedback/strings';
import { statusLabel, statusTone } from '@/lib/montree/feedback/statuses';
import Shell from '@/components/montree/feedback/Shell';
import PostView from '@/components/montree/feedback/PostView';
import BoardNotReady from '@/components/montree/feedback/BoardNotReady';

export const dynamic = 'force-dynamic';

const BOARD_REF = 'public';
const HREF_BASE = '/montree/library/feedback';

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  try {
    const ctx = await getPageContext(BOARD_REF);
    if (!ctx.board) return { title: 'Feedback · Montree' };
    const post = await db.getPost(ctx.board.id, postId);
    // The title is user-written, so it is used as TEXT only — Next escapes it,
    // and nothing here interpolates it into markup.
    return { title: post ? `${post.title} · Feedback · Montree` : 'Feedback · Montree' };
  } catch {
    return { title: 'Feedback · Montree' };
  }
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { postId } = await params;
  const sp = await searchParams;
  const ctx = await getPageContext(BOARD_REF, sp.lang);
  if (!ctx.board || ctx.notReady) return <BoardNotReady lang={ctx.lang} />;

  const t = makeT(ctx.lang);
  const post = await db.getPost(ctx.board.id, postId);
  if (!post) notFound();

  // A merged duplicate redirects to its survivor. That is the promise the
  // merge dialog makes, and it is kept here rather than by a dead link.
  if (post.mergedInto) redirect(`${HREF_BASE}/${post.mergedInto}`);
  if (post.hidden && !ctx.viewer.isAdmin) notFound();

  const authorKey = await db.getPostAuthorKey(ctx.board.id, postId);
  const [comments, history, subscriberCount] = await Promise.all([
    db.listComments(ctx.board.id, postId, ctx.viewer.isAdmin, authorKey),
    db.listStatusHistory(ctx.board.id, postId),
    db.countSubscribers(postId),
  ]);

  if (ctx.viewer.key) {
    const voted = await db.viewerVotes([post.id], ctx.viewer.key);
    post.viewerHasVoted = voted.has(post.id);
    post.viewerSubscribed = await db.isSubscribed(post.id, ctx.viewer.key);
  }

  return (
    <Shell
      lang={ctx.lang}
      viewer={clientViewer(ctx.viewer)}
      hrefBase={HREF_BASE}
      current="board"
      aside={
        <>
          <section className="fb-panel">
            <h2>{t('history')}</h2>
            <ol className="fb-timeline">
              {history.map((h) => (
                <li key={h.id}>
                  <span className={`fb-tl-dot fb-tl-dot--${statusTone(h.toStatus)}`} />
                  <span>
                    <strong style={{ color: 'var(--fb-ink)' }}>{statusLabel(h.toStatus, ctx.lang)}</strong>
                    <br />
                    {h.byName ? `${h.byName} · ` : `${t('posted')} · `}
                    {timeAgo(h.createdAt, ctx.lang)}
                  </span>
                </li>
              ))}
              {history.length === 0 ? (
                <li>
                  <span className="fb-tl-dot" />
                  <span>
                    <strong style={{ color: 'var(--fb-ink)' }}>{statusLabel(post.status, ctx.lang)}</strong>
                    <br />
                    {t('posted')} · {timeAgo(post.createdAt, ctx.lang)}
                  </span>
                </li>
              ) : null}
            </ol>
          </section>
          <section className="fb-panel">
            <h2>{t('whoHears')}</h2>
            <p>
              {subscriberCount > 0 ? `${subscriberCount} · ` : ''}
              {t('whoHearsBody')}
            </p>
          </section>
        </>
      }
    >
      <PostView
        board={ctx.board.ref}
        post={post}
        comments={comments}
        lang={ctx.lang}
        viewer={clientViewer(ctx.viewer)}
        hrefBase={HREF_BASE}
        justPosted={sp.posted === '1'}
      />
    </Shell>
  );
}
