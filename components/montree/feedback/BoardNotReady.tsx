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

export default function BoardNotReady({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  return (
    <div className="fb-root" lang={lang === 'zh' ? 'zh-Hans' : 'en'}>
      <div className="fb-page">
        <main className="fb-main">
          <div className="fb-empty" style={{ marginTop: 48 }}>
            <h2>{t('boardNotReady')}</h2>
            <p>{t('boardNotReadyBody')}</p>
            <p className="fb-hint" style={{ marginBottom: 0 }}>
              migrations/359_feedback_board.sql
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
