// components/montree/home/ShelfView.tsx
// Visual Montessori wooden shelf — works displayed as 3D material icons on planks
// Bioluminescent Depth aesthetic with realistic wood texture
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import WorkDetailSheet from './WorkDetailSheet';

interface ShelfWork {
  area: string;
  work_name: string;
  status: string;
  set_at: string;
  set_by: string;
}

interface ShelfViewProps {
  childId: string;
  classroomId?: string;
  onAskGuide: (message: string) => void;
  refreshTrigger?: number;
}

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Area accent colors for shelf labels and glows
const AREA_COLORS: Record<string, { bg: string; glow: string; text: string; label: string }> = {
  practical_life: { bg: '#E11D48', glow: 'rgba(225,29,72,0.3)', text: '#FFF1F2', label: 'rgba(225,29,72,0.15)' },
  sensorial:      { bg: '#F59E0B', glow: 'rgba(245,158,11,0.3)', text: '#FFFBEB', label: 'rgba(245,158,11,0.15)' },
  mathematics:    { bg: '#3B82F6', glow: 'rgba(59,130,246,0.3)', text: '#EFF6FF', label: 'rgba(59,130,246,0.15)' },
  language:       { bg: '#10B981', glow: 'rgba(16,185,129,0.3)', text: '#ECFDF5', label: 'rgba(16,185,129,0.15)' },
  cultural:       { bg: '#8B5CF6', glow: 'rgba(139,92,246,0.3)', text: '#F5F3FF', label: 'rgba(139,92,246,0.15)' },
};

// Status glow colors
const STATUS_GLOW: Record<string, string> = {
  not_started: 'none',
  presented: '0 0 8px rgba(245,158,11,0.4)',
  practicing: '0 0 10px rgba(16,185,129,0.5)',
  mastered: '0 0 14px rgba(74,222,128,0.6), 0 0 28px rgba(74,222,128,0.2)',
};

