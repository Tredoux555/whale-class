// app/montree/library/tools/classroom-helpers/page.tsx
// Classroom Helpers — the jobs poster and the name strips that pop into it,
// as one tool with a tab switcher instead of two separate library entries.
// Two halves of the same ritual: a teacher who prints one wants the other
// close by, not a second search through the tools list.
//
// 🚨 ONLY THE ACTIVE TAB'S TOOL COMPONENT IS EVER MOUNTED. ClassroomJobsTool
// and HelperStripsTool each carry their own top-level print stylesheet (a
// poster `@page` rule and a name-strips `@page` rule). Mounting both at once
// — even with one hidden by `display:none` — would put both `<style>` tags
// in the DOM together, and the browser's print engine does not promise the
// hidden one loses the `@page` cascade. Conditional mount (`tab === 'poster'
// ? <A/> : <B/>`) is the only safe pattern here; see the render below.
'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import ClassroomJobsTool from '@/components/montree/tools/ClassroomJobsTool';
import HelperStripsTool from '@/components/montree/tools/HelperStripsTool';

type Tab = 'poster' | 'strips';

/**
 * 🚨 THE COPY, AND WHY IT LIVES HERE. Same posture as the two tools this page
 * hosts (see their own COPY notes) — Montree's i18n hook is strict across all
 * twelve locales, and this build is not adding locale keys for the switcher
 * chrome itself (only for the tools-index card, which needed real
 * translations — see app/montree/library/tools/page.tsx). So the tab
 * switcher ships its own English through `tx()`, exactly like the tool
 * bodies it wraps.
 */
const COPY: Record<string, string> = {
  'classroomHelpers.title': 'Classroom Helpers',
  'classroomHelpers.tabPoster': 'Jobs poster',
  'classroomHelpers.tabStrips': 'Name strips',
  'classroomHelpers.hintPoster':
    'Print the chart with names or with empty slots for the strips.',
  'classroomHelpers.hintStrips': "Cut-out strips that fit the poster's slot mode.",
};

function ClassroomHelpersInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the active tab — no local
  // state to fall out of sync with it, and a deep link (?tab=strips) reads
  // right on the very first render, with no extra effect or render pass.
  const tab: Tab = searchParams.get('tab') === 'strips' ? 'strips' : 'poster';

  const tx = useCallback(
    (key: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return COPY[key] ?? key;
      return value;
    },
    [t]
  );

  const switchTab = useCallback(
    (next: Tab) => {
      router.replace(`/montree/library/tools/classroom-helpers?tab=${next}`, { scroll: false });
    },
    [router]
  );


  return (
    <>
      <div className="print:hidden relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => router.push('/montree/library/tools')}
            className="btn btn-ghost btn-icon btn-sm"
          >
            ←
          </button>
          <span className="text-xl">🪧</span>
          <h1 className="font-bold text-white/95">{tx('classroomHelpers.title')}</h1>
        </div>
        <div className="flex gap-2" role="tablist" aria-label={tx('classroomHelpers.title')}>
          <button
            role="tab"
            aria-selected={tab === 'poster'}
            onClick={() => switchTab('poster')}
            className={`btn btn-sm ${tab === 'poster' ? 'btn-primary' : 'btn-ghost'}`}
          >
            🪧 {tx('classroomHelpers.tabPoster')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'strips'}
            onClick={() => switchTab('strips')}
            className={`btn btn-sm ${tab === 'strips' ? 'btn-primary' : 'btn-ghost'}`}
          >
            ✂️ {tx('classroomHelpers.tabStrips')}
          </button>
        </div>
        <p className="text-xs text-white/50 mt-2">
          {tab === 'poster' ? tx('classroomHelpers.hintPoster') : tx('classroomHelpers.hintStrips')}
        </p>
      </div>

      {/* 🚨 CONDITIONAL MOUNT — see the file header note. Never render both
          tool components at the same time. */}
      {tab === 'poster' ? (
        <ClassroomJobsTool onSwitchToStrips={() => switchTab('strips')} />
      ) : (
        <HelperStripsTool />
      )}
    </>
  );
}

export default function ClassroomHelpersPage() {
  return (
    <Suspense>
      <ClassroomHelpersInner />
    </Suspense>
  );
}
