// components/montree/feedback/Shell.tsx
//
// The header every feedback screen sits under: wordmark, two tabs, the
// language toggle, and Write.
//
// A server component with one client island (the toggle), so the header is in
// the first paint and the tabs are real links — a board whose navigation
// needed JavaScript would be unusable in the WeChat browser on a bad
// connection, which is exactly where half these posts come from.

import Link from 'next/link';
import type { Lang, Viewer } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';
import LangToggle from './LangToggle';
import { PlusIcon } from './icons';

export default function Shell({
  lang,
  viewer,
  hrefBase,
  current,
  admin,
  children,
  aside,
}: {
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'displayName' | 'isAdmin'>;
  hrefBase: string;
  current: 'board' | 'changelog' | 'admin';
  admin?: boolean;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const t = makeT(lang);

  return (
    <div className="fb-root" lang={lang === 'zh' ? 'zh-Hans' : 'en'}>
      <header className={`fb-header${admin ? ' fb-header--admin' : ''}`}>
        <Link href={hrefBase} className="fb-wordmark">
          Montree
        </Link>
        {admin ? <span className="fb-admin-badge">ADMIN</span> : null}

        <nav className="fb-nav" aria-label={t('feedback')}>
          <Link href={hrefBase} aria-current={current === 'board' ? 'page' : undefined}>
            {t('feedback')}
          </Link>
          <Link
            href={`${hrefBase}/changelog`}
            aria-current={current === 'changelog' ? 'page' : undefined}
          >
            {t('changelog')}
          </Link>
          {viewer.isAdmin ? (
            <Link href={`${hrefBase}/admin`} aria-current={current === 'admin' ? 'page' : undefined}>
              {t('adminQueue')}
            </Link>
          ) : null}
        </nav>

        <LangToggle lang={lang} />

        {viewer.displayName ? (
          <span className="fb-avatar" style={{ width: 30, height: 30, fontSize: 12 }} aria-hidden="true">
            {initials(viewer.displayName)}
          </span>
        ) : null}

        <Link href={`${hrefBase}?write=1`} className="fb-btn fb-btn--primary fb-btn--header">
          <PlusIcon size={15} />
          {t('write')}
        </Link>
      </header>

      <div className="fb-page">
        <main className="fb-main">{children}</main>
        {aside ? <aside className="fb-aside">{aside}</aside> : null}
      </div>

      {/* Phone only, and never on the board — the board has its own full-width
          Write bar, and two Write buttons on one screen is one too many. */}
      {current !== 'board' ? (
        <Link href={`${hrefBase}?write=1`} className="fb-btn fb-btn--primary fb-write-fab">
          <PlusIcon size={16} />
          {t('write')}
        </Link>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
