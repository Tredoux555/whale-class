// components/montree/home/ShelfView.tsx
// Visual Montessori wooden shelf — 3 planks with works as tappable 3D objects
// Tap a work → QuickGuideModal (same as teacher experience)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import QuickGuideModal from '@/components/montree/child/QuickGuideModal';
import FullDetailsModal from '@/components/montree/child/FullDetailsModal';
import { QuickGuideData } from '@/components/montree/curriculum/types';

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

// Area accent colors
const AREA_COLORS: Record<string, { bg: string; glow: string; border: string }> = {
  practical_life: { bg: '#E11D48', glow: 'rgba(225,29,72,0.25)', border: 'rgba(225,29,72,0.6)' },
  sensorial:      { bg: '#F59E0B', glow: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.6)' },
  mathematics:    { bg: '#3B82F6', glow: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.6)' },
  language:       { bg: '#10B981', glow: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)' },
  cultural:       { bg: '#8B5CF6', glow: 'rgba(139,92,246,0.25)', border: 'rgba(139,92,246,0.6)' },
};

// Status glow effects
const STATUS_GLOW: Record<string, string> = {
  not_started: 'none',
  presented: '0 0 8px rgba(245,158,11,0.5)',
  practicing: '0 0 12px rgba(16,185,129,0.5)',
  mastered: '0 0 14px rgba(74,222,128,0.6), 0 0 28px rgba(74,222,128,0.2)',
};

function getWorkIcon(workName: string, area: string): string {
  if (BIO.workIcon[workName]) return BIO.workIcon[workName];
  const lower = workName.toLowerCase();
  for (const [key, icon] of Object.entries(BIO.workIcon)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return BIO.areaIcon[area] || '📦';
}

// Split works array into 3 rows of 3 (filling from top)
function distributeToShelves(works: ShelfWork[]): (ShelfWork | null)[][] {
  const slots: (ShelfWork | null)[] = [];
  // Place works in order, fill 9 slots total
  for (let i = 0; i < 9; i++) {
    slots.push(i < works.length ? works[i] : null);
  }
  return [
    slots.slice(0, 3), // Top shelf
    slots.slice(3, 6), // Middle shelf
    slots.slice(6, 9), // Bottom shelf
  ];
}

export default function ShelfView({ childId, classroomId, onAskGuide, refreshTrigger }: ShelfViewProps) {
  const [shelf, setShelf] = useState<ShelfWork[]>([]);
  const [loading, setLoading] = useState(true);

  // Guide modal state
  const [guideOpen, setGuideOpen] = useState(false);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);
  const [guideWorkName, setGuideWorkName] = useState('');
  const [guideData, setGuideData] = useState<QuickGuideData | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const shelfAbortRef = useRef<AbortController | null>(null);
  const guideAbortRef = useRef<AbortController | null>(null);

  const fetchShelf = useCallback(async () => {
    shelfAbortRef.current?.abort();
    const controller = new AbortController();
    shelfAbortRef.current = controller;
    try {
      const res = await fetch(`/api/montree/shelf?child_id=${childId}`, { signal: controller.signal });
      const data = await res.json();
      if (!controller.signal.aborted && data.success) {
        setShelf(data.shelf || []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Shelf fetch failed — show empty
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [childId]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchShelf();
  }, [refreshTrigger, fetchShelf]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      shelfAbortRef.current?.abort();
      guideAbortRef.current?.abort();
    };
  }, []);

  // Open guide for a work (same pattern as teacher week view)
  const openWorkGuide = useCallback(async (workName: string) => {
    guideAbortRef.current?.abort();
    const controller = new AbortController();
    guideAbortRef.current = controller;

    setGuideWorkName(workName);
    setGuideOpen(true);
    setGuideLoading(true);
    setGuideData(null);

    try {
      const url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (!controller.signal.aborted) setGuideData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGuideData(null);
    }
    if (!controller.signal.aborted) setGuideLoading(false);
  }, [classroomId]);

  // Distribute works across 3 shelves
  const shelves = distributeToShelves(shelf);

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
      <h2 className={`text-center text-lg font-semibold ${BIO.text.primary} pt-5 pb-1`}>
        Your Shelf
      </h2>
      <p className={`text-center text-xs ${BIO.text.muted} mb-4 px-6`}>
        Tap a work to see how to present it
      </p>

      {/* Shelf unit — 3 planks */}
      <div className="px-4 pb-8">
        {/* Shelf frame */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(80,60,20,0.15) 0%, rgba(60,45,15,0.25) 100%)',
            border: '1px solid rgba(139,105,20,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Side rails */}
          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: BIO.shelf.plankEdge, opacity: 0.6 }} />
          <div className="absolute right-0 top-0 bottom-0 w-2" style={{ background: BIO.shelf.plankEdge, opacity: 0.6 }} />

          {/* Top cap */}
          <div className="h-3 mx-2" style={{ background: BIO.shelf.plankEdge, borderRadius: '8px 8px 0 0' }} />

          {/* 3 shelf rows */}
          {shelves.map((row, rowIdx) => (
            <ShelfPlank
              key={rowIdx}
              items={row}
              isLast={rowIdx === 2}
              onWorkTap={openWorkGuide}
              onEmptyTap={() => onAskGuide('Can you suggest a work for my child?')}
            />
          ))}

          {/* Bottom cap */}
          <div
            className="h-2 mx-2"
            style={{
              background: BIO.shelf.plankEdge,
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* Empty state */}
      {shelf.length === 0 && (
        <div className="text-center px-6 pb-8 -mt-4">
          <p className={`text-xs ${BIO.text.secondary}`}>
            Your shelves are waiting! Chat with your guide in the Portal to get personalized work suggestions.
          </p>
        </div>
      )}

      {/* Quick Guide Modal — same component teachers use */}
      <QuickGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        workName={guideWorkName}
        guideData={guideData}
        loading={guideLoading}
        onOpenFullDetails={() => {
          setGuideOpen(false);
          setFullDetailsOpen(true);
        }}
      />

      {/* Full Details Modal — same component teachers use */}
      <FullDetailsModal
        isOpen={fullDetailsOpen}
        onClose={() => setFullDetailsOpen(false)}
        workName={guideWorkName}
        guideData={guideData}
        loading={guideLoading}
      />
    </div>
  );
}

