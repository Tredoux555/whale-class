// components/montree/feedback/EmptyState.tsx
//
// Two different emptinesses, and they must not share copy.
//
//   'board'  — nothing has ever been posted. This is the most important screen
//              the board will ever show, because it is the one that decides
//              whether there is a second screen. It invites, it says no account
//              is needed, and it repeats the initials rule before anyone types.
//   'search' — the filter found nothing. That is not an invitation, it is a
//              dead end with a way out.

'use client';

import type { Lang } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';
import { PlusIcon } from './icons';

export default function EmptyState({
  lang,
  kind,
  onWrite,
}: {
  lang: Lang;
  kind: 'board' | 'search';
  onWrite?: () => void;
}) {
  const t = makeT(lang);

  if (kind === 'search') {
    return (
      <div className="fb-empty">
        <h2>{t('noResults')}</h2>
        <p>{t('noResultsBody')}</p>
        {onWrite ? (
          <button type="button" className="fb-btn fb-btn--primary" onClick={onWrite}>
            <PlusIcon size={15} />
            {t('write')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fb-empty">
      <h2>{t('emptyTitle')}</h2>
      <p>{t('emptyBody')}</p>
      {onWrite ? (
        <button type="button" className="fb-btn fb-btn--primary" onClick={onWrite}>
          <PlusIcon size={15} />
          {t('emptyCta')}
        </button>
      ) : null}
      <p className="fb-hint" style={{ marginTop: 16 }}>
        {t('emptyFoot')}
      </p>
    </div>
  );
}
