// app/montree/library/feedback/changelog/page.tsx
//
// "You asked, we built." Fully server-rendered — no client JavaScript at all
// beyond the language toggle in the header.

import type { Metadata } from 'next';
import { db } from '@/lib/montree/feedback/data';
import { clientViewer, getPageContext } from '@/lib/montree/feedback/server';
import Shell from '@/components/montree/feedback/Shell';
import Changelog from '@/components/montree/feedback/Changelog';
import BoardNotReady from '@/components/montree/feedback/BoardNotReady';
import type { ChangelogEntry } from '@/lib/montree/feedback/repo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Changelog · Feedback · Montree',
  description: 'Everything that shipped or got fixed, newest first.',
};

const BOARD_REF = 'public';
const HREF_BASE = '/montree/library/feedback';

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getPageContext(BOARD_REF, sp.lang);
  if (!ctx.board || ctx.notReady) return <BoardNotReady lang={ctx.lang} />;

  let entries: ChangelogEntry[] = [];
  try {
    entries = await db.listChangelog(ctx.board.id, 60);
  } catch (err) {
    console.error('[feedback/changelog] list failed', err);
  }

  return (
    <Shell
      lang={ctx.lang}
      viewer={clientViewer(ctx.viewer)}
      hrefBase={HREF_BASE}
      current="changelog"
      aside={
        <section className="fb-panel">
          <h2>{ctx.lang === 'zh' ? '累计' : 'So far'}</h2>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{entries.length}</div>
            <div className="fb-meta">
              {ctx.lang === 'zh' ? '条已上线或已修复' : 'posts shipped or fixed'}
            </div>
          </div>
        </section>
      }
    >
      <Changelog entries={entries} lang={ctx.lang} hrefBase={HREF_BASE} />
    </Shell>
  );
}
