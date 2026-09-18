// components/montree/feedback/BoardNotReady.tsx
//
// What the board shows when its tables do not exist yet.
//
// This is not error handling for its own sake. The migration is run by hand by
// the owner, in the Supabase SQL editor, which means there is a real window
// where the code is deployed and the tables are not. In that window the page
// must say something true and calm — not a stack trace, and not a blank list
// that implies nobody has ever posted.

import type { Lang } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';

export default function BoardNotReady({
  lang,
  migration = '359_feedback_board.sql',
}: {
  lang: Lang;
  /**
   * Which migration the reader should run. The public and school boards come
   * from 359; a product board (the Dark Phonics hub, 2026-09-18) needs 360 as
   * well, and pointing that reader at 359 sends them to a file they have
   * already run. Defaulted, so every existing caller is unchanged.
   */
  migration?: string;
}) {
  const t = makeT(lang);
  return (
    <div className="fb-root" lang={lang === 'zh' ? 'zh-Hans' : 'en'}>
      <div className="fb-page">
        <main className="fb-main">
          <div className="fb-empty" style={{ marginTop: 48 }}>
            <h2>{t('boardNotReady')}</h2>
            <p>{t('boardNotReadyBody')}</p>
            <p className="fb-hint" style={{ marginBottom: 0 }}>
              migrations/{migration}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
