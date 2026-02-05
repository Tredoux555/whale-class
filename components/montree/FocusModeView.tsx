// components/montree/FocusModeView.tsx
// Focus mode grid: 5 cards (one per area), spinner wheel selection
// Integrates with existing progress tracking

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import FocusModeCard from './FocusModeCard';
import AreaSpinnerWheel, { SpinnerWork } from './AreaSpinnerWheel';

// ============================================
// TYPES
// ============================================

interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

interface FocusModeViewProps {
  childId: string;
  classroomId: string;
  assignments: Assignment[];
  curriculum: Record<string, CurriculumWork[]>;
  onStatusChange: (workName: string, area: string, newStatus: string) => Promise<void>;
  onAddWork: (work: CurriculumWork, area: string) => Promise<void>;
  onExpandWork: (workName: string, area: string) => void;
}

// ============================================
// AREA CONFIG
// ============================================

const AREAS = [
  { key: 'practical_life', icon: 'P', label: 'Practical Life', color: 'amber' },
  { key: 'sensorial', icon: 'S', label: 'Sensorial', color: 'purple' },
  { key: 'mathematics', icon: 'M', label: 'Math', color: 'blue' },
  { key: 'language', icon: 'L', label: 'Language', color: 'emerald' },
  { key: 'cultural', icon: 'C', label: 'Cultural', color: 'rose' },
];

// ============================================
// COMPONENT
// ============================================

