'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/montree/auth';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

interface Work {
  id: string;
  work_name: string;
  area: string;
  status: string | number;
}

interface ChildWithWorks {
  id: string;
  name: string;
  works: Work[];
}

function PrintContent() {
  const router = useRouter();
  const { t } = useI18n();
  const [children, setChildren] = useState<ChildWithWorks[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekNum, setWeekNum] = useState(0);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/montree/login');
      return;
    }

    // Calculate current week number
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    setWeekNum(Math.ceil(diff / oneWeek));

    loadAllData(session.classroom?.id);
  }, [router]);

  const loadAllData = async (classroomId: string) => {
    try {
      const childRes = await fetch(`/api/montree/children?classroom_id=${classroomId}`);
      const childData = await childRes.json();
      const childList = childData.children || [];

      const childrenWithWorks: ChildWithWorks[] = await Promise.all(
        childList.map(async (child: ChildWithWorks) => {
          const focusRes = await fetch(`/api/montree/focus-works?child_id=${child.id}`);
          const focusData = await focusRes.json();

          const progressRes = await fetch(`/api/montree/progress?child_id=${child.id}`);
          const progressData = await progressRes.json();

          const progressMap = new Map<string, string>();
          for (const p of progressData.progress || []) {
            progressMap.set(p.work_name?.toLowerCase(), p.status);
          }

          const works: Work[] = [];
          if (focusData.raw) {
            for (const fw of focusData.raw) {
              works.push({
                id: fw.work_id || fw.id,
                work_name: fw.work_name,
                area: fw.area,
                status: progressMap.get(fw.work_name?.toLowerCase()) || 'presented',
              });
            }
          }

          return { ...child, works };
        })
      );

      setChildren(childrenWithWorks);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🌳</div>
          <p className="text-gray-600">{t('printWeekly.loading' as TranslationKey)}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .child-card { break-inside: avoid; page-break-inside: avoid; }
        }
        @media screen { body { background: #e5e7eb; } }
      `}</style>

      {/* Print button bar — hidden temporarily */}
      {/* <div className="no-print bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">Print Preview</h1>
          <p className="text-sm text-gray-500">Week {weekNum}, 2026 &bull; {children.length} children</p>
        </div>
        <button onClick={handlePrint} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
          🖨️ Print
        </button>
      </div> */}

      {/* Print Container — List view only */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl my-4 print:shadow-none print:my-0">
        <div className="p-1">
          <div className="flex items-center gap-2 border-b border-gray-400 pb-1 mb-1">
            <span className="text-lg">🌳</span>
            <span className="font-bold text-sm">{t('printWeekly.weekLabel' as TranslationKey)} {weekNum}</span>
          </div>
          <div className="grid grid-cols-2 gap-0">
            {children.map((child) => (
              <div key={child.id} className="child-card border border-gray-400 flex flex-col overflow-hidden" style={{ height: '54mm' }}>
                <div className="bg-gray-200 px-2 py-0.5 border-b border-gray-400 shrink-0">
                  <span className="font-bold text-xs text-gray-900">{child.name}</span>
                </div>
                <div className="px-2 py-1 text-[10px] leading-tight flex-1">
                  {AREA_ORDER.map(area => {
                    const config = AREA_CONFIG[area];
                    const areaWorks = child.works.filter(w => normalizeArea(w.area) === area);
                    return areaWorks.map((work) => (
                      <div key={work.id}>
                        <span className="font-bold" style={{ color: config.color }}>{config.prefix}:</span>{' '}
                        <span className="text-gray-700">{work.work_name}</span>
                      </div>
                    ));
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🌳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
