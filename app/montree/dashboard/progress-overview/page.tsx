// app/montree/dashboard/progress-overview/page.tsx
// Class Progress Overview — shows each child's curriculum progress over a
// selectable period (This Month / 6 Months / This Year).
// Data is sourced entirely from confirmed photo evidence in montree_media.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n/context';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkProgress {
  workName: string;
  workNameChinese: string | null;
  photoCount: number;
  status: 'P' | 'Pr' | 'MD';
  lastSeen: string;
}

interface AreaProgress {
  areaKey: string;
  areaName: string;
  works: WorkProgress[];
  totalPhotos: number;
}

interface ChildProgress {
  id: string;
  name: string;
  photo_url: string | null;
  totalPhotos: number;
  areas: AreaProgress[];
}

interface OverviewData {
  children: ChildProgress[];
  period: string;
  dateFrom: string;
  dateTo: string;
  totalChildren: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Period = 'month' | 'semester' | 'year';

const PERIODS: { key: Period; labelEn: string; labelZh: string }[] = [
  { key: 'month', labelEn: 'This Month', labelZh: '本月' },
  { key: 'semester', labelEn: '6 Months', labelZh: '半年' },
  { key: 'year', labelEn: 'This Year', labelZh: '今年' },
];

const AREA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  practical_life: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  sensorial: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  mathematics: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  language: { bg: 'bg-pink-100', text: 'text-pink-800', dot: 'bg-pink-500' },
  cultural: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; labelZh: string }> = {
  MD: { bg: 'bg-emerald-500', text: 'text-white', label: 'MD', labelZh: 'MD' },
  Pr: { bg: 'bg-amber-400', text: 'text-white', label: 'Pr', labelZh: 'Pr' },
  P: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'P', labelZh: 'P' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChildAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [showFallback, setShowFallback] = useState(!photoUrl);
  if (!showFallback && photoUrl) {
    return (
      <img
        src={getProxyUrl(photoUrl)}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={() => setShowFallback(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function WorkChip({
  work,
  locale,
}: {
  work: WorkProgress;
  locale: string;
}) {
  const s = STATUS_STYLE[work.status] || STATUS_STYLE.P;
  const displayName =
    locale === 'zh' && work.workNameChinese ? work.workNameChinese : work.workName;

  return (
    <span
      title={`${work.workName} — ${work.photoCount} photo${work.photoCount !== 1 ? 's' : ''}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className="max-w-[160px] truncate">{displayName}</span>
      <span className="opacity-75 font-normal ml-0.5">{work.photoCount}×</span>
    </span>
  );
}

function AreaRow({ area, locale }: { area: AreaProgress; locale: string }) {
  const colors = AREA_COLORS[area.areaKey] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-400',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
          {area.areaName}
          <span className="ml-1 font-normal opacity-60">({area.totalPhotos})</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1 pl-4">
        {area.works.map(w => (
          <WorkChip key={w.workName} work={w} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function ChildCard({ child, locale }: { child: ChildProgress; locale: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white/[0.06] rounded-xl border border-[rgba(52,211,153,0.15)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
      >
        <ChildAvatar name={child.name} photoUrl={child.photo_url} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white/90 text-sm">{child.name}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {child.totalPhotos} photo{child.totalPhotos !== 1 ? 's' : ''} ·{' '}
            {child.areas.length} area{child.areas.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Area summary pills */}
        <div className="flex gap-1 flex-shrink-0">
          {child.areas.map(a => {
            const colors = AREA_COLORS[a.areaKey] || { dot: 'bg-gray-400', bg: '', text: '' };
            return (
              <span
                key={a.areaKey}
                title={`${a.areaName}: ${a.totalPhotos} photos`}
                className={`w-2 h-2 rounded-full ${colors.dot}`}
              />
            );
          })}
        </div>

        <span className="text-white/40 ml-1 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Body */}
      {expanded && child.areas.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/10 pt-3">
          {child.areas.map(area => (
            <AreaRow key={area.areaKey} area={area} locale={locale} />
          ))}
        </div>
      )}

      {expanded && child.areas.length === 0 && (
        <p className="px-4 pb-4 text-sm text-white/40 italic">
          {locale === 'zh' ? '本期间无照片记录' : 'No photo evidence this period'}
        </p>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ locale }: { locale: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
      <span className="font-medium">
        {locale === 'zh' ? '状态：' : 'Status:'}
      </span>
      {(['MD', 'Pr', 'P'] as const).map(s => {
        const style = STATUS_STYLE[s];
        const desc =
          s === 'MD'
            ? locale === 'zh'
              ? '≥4 张 · 已掌握'
              : '≥4 photos · Mastered'
            : s === 'Pr'
            ? locale === 'zh'
              ? '2–3 张 · 练习中'
              : '2–3 photos · Practicing'
            : locale === 'zh'
            ? '1 张 · 已呈现'
            : '1 photo · Presented';
        return (
          <span key={s} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
            >
              {s}
            </span>
            <span>{desc}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  children,
  locale,
}: {
  children: ChildProgress[];
  locale: string;
}) {
  const totalPhotos = children.reduce((s, c) => s + c.totalPhotos, 0);
  const activeChildren = children.filter(c => c.totalPhotos > 0).length;

  // Count by status across all children
  let totalMD = 0,
    totalPr = 0,
    totalP = 0;
  for (const child of children) {
    for (const area of child.areas) {
      for (const w of area.works) {
        if (w.status === 'MD') totalMD++;
        else if (w.status === 'Pr') totalPr++;
        else totalP++;
      }
    }
  }

  const items = [
    {
      emoji: '📸',
      value: totalPhotos,
      label: locale === 'zh' ? '张照片' : 'photos',
    },
    {
      emoji: '👦',
      value: activeChildren,
      label: locale === 'zh' ? '名儿童有记录' : 'children active',
    },
    {
      emoji: '🏆',
      value: totalMD,
      label: locale === 'zh' ? '项已掌握' : 'works mastered',
    },
    {
      emoji: '⚡',
      value: totalPr,
      label: locale === 'zh' ? '项练习中' : 'practicing',
    },
    {
      emoji: '🌱',
      value: totalP,
      label: locale === 'zh' ? '项已呈现' : 'presented',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {items.map(item => (
        <div
          key={item.label}
          className="bg-white/[0.06] rounded-lg border border-[rgba(52,211,153,0.15)] px-2 py-2 text-center"
        >
          <div className="text-lg">{item.emoji}</div>
          <div className="text-lg font-bold text-white/90 leading-tight">{item.value}</div>
          <div className="text-[10px] text-white/40 leading-tight mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressOverviewPage() {
  const { locale } = useI18n();
  const router = useRouter();

  const [period, setPeriod] = useState<Period>('semester');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await montreeApi(`/api/montree/dashboard/progress-overview?period=${p}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (err) {
      console.error('[ProgressOverview] fetch error', err);
      setError(locale === 'zh' ? '加载失败，请重试' : 'Failed to load — please try again');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const filteredChildren = (data?.children || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Format date range label
  const dateLabel = data
    ? (() => {
        const from = new Date(data.dateFrom);
        const to = new Date(data.dateTo);
        const fmt = (d: Date) =>
          d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: from.getFullYear() !== to.getFullYear() ? 'numeric' : undefined,
          });
        return `${fmt(from)} – ${fmt(to)}`;
      })()
    : '';

  return (
    <div
      className="min-h-screen bg-[#0a1a0f] pb-20"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    >
      {/* Spacer for fixed header */}
      <div className="h-16" />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Page title */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white/90">
            {locale === 'zh' ? '班级进度总览' : 'Class Progress Overview'}
          </h1>
          {dateLabel && (
            <p className="text-xs text-white/40 mt-0.5">{dateLabel}</p>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-white/60 border border-[rgba(52,211,153,0.15)] hover:bg-white/[0.1]'
              }`}
            >
              {locale === 'zh' ? p.labelZh : p.labelEn}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/40">
              {locale === 'zh' ? '加载中…' : 'Loading…'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => fetchData(period)}
              className="mt-2 text-xs text-red-300 underline"
            >
              {locale === 'zh' ? '重试' : 'Try again'}
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* Summary bar */}
            <SummaryBar children={data.children} locale={locale} />

            {/* Legend */}
            <div className="mb-4">
              <Legend locale={locale} />
            </div>

            {/* Search */}
            {data.children.length > 5 && (
              <div className="mb-3">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={locale === 'zh' ? '搜索儿童…' : 'Search children…'}
                  className="w-full bg-white/[0.06] text-white/90 placeholder:text-white/40 border border-[rgba(52,211,153,0.15)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            )}

            {/* Child cards */}
            <div className="flex flex-col gap-3">
              {filteredChildren.length === 0 && (
                <div className="text-center py-12 text-white/40 text-sm">
                  {search
                    ? locale === 'zh'
                      ? '未找到儿童'
                      : 'No children found'
                    : locale === 'zh'
                    ? '本期间无数据'
                    : 'No data for this period'}
                </div>
              )}
              {filteredChildren.map(child => (
                <ChildCard key={child.id} child={child} locale={locale} />
              ))}
            </div>

            {/* Refresh hint */}
            <p className="text-center text-xs text-white/30 mt-6">
              {locale === 'zh'
                ? '数据来自已确认的照片记录'
                : 'Data sourced from confirmed photo evidence'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