export default function FocusModeView({
  childId,
  classroomId,
  assignments,
  curriculum,
  onStatusChange,
  onAddWork,
  onExpandWork,
}: FocusModeViewProps) {
  // State for focus works (one per area)
  const [focusWorks, setFocusWorks] = useState<Record<string, Assignment | null>>({});
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const [spinnerArea, setSpinnerArea] = useState<typeof AREAS[0] | null>(null);
  const [spinnerWorks, setSpinnerWorks] = useState<SpinnerWork[]>([]);
  const [loadingFocus, setLoadingFocus] = useState(true);

  // Fetch focus works on mount
  useEffect(() => {
    fetchFocusWorks();
  }, [childId]);

  const fetchFocusWorks = async () => {
    try {
      const res = await fetch(`/api/montree/focus-works?child_id=${childId}`);
      const data = await res.json();
      
      if (data.success && data.focus_works) {
        // Map API response to assignments format
        const mapped: Record<string, Assignment | null> = {};
        for (const area of AREAS) {
          const fw = data.focus_works[area.key];
          if (fw) {
            // Find matching assignment for status
            const assignment = assignments.find(
              a => a.work_name?.toLowerCase() === fw.name?.toLowerCase()
            );
            mapped[area.key] = assignment || {
              work_name: fw.name,
              area: area.key,
              status: 'not_started',
            };
          } else {
            // Pick first assignment in this area
            const areaAssignment = assignments.find(a => a.area === area.key);
            mapped[area.key] = areaAssignment || null;
          }
        }
        setFocusWorks(mapped);
      } else {
        // No focus works saved, use first assignment per area
        initFromAssignments();
      }
    } catch {
      initFromAssignments();
    }
    setLoadingFocus(false);
  };

  const initFromAssignments = () => {
    const mapped: Record<string, Assignment | null> = {};
    for (const area of AREAS) {
      mapped[area.key] = assignments.find(a => a.area === area.key) || null;
    }
    setFocusWorks(mapped);
  };

  // Open spinner wheel for an area
  const handleOpenSpinner = useCallback((areaKey: string) => {
    const area = AREAS.find(a => a.key === areaKey);
    if (!area) return;

    // Get works for this area from curriculum
    const areaWorks = curriculum[areaKey] || [];
    
    // Combine with assignments to include status
    const worksWithStatus: SpinnerWork[] = areaWorks.map(w => {
      const assignment = assignments.find(
        a => a.work_name?.toLowerCase() === w.name?.toLowerCase()
      );
      return {
        id: w.id,
        name: w.name,
        status: assignment?.status as SpinnerWork['status'] || undefined,
      };
    });

    // If no curriculum works, use assignments
    if (worksWithStatus.length === 0) {
      const areaAssignments = assignments.filter(a => a.area === areaKey);
      worksWithStatus.push(...areaAssignments.map(a => ({
        id: a.work_name,
        name: a.work_name,
        status: a.status as SpinnerWork['status'],
      })));
    }

    if (worksWithStatus.length === 0) {
      toast.info(`No works available for ${area.label}`);
      return;
    }

    setSpinnerArea(area);
    setSpinnerWorks(worksWithStatus);
    setSpinnerOpen(true);
  }, [curriculum, assignments]);

  // Handle spinner selection
  const handleSpinnerSelect = useCallback(async (work: SpinnerWork) => {
    if (!spinnerArea) return;

    // Update local state
    const newFocusWork: Assignment = {
      work_name: work.name,
      area: spinnerArea.key,
      status: work.status || 'not_started',
    };
    setFocusWorks(prev => ({
      ...prev,
      [spinnerArea.key]: newFocusWork,
    }));

    // Save to API
    try {
      await fetch('/api/montree/focus-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          classroom_id: classroomId,
          area: spinnerArea.key,
          work_id: work.id,
          work_name: work.name,
          set_by: 'teacher',
        }),
      });
      toast.success(`Focus: ${work.name}`);
    } catch {
      toast.error('Failed to save focus work');
    }
  }, [childId, classroomId, spinnerArea]);

  // Handle status change on a focus work
  const handleStatusChange = useCallback(async (workId: string, newStatus: string) => {
    // Find which area this work belongs to
    for (const [areaKey, work] of Object.entries(focusWorks)) {
      if (work && (work.work_name === workId || workId === work.work_name)) {
        // Update local state
        setFocusWorks(prev => ({
          ...prev,
          [areaKey]: { ...work, status: newStatus },
        }));
        
        // Call parent handler
        await onStatusChange(work.work_name, work.area, newStatus);
        break;
      }
    }
  }, [focusWorks, onStatusChange]);

  // Handle card tap (expand for notes/demo)
  const handleCardTap = useCallback((areaKey: string) => {
    const work = focusWorks[areaKey];
    if (work) {
      onExpandWork(work.work_name, work.area);
    }
  }, [focusWorks, onExpandWork]);

  if (loadingFocus) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {/* Focus Grid */}
      <div className="grid grid-cols-2 gap-3">
        {AREAS.slice(0, 4).map(area => (
          <FocusModeCard
            key={area.key}
            area={area.key}
            areaIcon={area.icon}
            areaLabel={area.label}
            work={focusWorks[area.key] ? {
              id: focusWorks[area.key]!.work_name,
              name: focusWorks[area.key]!.work_name,
              status: focusWorks[area.key]!.status as any,
              area: area.key,
            } : null}
            color={area.color}
            onStatusChange={handleStatusChange}
            onLongPressEmoji={() => handleOpenSpinner(area.key)}
            onTapCard={() => handleCardTap(area.key)}
          />
        ))}
      </div>
      
      {/* Cultural (5th area) - Full width */}
      <div className="mt-3">
        <FocusModeCard
          area={AREAS[4].key}
          areaIcon={AREAS[4].icon}
          areaLabel={AREAS[4].label}
          work={focusWorks[AREAS[4].key] ? {
            id: focusWorks[AREAS[4].key]!.work_name,
            name: focusWorks[AREAS[4].key]!.work_name,
            status: focusWorks[AREAS[4].key]!.status as any,
            area: AREAS[4].key,
          } : null}
          color={AREAS[4].color}
          onStatusChange={handleStatusChange}
          onLongPressEmoji={() => handleOpenSpinner(AREAS[4].key)}
          onTapCard={() => handleCardTap(AREAS[4].key)}
        />
      </div>

      {/* Spinner Wheel */}
      {spinnerArea && (
        <AreaSpinnerWheel
          isOpen={spinnerOpen}
          onClose={() => {
            setSpinnerOpen(false);
            setSpinnerArea(null);
          }}
          area={spinnerArea.key}
          areaIcon={spinnerArea.icon}
          areaLabel={spinnerArea.label}
          works={spinnerWorks}
          currentWorkId={focusWorks[spinnerArea.key]?.work_name || null}
          onSelect={handleSpinnerSelect}
        />
      )}

      {/* Hint text */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Hold area icon to switch work • Tap badge to update status
      </p>
    </>
  );
}
