'use client';

// /home/dashboard/[childId]/page.tsx — Session 155
// Works view: all works grouped by area with status cycling
// Parents tap works to cycle: not_started → presented → practicing → mastered

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getHomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface WorkProgress {
  id: string;
  child_id: string;
  work_name: string;
  area: string;
  status: string;
  description: string;
  home_tip: string;
  home_priority: string;
  home_sequence: number;
  presented_at: string | null;
  mastered_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string; next: string | null }> = {
  not_started: { label: 'Not Started', badge: '🌱', color: 'bg-gray-100 text-gray-600', next: 'presented' },
  presented: { label: 'Presented', badge: '📖', color: 'bg-blue-100 text-blue-700', next: 'practicing' },
  practicing: { label: 'Practicing', badge: '🔄', color: 'bg-amber-100 text-amber-700', next: 'mastered' },
  mastered: { label: 'Mastered', badge: '⭐', color: 'bg-emerald-100 text-emerald-700', next: null },
};

const AREA_DISPLAY: Record<string, { name: string; icon: string; gradient: string }> = {
  practical_life: { name: 'Practical Life', icon: '🌱', gradient: 'from-green-500 to-emerald-600' },
  sensorial: { name: 'Sensorial', icon: '🎨', gradient: 'from-purple-500 to-indigo-600' },
  mathematics: { name: 'Mathematics', icon: '🔢', gradient: 'from-blue-500 to-cyan-600' },
  language: { name: 'Language', icon: '📝', gradient: 'from-orange-500 to-red-600' },
  cultural: { name: 'Cultural', icon: '🌍', gradient: 'from-teal-500 to-cyan-600' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export default function ChildWorksPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [works, setWorks] = useState<WorkProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(AREA_ORDER));
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;

    fetch(`/api/home/progress?child_id=${childId}`)
      .then((r) => r.json())
      .then((data) => {
        setWorks(data.progress || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load works');
        setLoading(false);
      });
  }, [childId]);

  const handleCycleStatus = async (work: WorkProgress) => {
    const config = STATUS_CONFIG[work.status];
    if (!config?.next) return; // Already mastered

    const nextStatus = config.next;

    // Optimistic update
    setWorks((prev) =>
      prev.map((w) =>
        w.work_name === work.work_name ? { ...w, status: nextStatus } : w
      )
    );

    try {
      const res = await fetch('/api/home/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.work_name,
          area: work.area,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setWorks((prev) =>
          prev.map((w) =>
            w.work_name === work.work_name ? { ...w, status: work.status } : w
          )
        );
        toast.error('Failed to update status');
      } else {
        const statusLabel = STATUS_CONFIG[nextStatus]?.label || nextStatus;
        toast.success(`${work.work_name}: ${statusLabel}`);
      }
    } catch (err: unknown) {
      // Revert on error
      setWorks((prev) =>
        prev.map((w) =>
          w.work_name === work.work_name ? { ...w, status: work.status } : w
        )
      );
      if (err instanceof Error) {
        toast.error('Connection error');
      }
    }
  };

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  // Group works by area
  const worksByArea: Record<string, WorkProgress[]> = {};
  for (const area of AREA_ORDER) {
    worksByArea[area] = works
      .filter((w) => w.area === area)
      .sort((a, b) => a.home_sequence - b.home_sequence);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📋</div>
        <p className="text-gray-500">Loading works...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = works.filter((w) => w.status === key).length;
          return (
            <div key={key} className={`${config.color} rounded-xl p-3 text-center`}>
              <div className="text-lg">{config.badge}</div>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs opacity-75">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Area Sections */}
      {AREA_ORDER.map((areaKey) => {
        const areaWorks = worksByArea[areaKey] || [];
        if (areaWorks.length === 0) return null;
        const display = AREA_DISPLAY[areaKey];
        const isExpanded = expandedAreas.has(areaKey);
        const masteredCount = areaWorks.filter((w) => w.status === 'mastered').length;

        return (
          <div key={areaKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Area Header */}
            <button
              onClick={() => toggleArea(areaKey)}
              className={`w-full px-4 py-3 bg-gradient-to-r ${display.gradient} text-white flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{display.icon}</span>
                <span className="font-bold">{display.name}</span>
                <span className="text-white/70 text-sm">({areaWorks.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">
                  {masteredCount}/{areaWorks.length} mastered
                </span>
                <span className="text-white/60">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </button>

            {/* Works List */}
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {areaWorks.map((work) => {
                  const statusCfg = STATUS_CONFIG[work.status] || STATUS_CONFIG.not_started;
                  const isWorkExpanded = expandedWork === work.work_name;
                  const canCycle = statusCfg.next !== null;

                  return (
                    <div key={work.work_name} className="hover:bg-gray-50 transition-colors">
                      <div className="flex items-center px-4 py-3">
                        {/* Status button */}
                        <button
                          onClick={() => handleCycleStatus(work)}
                          disabled={!canCycle}
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                            canCycle ? 'hover:scale-110 active:scale-95' : 'opacity-80'
                          } transition-transform ${statusCfg.color}`}
                          title={canCycle ? `Click to advance to ${statusCfg.next}` : 'Mastered!'}
                        >
                          {statusCfg.badge}
                        </button>

                        {/* Work info */}
                        <button
                          onClick={() => setExpandedWork(isWorkExpanded ? null : work.work_name)}
                          className="flex-1 text-left ml-3"
                        >
                          <div className="font-medium text-gray-800 text-sm">
                            {work.work_name}
                          </div>
                          {work.home_priority === 'essential' && (
                            <span className="text-xs text-emerald-600">🟢 Essential</span>
                          )}
                          {work.home_priority === 'enrichment' && (
                            <span className="text-xs text-purple-600">🟣 Enrichment</span>
                          )}
                        </button>

                        {/* Status label */}
                        <span className={`text-xs px-2 py-1 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Expanded tip */}
                      {isWorkExpanded && work.home_tip && (
                        <div className="px-4 pb-3 pl-16">
                          <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800">
                            <span className="font-medium">💡 Home Tip:</span> {work.home_tip}
                          </div>
                          {work.description && (
                            <p className="text-xs text-gray-500 mt-2">{work.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
