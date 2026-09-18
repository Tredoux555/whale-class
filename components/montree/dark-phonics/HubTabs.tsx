'use client';

/**
 * HubTabs — the slim header row: wordmark, the three tabs, the EN/中 toggle.
 *
 * 🚨 IT COLLAPSES. While a lesson is open the Play tab needs the whole viewport
 * (the shelf sizes itself to 100dvh and a header stealing 64px of that pushes
 * the work off the bottom on a 768px-tall iPad). `slim` shrinks this bar to a
 * 44px rail — still a landmark, still reachable, no longer a second scroll
 * container above a full-height one.
 *
 * The tabs are real ARIA tabs: role="tablist" with roving tab semantics, arrow
 * keys move between them, and each one is a link so a middle-click still opens
 * ?tab=classroom in a new window.
 */

import Link from 'next/link';
import { useCallback, useRef } from 'react';

import type { HubLang } from '@/lib/montree/dark-phonics/hub-strings';

export type HubTab = 'play' | 'classroom' | 'community';
export const HUB_TABS: readonly HubTab[] = ['play', 'classroom', 'community'] as const;

export function isHubTab(v: unknown): v is HubTab {
  return typeof v === 'string' && (HUB_TABS as readonly string[]).includes(v);
}

export default function HubTabs({
  tab,
  onTab,
  lang,
  onLang,
  t,
  slim = false,
  brandHref = '/montree',
  backHref,
  backLabel,
}: {
  tab: HubTab;
  onTab: (next: HubTab) => void;
  lang: HubLang;
  onLang: (next: HubLang) => void;
  t: (key: string) => string;
  slim?: boolean;
  /** Where the wordmark goes. montree.xyz's hub points at the landing; the
   *  Whale Class mount at /parents points at that site's own home. */
  brandHref?: string;
  /** The /parents mount's "leave" affordance, shown next to the wordmark. */
  backHref?: string;
  backLabel?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = HUB_TABS.indexOf(tab);
      const next = HUB_TABS[(i + (e.key === 'ArrowRight' ? 1 : HUB_TABS.length - 1)) % HUB_TABS.length];
      onTab(next);
      e.preventDefault();
      // Move focus with the selection, the way a tablist is supposed to.
      requestAnimationFrame(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-dp-tab="${next}"]`)?.focus();
      });
    },
    [tab, onTab],
  );

  return (
    <header className={`dp-head${slim ? ' dp-head-slim' : ''}`}>
      <div className="dp-head-inner">
        <Link href={brandHref} className="dp-brand" aria-label={t('brand')}>
          <span className="dp-brand-mark" aria-hidden="true" />
          <span className="dp-brand-word">{t('brand')}</span>
        </Link>

        {backHref ? (
          <a className="dp-back" href={backHref}>
            {backLabel ?? 'Back'}
          </a>
        ) : null}

        <div
          className="dp-tabs"
          role="tablist"
          aria-label={t('tabs.label')}
          ref={listRef}
          onKeyDown={onKeyDown}
        >
          {HUB_TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              data-dp-tab={key}
              id={`dp-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`dp-panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              className={`dp-tab${tab === key ? ' dp-tab-on' : ''}`}
              onClick={() => onTab(key)}
            >
              {t(`tab.${key}`)}
            </button>
          ))}
        </div>

        <div className="dp-lang" role="group" aria-label={t('lang.label')}>
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`dp-lang-btn${lang === l ? ' dp-lang-on' : ''}`}
              aria-pressed={lang === l}
              onClick={() => onLang(l)}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
