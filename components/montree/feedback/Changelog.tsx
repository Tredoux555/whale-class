// components/montree/feedback/Changelog.tsx
//
// "You asked, we built" — every post that reached Shipped or Fixed, newest
// first, grouped by month, each line linking back to the post it came from.
//
// A server component: it takes rows and renders them, holds no state, and
// needs no JavaScript on the client at all. The changelog is the page a
// sceptical parent reads before deciding whether posting here is worth their
// evening, so it should paint instantly and work with JS off.

import Link from 'next/link';
import type { ChangelogEntry } from '@/lib/montree/feedback/repo';
import type { Lang } from '@/lib/montree/feedback/types';
import { makeT, monthHeading, shortDate } from '@/lib/montree/feedback/strings';
import { statusLabel, typeLabel } from '@/lib/montree/feedback/statuses';
import { CheckIcon } from './icons';

export default function Changelog({
  entries,
  lang,
  hrefBase,
}: {
  entries: ChangelogEntry[];
  lang: Lang;
  hrefBase: string;
}) {
  const t = makeT(lang);

  if (!entries.length) {
    return (
      <>
        <h1 className="fb-h1">{t('changelogTitle')}</h1>
        <p className="fb-lede" style={{ marginBottom: 26 }}>
          {t('changelogIntro')}
        </p>
        <div className="fb-empty">
          <p style={{ marginBottom: 0 }}>{t('changelogEmpty')}</p>
        </div>
      </>
    );
  }

  // Group by month without a date library: the key is year-month, and the
  // heading is formatted once per group.
  const groups: Array<{ key: string; label: string; items: ChangelogEntry[] }> = [];
  for (const entry of entries) {
    const d = new Date(entry.shippedAt);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(entry);
    else groups.push({ key, label: monthHeading(entry.shippedAt, lang), items: [entry] });
  }

  return (
    <>
      <h1 className="fb-h1">{t('changelogTitle')}</h1>
      <p className="fb-lede" style={{ marginBottom: 26 }}>
        {t('changelogIntro')}
      </p>

      {groups.map((group) => (
        <section key={group.key} style={{ marginBottom: 30 }}>
          <h2 className="fb-month">{group.label}</h2>
          <ul className="fb-list">
            {group.items.map((entry) => (
              <li key={entry.postId} className="fb-card fb-changelog-item">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}
                >
                  <span className="fb-chip">{typeLabel(entry.type, lang)}</span>
                  <span className="fb-chip fb-chip--green">
                    <CheckIcon size={11} />
                    {statusLabel(entry.status, lang)} · {shortDate(entry.shippedAt, lang)}
                  </span>
                  {entry.voteCount > 0 ? (
                    <span className="fb-meta">
                      {entry.voteCount} {t('votes')}
                    </span>
                  ) : null}
                </div>
                <Link href={`${hrefBase}/${entry.postId}`}>{entry.title}</Link>
                {entry.body ? (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--fb-ink-2)' }}>
                    {entry.body.length > 240 ? `${entry.body.slice(0, 240)}…` : entry.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
