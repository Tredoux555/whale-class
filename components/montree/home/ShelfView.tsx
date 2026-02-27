// components/montree/home/ShelfView.tsx
// Visual Montessori shelf — 5 area slots in a 2×2+1 grid
// Bioluminescent Depth aesthetic with progress rings
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

// SVG progress ring helper
function ProgressRing({ status, size = 72 }: { status: string; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const progressMap: Record<string, number> = {
    not_started: 0,
    presented: 0.33,
    practicing: 0.66,
    mastered: 1,
  };
  const progress = progressMap[status] ?? 0;
  const offset = circumference - progress * circumference;
  const statusConfig = BIO.status[status as keyof typeof BIO.status] || BIO.status.not_started;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      {progress > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={statusConfig.ring}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out',
            filter: status === 'mastered' ? 'drop-shadow(0 0 6px rgba(74,222,128,0.4))' : undefined,
          }}
        />
      )}
    </svg>
  );
}

export default function ShelfView({ childId, classroomId, onAskGuide, refreshTrigger }: ShelfViewProps) {
  const [shelf, setShelf] = useState<ShelfWork[]>([]);
  const [emptyAreas, setEmptyAreas] = useState<string[]>(AREA_ORDER);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<{ workName: string; area: string } | null>(null);

  const fetchShelf = useCallback(async () => {
    try {
      const res = await fetch(`/api/montree/shelf?child_id=${childId}`);
      const data = await res.json();
      if (data.success) {
        setShelf(data.shelf || []);
        setEmptyAreas(data.empty_areas || []);
      }
    } catch {
      // Shelf fetch failed — show empty
    } finally {
      setLoading(false);
    }
  }, [childId]);

  // Initial fetch
  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  // Refetch when parent signals shelf was updated
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchShelf();
    }
  }, [refreshTrigger, fetchShelf]);

  // Build ordered slots — always show all 5 areas
  const slots = AREA_ORDER.map(area => {
    const work = shelf.find(s => s.area === area);
    return {
      area,
      icon: BIO.areaIcon[area] || '📦',
      label: BIO.areaLabel[area] || area,
      work: work || null,
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
    <div className={`flex-1 overflow-y-auto px-4 py-6 ${BIO.bg.gradient}`}>
      {/* Title */}
      <h2 className={`text-center text-lg font-semibold ${BIO.text.primary} mb-6`}>
        Your Shelf
      </h2>

      {/* 2×2 grid + centered last item */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {slots.slice(0, 4).map(slot => (
          <ShelfSlot
            key={slot.area}
            {...slot}
            onTap={() => {
              if (slot.work) {
                setSelectedWork({ workName: slot.work.work_name, area: slot.area });
              } else {
                onAskGuide(`Can you suggest a ${slot.label} work for my child?`);
              }
            }}
          />
        ))}
      </div>

      {/* 5th slot centered */}
      {slots.length > 4 && (
        <div className="flex justify-center mt-4 max-w-sm mx-auto">
          <div className="w-[calc(50%-8px)]">
            <ShelfSlot
              {...slots[4]}
              onTap={() => {
                const fifthSlot = slots[4];
                if (fifthSlot.work) {
                  setSelectedWork({ workName: fifthSlot.work.work_name, area: fifthSlot.area });
                } else {
                  onAskGuide(`Can you suggest a ${fifthSlot.label} work for my child?`);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Empty state guidance */}
      {shelf.length === 0 && (
        <div className="text-center mt-8 px-6">
          <p className={`text-sm ${BIO.text.secondary} mb-2`}>
            Your shelf is empty
          </p>
          <p className={`text-xs ${BIO.text.muted}`}>
            Chat with your guide in the Portal — they&apos;ll set up personalized works for your child.
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

// Individual shelf slot
function ShelfSlot({
  area,
  icon,
  label,
  work,
  onTap,
}: {
  area: string;
  icon: string;
  label: string;
  work: ShelfWork | null;
  onTap: () => void;
}) {
  const status = work?.status || 'not_started';
  const statusConfig = BIO.status[status as keyof typeof BIO.status] || BIO.status.not_started;

  return (
    <button
      onClick={onTap}
      className={`${BIO.bg.card} border ${
        work ? BIO.border.glow : BIO.border.subtle
      } rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:scale-[1.02] active:scale-[0.98] w-full`}
      style={work ? { boxShadow: BIO.glow.soft } : undefined}
    >
      {/* Progress ring with icon inside */}
      <div className="relative mb-3">
        <ProgressRing status={status} size={64} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl ${!work ? 'opacity-30' : ''}`}>
            {work ? icon : '?'}
          </span>
        </div>
      </div>

      {/* Work name */}
      <p className={`text-xs font-semibold leading-tight mb-1 line-clamp-2 ${
        work ? BIO.text.primary : BIO.text.muted
      }`}>
        {work ? work.work_name : 'Not assigned'}
      </p>

      {/* Area label */}
      <p className={`text-[10px] ${BIO.text.mint} opacity-70`}>
        {label}
      </p>

      {/* Status badge */}
      {work && (
        <span className={`mt-2 text-[9px] px-2 py-0.5 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      )}

      {/* Empty CTA */}
      {!work && (
        <span className={`mt-2 text-[9px] ${BIO.text.mint} opacity-50`}>
          Ask your guide
        </span>
      )}
    </button>
  );
}
