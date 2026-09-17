// components/montree/feedback/Filters.tsx
//
// Search, type chips with counts, sort, status. Everything here is a real
// <button> or a real <select>: the whole control set has to work with a
// keyboard and with a thumb, and none of it may depend on hover.

'use client';

import type { Lang, PostStatus, PostType, SortKey } from '@/lib/montree/feedback/types';
import { POST_TYPES, SORT_KEYS } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';
import { statusLabel, STATUSES_BY_TYPE, typeLabel } from '@/lib/montree/feedback/statuses';
import { SearchIcon } from './icons';

export interface FilterState {
  q: string;
  type: PostType | null;
  status: PostStatus | null;
  sort: SortKey;
}

/** Statuses worth offering across the whole board, de-duplicated and ordered. */
function allStatuses(type: PostType | null): PostStatus[] {
  if (type) return [...STATUSES_BY_TYPE[type]];
  const seen = new Set<PostStatus>();
  const out: PostStatus[] = [];
  for (const t of POST_TYPES) {
    for (const s of STATUSES_BY_TYPE[t]) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export default function Filters({
  lang,
  state,
  counts,
  onChange,
}: {
  lang: Lang;
  state: FilterState;
  counts: Record<PostType | 'all', number>;
  onChange: (next: Partial<FilterState>) => void;
}) {
  const t = makeT(lang);
  const sortLabels: Record<SortKey, string> = {
    trending: t('sortTrending'),
    new: t('sortNew'),
    top: t('sortTop'),
    unanswered: t('sortUnanswered'),
  };

  return (
    <div className="fb-filters">
      <div className="fb-searchrow">
        <label className="fb-sr" htmlFor="fb-q">
          {t('search')}
        </label>
        <div className="fb-search">
          <SearchIcon size={17} style={{ color: '#8a8375', flexShrink: 0 }} />
          <input
            id="fb-q"
            type="search"
            value={state.q}
            placeholder={t('searchPlaceholder')}
            onChange={(e) => onChange({ q: e.target.value })}
          />
        </div>
        <label className="fb-sr" htmlFor="fb-status">
          {t('statusAll')}
        </label>
        <select
          id="fb-status"
          className="fb-select"
          value={state.status ?? ''}
          onChange={(e) => onChange({ status: (e.target.value || null) as PostStatus | null })}
        >
          <option value="">{t('statusAll')}</option>
          {allStatuses(state.type).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-chiprow">
        <button
          type="button"
          className="fb-typechip"
          aria-pressed={state.type === null}
          onClick={() => onChange({ type: null })}
        >
          {t('all')} {counts.all}
        </button>
        {POST_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="fb-typechip"
            aria-pressed={state.type === type}
            onClick={() => onChange({ type: state.type === type ? null : type })}
          >
            {typeLabel(type, lang)} {counts[type]}
          </button>
        ))}

        <div style={{ flexGrow: 1 }} />

        <div className="fb-sortgroup" role="group" aria-label={t('sortTrending')}>
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={state.sort === key}
              onClick={() => onChange({ sort: key })}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