// ─── Individual shelf plank with 3 slots ────────────────────────

function ShelfPlank({
  items,
  isLast,
  onWorkTap,
  onEmptyTap,
}: {
  items: (ShelfWork | null)[];
  isLast: boolean;
  onWorkTap: (workName: string) => void;
  onEmptyTap: () => void;
}) {
  return (
    <div className="relative">
      {/* Items sitting on the shelf */}
      <div className="flex justify-around items-end px-6 pt-4 pb-2 min-h-[110px]">
        {items.map((item, idx) => (
          <ShelfObject
            key={item ? item.work_name : `empty-${idx}`}
            work={item}
            onTap={() => item ? onWorkTap(item.work_name) : onEmptyTap()}
          />
        ))}
      </div>

      {/* The wooden plank */}
      <div className="mx-2">
        {/* Plank surface */}
        <div
          className="h-3.5 relative"
          style={{
            background: BIO.shelf.plank,
            boxShadow: BIO.shelf.shadow,
          }}
        >
          {/* Wood grain */}
          <div className="absolute inset-0" style={{ background: BIO.shelf.grain, opacity: 0.5 }} />
        </div>
        {/* Plank front edge */}
        <div
          className="h-2"
          style={{
            background: BIO.shelf.plankEdge,
            boxShadow: BIO.shelf.edgeShadow,
          }}
        />
        {/* Spacer between planks (except last) */}
        {!isLast && <div className="h-1" />}
      </div>
    </div>
  );
}

// ─── Individual work object on the shelf ────────────────────────

function ShelfObject({
  work,
  onTap,
}: {
  work: ShelfWork | null;
  onTap: () => void;
}) {
  if (!work) {
    // Empty slot
    return (
      <button
        onClick={onTap}
        aria-label="Ask guide for a work suggestion"
        className="flex flex-col items-center gap-1 transition-transform active:scale-95"
        style={{ width: '88px' }}
      >
        <div
          className="w-16 h-16 rounded-xl border border-dashed border-white/12 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="text-white/15 text-2xl">+</span>
        </div>
        <span className="text-[9px] text-white/20 text-center">Ask guide</span>
      </button>
    );
  }

  const icon = getWorkIcon(work.work_name, work.area);
  const colors = AREA_COLORS[work.area] || AREA_COLORS.practical_life;
  const status = work.status || 'not_started';
  const isMastered = status === 'mastered';

  return (
    <button
      onClick={onTap}
      aria-label={`View guide for ${work.work_name}`}
      className="flex flex-col items-center gap-1 transition-transform active:scale-95"
      style={{ width: '88px' }}
    >
      {/* The 3D material object */}
      <div className="relative">
        {/* Shadow underneath */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full blur-sm"
          style={{ backgroundColor: colors.glow, opacity: 0.6 }}
        />

        {/* Icon container */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(145deg, ${colors.glow} 0%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0.1) 100%)`,
            border: `1.5px solid ${colors.border}`,
            transform: 'perspective(300px) rotateY(-2deg) rotateX(3deg)',
            boxShadow: `${STATUS_GLOW[status] || 'none'}, 0 4px 12px rgba(0,0,0,0.3)`,
          }}
        >
          <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            {icon}
          </span>

          {/* Mastered sparkle */}
          {isMastered && (
            <span className="absolute -top-1.5 -right-1.5 text-xs animate-pulse">⭐</span>
          )}

          {/* Status dot */}
          {status !== 'not_started' && !isMastered && (
            <div
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{
                backgroundColor: status === 'presented' ? '#F59E0B' : '#10B981',
                boxShadow: `0 0 6px ${status === 'presented' ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}`,
              }}
            />
          )}
        </div>
      </div>

      {/* Work name */}
      <span
        className="text-[10px] font-medium text-white/75 text-center leading-tight max-w-full truncate px-0.5"
      >
        {work.work_name}
      </span>

      {/* Area label */}
      <span className="text-[8px] text-center" style={{ color: colors.bg, opacity: 0.6 }}>
        {BIO.areaLabel[work.area] || work.area}
      </span>
    </button>
  );
}
