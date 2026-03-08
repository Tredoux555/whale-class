// Classroom Overview Print Page
// Shows ALL children with their current shelf works + large writing space
// Optimized for printing on A4 landscape
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { AREA_CONFIG } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n } from '@/lib/montree/i18n';

interface FocusWork {
  name: string;
  chineseName: string | null;
}

interface ChildData {
  id: string;
  name: string;
  photo_url?: string;
  focus_works: Record<string, FocusWork>;
}

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export default function ClassroomOverviewPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    // Redirect homeschool parents — they only have 1 child
    if (isHomeschoolParent(sess)) {
      router.push('/montree/dashboard');
      return;
    }
    setSession(sess);

    // Fetch all children + focus works
    const controller = new AbortController();
    montreeApi(`/api/montree/focus-works/batch?classroom_id=${sess.classroom?.id}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setChildren(data.children || []);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [router]);

  const getAreaConfig = (area: string) => {
    const normalized = normalizeArea(area);
    return AREA_CONFIG[normalized] || { name: area, icon: '?', color: '#888' };
  };

  const getAreaLabel = (area: string): string => {
    const key = `areas.${area}` as keyof typeof t;
    return t(key as any) || getAreaConfig(area).name;
  };

  const today = new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{t('common.connectionError')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page-break { page-break-after: always; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 text-sm font-medium"
        >
          ← {t('common.back')}
        </button>
        <h1 className="font-bold text-lg">{t('print.classOverview')}</h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-white text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-50"
        >
          🖨️ {t('print.printPage')}
        </button>
      </div>

      {/* Print content */}
      <div className="bg-white min-h-screen">
        {/* Header — prints on every page via repeat */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                📋 {session?.classroom?.name || t('print.classOverview')}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('print.date')}: {today} &nbsp;|&nbsp; {t('print.teacher')}: {session?.teacher?.name || ''}
              </p>
            </div>
            <span className="text-2xl no-print">🌳</span>
          </div>
        </div>

        {/* Children grid — 4 per page (2×2) */}
        <div className="px-4 py-3">
          {children.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t('dashboard.noStudents')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {children.map((child, idx) => (
                <div
                  key={child.id}
                  className={`print-avoid-break border border-gray-200 rounded-lg p-3 flex flex-col ${
                    idx > 0 && idx % 4 === 0 ? 'print-page-break' : ''
                  }`}
                  style={{ minHeight: '45vh' }}
                >
                  {/* Child name */}
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {child.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-bold text-gray-800 text-base">{child.name}</span>
                  </div>

                  {/* Focus works — compact list */}
                  <div className="space-y-0.5 mb-2">
                    {AREAS.map(area => {
                      const config = getAreaConfig(area);
                      const fw = child.focus_works[area];
                      const workName = fw
                        ? (locale === 'zh' && fw.chineseName ? fw.chineseName : fw.name)
                        : null;

                      return (
                        <div key={area} className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: config.color, fontSize: '7px', fontWeight: 700 }}
                          >
                            {config.icon}
                          </span>
                          <span className="text-gray-700" style={{ fontSize: '9px', lineHeight: '1.3' }}>
                            {workName || (
                              <span className="text-gray-300 italic">{t('print.noFocusWork')}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Large writing space — fills remaining card height */}
                  <div className="flex-1 bg-gray-50/30 rounded-md min-h-[100px]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
