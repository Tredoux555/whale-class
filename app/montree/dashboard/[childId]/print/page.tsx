'use client';

// app/montree/dashboard/[childId]/print/page.tsx
// Printable Weekly Plan — opens in new tab, teacher uses Cmd+P to print.
// Clean A4 layout with child name, date, 5 area sections, notes, and guru summary.
// Feature-gated: only available when print_weekly_plan is enabled for the school.

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSession } from '@/lib/montree/auth';

interface FocusWork {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
}

interface ChildData {
  name: string;
  age_years?: number;
  age_months?: number;
  settings?: Record<string, unknown>;
}

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};
const AREA_COLORS: Record<string, string> = {
  practical_life: '#10B981',
  sensorial: '#F59E0B',
  mathematics: '#6366F1',
  language: '#EC4899',
  cultural: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  presented: 'Presented',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

export default function PrintWeeklyPlan() {
  const params = useParams();
  const childId = params.childId as string;
  const session = getSession();

  const [child, setChild] = useState<ChildData | null>(null);
  const [works, setWorks] = useState<FocusWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;

    Promise.all([
      fetch(`/api/montree/children/${childId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/montree/progress?child_id=${childId}`).then(r => r.ok ? r.json() : null),
    ])
      .then(([childData, progressData]) => {
        if (childData?.child) {
          setChild(childData.child);
        } else {
          setError('Could not load child data');
        }
        if (progressData?.progress) {
          setWorks(progressData.progress);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, [childId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>Loading weekly plan...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        <p style={{ color: '#EF4444' }}>{error || 'Error loading data'}</p>
      </div>
    );
  }

  // Group works by area
  const worksByArea: Record<string, FocusWork[]> = {};
  for (const area of AREA_ORDER) {
    worksByArea[area] = works.filter(w => {
      const wArea = w.area === 'math' ? 'mathematics' : w.area;
      return wArea === area;
    });
  }

  // Get guru summary from child settings
  const settings = child.settings || {};
  const guruSummary = settings.guru_weekly_summary as string | undefined;
  const guruSummaryDate = settings.guru_weekly_summary_updated_at as string | undefined;

  // Format today's date
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}, ${today.getFullYear()}`;

  const teacherName = session?.teacher?.name || '';

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-page {
            page-break-inside: avoid;
            box-shadow: none !important;
            border: none !important;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>

      {/* Print button bar — hidden when printing */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#1F2937', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontFamily: 'system-ui', fontSize: '14px' }}>
          Weekly Plan — {child.name}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#10B981', color: '#fff', border: 'none',
              padding: '8px 20px', borderRadius: '8px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'system-ui', fontSize: '14px',
            }}
          >
            🖨️ Print
          </button>
          <button
            onClick={() => window.close()}
            style={{
              background: '#374151', color: '#fff', border: 'none',
              padding: '8px 20px', borderRadius: '8px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'system-ui', fontSize: '14px',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="print-page" style={{
        maxWidth: '210mm', margin: '60px auto 40px',
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#1F2937',
        padding: '0 20px',
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '3px solid #10B981', paddingBottom: '12px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#064E3B' }}>
                WEEKLY PLAN
              </h1>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0', color: '#1F2937' }}>
                {child.name}
                {child.age_years !== undefined && (
                  <span style={{ fontWeight: 400, color: '#6B7280', fontSize: '14px', marginLeft: '8px' }}>
                    ({child.age_years}y {child.age_months || 0}m)
                  </span>
                )}
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#6B7280' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{weekLabel}</div>
              {teacherName && <div>Teacher: {teacherName}</div>}
            </div>
          </div>
        </div>

        {/* Guru Summary */}
        {guruSummary && (
          <div style={{
            background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', marginBottom: '4px' }}>
              🧠 GURU SUMMARY
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
              {guruSummary}
            </p>
          </div>
        )}

        {/* Area Sections */}
        {AREA_ORDER.map(area => {
          const areaWorks = worksByArea[area] || [];
          const focusWork = areaWorks.find(w => w.is_focus);
          const extras = areaWorks.filter(w => w.is_extra);
          const allAreaWorks = focusWork ? [focusWork, ...extras] : extras;

          return (
            <div key={area} style={{ marginBottom: '14px' }}>
              {/* Area Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                borderBottom: `2px solid ${AREA_COLORS[area] || '#888'}`,
                paddingBottom: '4px', marginBottom: '8px',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: AREA_COLORS[area] || '#888',
                }} />
                <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {AREA_LABELS[area] || area}
                </span>
              </div>

              {/* Works */}
              {allAreaWorks.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: '11px', fontStyle: 'italic', paddingLeft: '18px' }}>
                  No works assigned
                </div>
              ) : (
                allAreaWorks.map((work, idx) => (
                  <div key={`${work.work_name}-${idx}`} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    paddingLeft: '18px', marginBottom: '6px',
                  }}>
                    {/* Checkbox */}
                    <div style={{
                      width: '14px', height: '14px', border: '1.5px solid #9CA3AF',
                      borderRadius: '3px', flexShrink: 0, marginTop: '2px',
                      background: work.status === 'mastered' ? '#10B981' : 'transparent',
                    }}>
                      {work.status === 'mastered' && (
                        <span style={{ color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>✓</span>
                      )}
                    </div>
                    {/* Work details */}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '12px' }}>
                        {work.work_name}
                      </span>
                      <span style={{ color: '#6B7280', fontSize: '10px', marginLeft: '8px' }}>
                        ({STATUS_LABELS[work.status] || work.status})
                      </span>
                      {work.notes && (
                        <div style={{ color: '#6B7280', fontSize: '10px', fontStyle: 'italic', marginTop: '1px' }}>
                          {work.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}

        {/* Observations section (blank lines for handwriting) */}
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontWeight: 700, fontSize: '13px', textTransform: 'uppercase',
            letterSpacing: '0.5px', borderBottom: '2px solid #374151',
            paddingBottom: '4px', marginBottom: '12px',
          }}>
            OBSERVATIONS
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              borderBottom: '1px solid #E5E7EB',
              height: '28px', marginBottom: '4px',
            }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px', paddingTop: '8px', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between',
          fontSize: '9px', color: '#9CA3AF',
        }}>
          <span>Generated by Montree</span>
          <span>montree.xyz</span>
        </div>
      </div>
    </>
  );
}