function getWorkIcon(workName: string, area: string): string {
  // Check exact match first
  if (BIO.workIcon[workName]) return BIO.workIcon[workName];
  // Check partial match (work name contains key)
  const lower = workName.toLowerCase();
  for (const [key, icon] of Object.entries(BIO.workIcon)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  // Fallback to area icon
  return BIO.areaIcon[area] || '📦';
}

export default function ShelfView({ childId, classroomId, onAskGuide, refreshTrigger }: ShelfViewProps) {
  const [shelf, setShelf] = useState<ShelfWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<{ workName: string; area: string } | null>(null);

  const fetchShelf = useCallback(async () => {
    try {
      const res = await fetch(`/api/montree/shelf?child_id=${childId}`);
      const data = await res.json();
      if (data.success) {
        setShelf(data.shelf || []);
      }
    } catch {
      // Shelf fetch failed — show empty
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchShelf();
    }
  }, [refreshTrigger, fetchShelf]);

  // Build ordered shelves — always show all 5 areas
  const shelves = AREA_ORDER.map(area => {
    const work = shelf.find(s => s.area === area);
    return {
      area,
      label: BIO.areaLabel[area] || area,
      work: work || null,
      colors: AREA_COLORS[area] || AREA_COLORS.practical_life,
    };
  });

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">📚</div>
          <p className={`text-sm ${BIO.text.secondary}`}>Loading shelf...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${BIO.bg.gradient}`}>
      {/* Title */}
      <h2 className={`text-center text-lg font-semibold ${BIO.text.primary} pt-5 pb-2`}>
        Your Shelf
      </h2>
      <p className={`text-center text-xs ${BIO.text.muted} mb-5 px-6`}>
        Tap a work to learn more, or tap an empty spot to ask your guide
      </p>

      {/* Wooden shelf unit */}
      <div className="px-3 pb-8">
        {/* Shelf frame — top rail */}
        <div
          className="h-2 rounded-t-lg mx-1"
          style={{
            background: BIO.shelf.plankEdge,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
          }}
        />

        {shelves.map((s, idx) => (
          <WoodenPlank
            key={s.area}
            area={s.area}
            label={s.label}
            work={s.work}
            colors={s.colors}
            isLast={idx === shelves.length - 1}
            onWorkTap={() => {
              if (s.work) {
                setSelectedWork({ workName: s.work.work_name, area: s.area });
              } else {
                onAskGuide(`Can you suggest a ${s.label} work for my child?`);
              }
            }}
          />
        ))}
      </div>

      {/* Empty state guidance */}
      {shelf.length === 0 && (
        <div className="text-center px-6 pb-8 -mt-4">
          <p className={`text-xs ${BIO.text.secondary}`}>
            Your shelves are waiting to be filled! Chat with your guide in the Portal to get personalized work suggestions.
          </p>
        </div>
      )}

      {/* Work Detail Bottom Sheet */}
      {selectedWork && (
        <WorkDetailSheet
          workName={selectedWork.workName}
          area={selectedWork.area}
          classroomId={classroomId}
          onClose={() => setSelectedWork(null)}
          onAskGuide={(msg) => {
            setSelectedWork(null);
            onAskGuide(msg);
          }}
        />
      )}
    </div>
  );
}

// Individual wooden plank with work sitting on it
function WoodenPlank({
  area,
  label,
  work,
  colors,
  isLast,
  onWorkTap,
}: {
  area: string;
  label: string;
  work: ShelfWork | null;
  colors: { bg: string; glow: string; text: string; label: string };
  isLast: boolean;
  onWorkTap: () => void;
}) {
  const status = work?.status || 'not_started';
  const icon = work ? getWorkIcon(work.work_name, area) : null;
  const isMastered = status === 'mastered';

  return (
    <div className="relative">
      {/* Work display area — sits above the plank */}
      <div className="min-h-[88px] flex items-end px-3 pb-1">
        <button
          onClick={onWorkTap}
          className="flex items-end gap-3 w-full group transition-transform active:scale-[0.97]"
        >
          {/* Area color tab */}
          <div
            className="w-1.5 rounded-full self-stretch mb-1 shrink-0"
            style={{ backgroundColor: colors.bg, opacity: 0.6 }}
          />

          {/* Work icon on the shelf */}
          <div className="flex flex-col items-center mb-0.5">
            {work ? (
              <div className="relative">
                {/* Shadow under the object */}
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full blur-sm"
                  style={{ backgroundColor: colors.glow, opacity: 0.5 }}
                />
                {/* The 3D-ish material icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center relative transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${colors.label} 0%, rgba(255,255,255,0.03) 100%)`,
                    border: `1px solid ${colors.bg}33`,
                    transform: 'perspective(200px) rotateY(-3deg) rotateX(2deg)',
                    boxShadow: STATUS_GLOW[status] || 'none',
                  }}
                >
                  <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
                    {icon}
                  </span>
                  {/* Mastered sparkle */}
                  {isMastered && (
                    <span className="absolute -top-1.5 -right-1.5 text-sm animate-pulse">⭐</span>
                  )}
                </div>
              </div>
            ) : (
              /* Empty slot — ghost + icon */
              <div
                className="w-14 h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span className="text-white/15 text-2xl group-hover:text-white/25 transition-colors">+</span>
              </div>
            )}
          </div>

          {/* Work info */}
          <div className="flex-1 min-w-0 pb-1">
            <p className={`text-sm font-medium leading-tight truncate ${
              work ? 'text-white/85' : 'text-white/25'
            }`}>
              {work ? work.work_name : 'Empty'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: colors.bg, opacity: 0.7 }}>
              {label}
            </p>
            {work && (
              <div className="flex items-center gap-1.5 mt-1">
                <div
                  className="h-1 rounded-full flex-1 max-w-[60px]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: status === 'mastered' ? '100%' :
                             status === 'practicing' ? '66%' :
                             status === 'presented' ? '33%' : '0%',
                      backgroundColor: colors.bg,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-[9px] text-white/40 capitalize">{status.replace('_', ' ')}</span>
              </div>
            )}
            {!work && (
              <span className="text-[9px] text-white/20">Ask your guide</span>
            )}
          </div>

          {/* Chevron */}
          <svg className="w-4 h-4 text-white/15 shrink-0 mb-1 group-hover:text-white/30 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* The wooden plank itself */}
      <div className="relative mx-1">
        {/* Main plank surface */}
        <div
          className="h-3 relative"
          style={{
            background: BIO.shelf.plank,
            boxShadow: BIO.shelf.shadow,
            borderRadius: '0 0 2px 2px',
          }}
        >
          {/* Wood grain overlay */}
          <div
            className="absolute inset-0"
            style={{ background: BIO.shelf.grain, opacity: 0.4 }}
          />
        </div>
        {/* Plank edge (front face) */}
        <div
          className="h-1.5"
          style={{
            background: BIO.shelf.plankEdge,
            boxShadow: BIO.shelf.edgeShadow,
            borderRadius: isLast ? '0 0 4px 4px' : undefined,
          }}
        />
      </div>
    </div>
  );
}
