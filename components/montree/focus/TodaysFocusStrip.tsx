// components/montree/focus/TodaysFocusStrip.tsx
// Horizontal avatar strip of today's focus children.
// Green ring + ✓ when a tagged photo has been captured for them today.
// Tap anywhere on the strip → jump to the Focus List page to manage.
//
// Hides itself entirely when no children are on today's list — the strip is
// surface clutter if the teacher hasn't picked anyone yet. They can always
// reach the picker via the dashboard menu → Focus List.

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface FocusChild {
  id: string;
  child_id: string;
  name: string;
  photo_url: string | null;
  confirmed: boolean;
}

interface FocusData {
  focus_date: string;
  children: FocusChild[];
  total: number;
  confirmed_count: number;
}

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const [fallback, setFallback] = useState(!photoUrl);
  const initial = name.charAt(0).toUpperCase();
  if (!fallback && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFallback(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      }}
    >
      {initial}
    </div>
  );
}

export default function TodaysFocusStrip({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<FocusData | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let aborted = false;

    async function load() {
      try {
        const res = await montreeApi('/api/montree/dashboard/daily-focus');
        if (aborted || !mountedRef.current) return;
        if (res.ok) {
          const json = await res.json();
          if (mountedRef.current) setData(json);
        }
      } catch (e) {
        if (!aborted) console.error('[TodaysFocusStrip] load error:', e);
      }
    }

    load();
    return () => {
      aborted = true;
      mountedRef.current = false;
    };
  }, []);

  // Hide when no data or empty list — nothing useful to show
  if (!data || data.children.length === 0) return null;

  const title = t('todaysFocus.title');
  const manage = t('todaysFocus.manageButton');

  return (
    <Link
      href="/montree/dashboard/focus"
      className={
        'block bg-white rounded-2xl shadow-sm border border-slate-100 ' +
        (compact ? 'p-2.5' : 'p-3')
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-700">
          {title} · {data.confirmed_count}/{data.total}
        </div>
        <div className="text-[11px] text-indigo-600 font-medium">{manage}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.children.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center flex-shrink-0"
            style={{ width: compact ? 48 : 56 }}
          >
            <div
              className={
                'relative rounded-full ' +
                (c.confirmed ? 'ring-2 ring-emerald-500' : 'ring-2 ring-slate-200')
              }
            >
              <Avatar name={c.name} photoUrl={c.photo_url} size={compact ? 38 : 44} />
              {c.confirmed && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  ✓
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 truncate w-full text-center">
              {c.name}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
