// /app/montree/dashboard/[childId]/progress/detail/page.tsx
// Detailed progress view with mastery timeline and area breakdown
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { AREA_CONFIG } from '@/lib/montree/types';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';

interface WorkProgress {
  id: string;
  work_name: string;
  area: string;
  status: string;
  presented_at: string | null;
  mastered_at: string | null;
}

export default function ProgressDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const childId = params.childId as string;

  const [progress, setProgress] = useState<WorkProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'mastered' | 'practicing'>('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;
    fetch(`/api/montree/progress/summary?child_id=${childId}`)
      .then(r => { if (!r.ok) throw new Error(`Progress summary: ${r.status}`); return r.json(); })
      .then(data => {
        setProgress(data.progress || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error(t('progress.load_error'));
        setLoading(false);
      });
  }, [childId]);


  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[normalizeArea(area)] || { name: area, icon: '?', color: '#888' };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric' });
  };

  // Filter progress
  const filteredProgress = progress.filter(p => {
    if (activeTab === 'mastered' && p.status !== 'completed') return false;
    if (activeTab === 'practicing' && p.status !== 'practicing') return false;
    if (selectedArea && p.area !== selectedArea) return false;
    return true;
  });

  // Group by area for stats
  const areaStats = Object.entries(AREA_CONFIG).map(([key, config]) => {
    const areaProgress = progress.filter(p => p.area === key || p.area === key.replace('math', 'mathematics'));
    const mastered = areaProgress.filter(p => p.status === 'completed').length;
    const practicing = areaProgress.filter(p => p.status === 'practicing').length;
    const presented = areaProgress.filter(p => p.status === 'presented').length;
    return { key, ...config, total: areaProgress.length, mastered, practicing, presented };
  }).filter(a => a.total > 0);

  const totalMastered = progress.filter(p => p.status === 'completed').length;
  const totalPracticing = progress.filter(p => p.status === 'practicing').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    );
  }


  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <Link href={`/montree/dashboard/${childId}/progress`} className="text-[#34d399] text-sm mb-2 inline-block">
          ← {t('progress.back')}
        </Link>
        <h1 className="text-2xl font-bold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('progress.detailed_title')}</h1>
      </div>

      {/* Stats Cards */}
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#34d399]">{totalMastered}</div>
          <div className="text-xs text-white/50">{t('progress.mastered')}</div>
        </div>
        <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-300">{totalPracticing}</div>
          <div className="text-xs text-white/50">{t('progress.practicing')}</div>
        </div>
        <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white/70">{progress.length}</div>
          <div className="text-xs text-white/50">{t('progress.total_works')}</div>
        </div>
      </div>

      {/* Area Filter */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              !selectedArea ? 'bg-[#1D6B48] text-white' : 'bg-white/[0.06] text-white/60 border border-[rgba(52,211,153,0.15)]'
            }`}
          >
            {t('progress.all_areas')}
          </button>
          {areaStats.map(area => (
            <button
              key={area.key}
              onClick={() => setSelectedArea(area.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
                selectedArea === area.key ? 'bg-[#1D6B48] text-white' : 'bg-white/[0.06] text-white/60 border border-[rgba(52,211,153,0.15)]'
              }`}
            >
              <AreaBadge area={area.key} size="xs" />
              <span>{area.name}</span>
              <span className="text-xs opacity-70">({area.total})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-1">
          {(['all', 'mastered', 'practicing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                activeTab === tab ? 'bg-[#1D6B48] text-white' : 'text-white/50'
              }`}
            >
              {tab === 'all' ? `${t('progress.all')} (${progress.length})` :
               tab === 'mastered' ? `${t('progress.mastered')} (${totalMastered})` :
               `${t('progress.practicing')} (${totalPracticing})`}
            </button>
          ))}
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-2xl mx-auto space-y-2">
        {filteredProgress.length === 0 ? (
          <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-white/50">{t('progress.no_works')}</p>
          </div>
        ) : (
          filteredProgress.map(p => {
            const area = getAreaConfig(p.area);
            return (
              <div key={p.id} className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 flex items-center gap-3">
                <AreaBadge area={p.area} size="sm" />
                <div className="flex-1">
                  <p className="font-medium text-white/90">{p.work_name}</p>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>{area.name}</span>
                    {p.presented_at && <span>• Started {formatDate(p.presented_at)}</span>}
                    {p.mastered_at && <span>• Mastered {formatDate(p.mastered_at)}</span>}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.status === 'completed' ? 'bg-emerald-500/15 text-emerald-200' :
                  p.status === 'practicing' ? 'bg-blue-500/15 text-blue-200' :
                  'bg-amber-500/15 text-amber-200'
                }`}>
                  {p.status === 'completed' ? `✓ ${t('progress.mastered')}` :
                   p.status === 'practicing' ? t('progress.practicing') : t('progress.presented')}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Area Breakdown */}
      {areaStats.length > 0 && !selectedArea && (
        <div className="max-w-2xl mx-auto mt-8">
          <h2 className="text-lg font-bold text-white/95 mb-4" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('progress.by_area')}</h2>
          <div className="space-y-3">
            {areaStats.map(area => (
              <div key={area.key} className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AreaBadge area={area.key} size="sm" />
                    <span className="font-medium text-white/90">{area.name}</span>
                  </div>
                  <span className="text-sm text-white/50">{area.mastered}/{area.total}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${area.total > 0 ? (area.mastered / area.total) * 100 : 0}%`,
                      backgroundColor: area.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
