// Classroom Overview Print Page
// 20 students on 2 A4 pages (10 per page, 5×2 grid)
// Works listed small in top-right corner, rest of box blank for handwritten notes
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
const AREA_LETTERS: Record<string, string> = {
  practical_life: 'PL',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

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
    if (isHomeschoolParent(sess)) {
      router.push('/montree/dashboard');
      return;
    }
    setSession(sess);

    // Guard: must have a classroom to fetch children
    if (!sess.classroom?.id) {
      setError(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    montreeApi(`/api/montree/focus-works/batch?classroom_id=${sess.classroom.id}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`Batch fetch: ${res.status}`); return res.json(); })
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

  const today = new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{t('common.connectionError')}</p>
      </div>
    );
  }

  // Split children into pages of 10
  const pages: ChildData[][] = [];
  for (let i = 0; i < children.length; i += 10) {
    pages.push(children.slice(i, i + 10));
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-page { margin-bottom: 24px; }
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

      {/* Pages */}
      <div className="bg-white">
        {children.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-lg">
            {t('dashboard.noStudents')}
          </div>
        ) : (
          pages.map((pageChildren, pageIdx) => (
            <div
              key={pageIdx}
              className="print-page"
              style={{ width: '100%', minHeight: '100vh' }}
            >
              {/* Page header — compact */}
              <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 700, fontSize: '11px', color: '#374151' }}>
                  {session?.classroom?.name || t('print.classOverview')}
                </span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                  {today} — {session?.teacher?.name} — {locale === 'zh' ? '页' : 'p'}{pageIdx + 1}/{pages.length}
                </span>
              </div>

              {/* 5×2 grid of student boxes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gap: '0px',
                  height: 'calc(100vh - 28px)',
                  padding: '0',
                  borderTop: '1px solid #d1d5db',
                  borderLeft: '1px solid #d1d5db',
                }}
              >
                {pageChildren.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      borderRight: '1px solid #d1d5db',
                      borderBottom: '1px solid #d1d5db',
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Child name — top left, bold */}
                    <div style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#111827',
                      lineHeight: '1.2',
                      marginBottom: '3px',
                    }}>
                      {child.name}
                    </div>

                    {/* Focus works — below name, small text */}
                    <div>
                      {AREAS.map(area => {
                        const fw = child.focus_works[area];
                        if (!fw) return null;
                        const config = getAreaConfig(area);
                        const workName = locale === 'zh' && fw.chineseName ? fw.chineseName : fw.name;
                        const shortName = workName.length > 30 ? workName.slice(0, 28) + '…' : workName;
                        return (
                          <div key={area} style={{ fontSize: '7px', lineHeight: '1.3', color: '#6b7280' }}>
                            <span style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: config.color,
                              color: 'white',
                              fontSize: '5px',
                              fontWeight: 700,
                              textAlign: 'center',
                              lineHeight: '8px',
                              marginRight: '2px',
                              verticalAlign: 'middle',
                            }}>
                              {AREA_LETTERS[area] || '?'}
                            </span>
                            {shortName}
                          </div>
                        );
                      })}
                    </div>

                    {/* Rest of box is blank — for handwritten notes */}
                    <div style={{ flex: 1 }} />
                  </div>
                ))}

                {/* Fill empty slots if less than 10 children on this page */}
                {Array.from({ length: 10 - pageChildren.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      borderRight: '1px solid #e5e7eb',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#fafafa',
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
