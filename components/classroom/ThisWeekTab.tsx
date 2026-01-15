'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface WorkAssignment {
  id: string;
  work_name: string;
  work_id?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  notes?: string;
  mediaCount?: number;
}

interface ThisWeekTabProps {
  childId: string;
  childName: string;
  onMediaUploaded?: () => void;
}

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_CONFIG: Record<string, { letter: string; color: string; bg: string }> = {
  practical_life: { letter: 'P', color: 'text-pink-700', bg: 'bg-pink-100' },
  sensorial: { letter: 'S', color: 'text-purple-700', bg: 'bg-purple-100' },
  math: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100' },
  mathematics: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100' },
  language: { letter: 'L', color: 'text-green-700', bg: 'bg-green-100' },
  culture: { letter: 'C', color: 'text-orange-700', bg: 'bg-orange-100' },
};

export default function ThisWeekTab({ childId, childName, onMediaUploaded }: ThisWeekTabProps) {
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  const [activeCapture, setActiveCapture] = useState<WorkAssignment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, [childId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/week`);
      const data = await res.json();
      setAssignments(data.assignments || []);
      setWeekInfo(data.weekInfo);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTap = async (assignment: WorkAssignment) => {
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    
    // Optimistic update
    setAssignments(prev => prev.map(a => 
      a.id === assignment.id ? { ...a, progress_status: nextStatus as any } : a
    ));

    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, status: nextStatus }),
      });
      toast.success(`${assignment.work_name} → ${nextStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Failed to update:', error);
      fetchAssignments(); // Revert on error
    }
  };

  const handleCaptureTap = (assignment: WorkAssignment) => {
    setActiveCapture(assignment);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCapture) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File too large! Max ${isVideo ? '50MB' : '10MB'}`);
      fileInputRef.current!.value = '';
      setActiveCapture(null);
      return;
    }

    toast.success(`📤 Saving to ${childName}...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('assignmentId', activeCapture.id);
    formData.append('workId', activeCapture.work_id || '');
    formData.append('workName', activeCapture.work_name);
    if (weekInfo) {
      formData.append('weekNumber', weekInfo.week.toString());
      formData.append('year', weekInfo.year.toString());
    }

    fileInputRef.current!.value = '';
    setActiveCapture(null);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Saved!`);
        // Update media count on assignment
        setAssignments(prev => prev.map(a => 
          a.id === activeCapture.id 
            ? { ...a, mediaCount: (a.mediaCount || 0) + 1 } 
            : a
        ));
        onMediaUploaded?.();
      } else {
        toast.error('❌ ' + (data.error || 'Upload failed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Upload failed');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📋</span>
        </div>
        <p className="text-gray-500">Loading this week...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📋</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No assignments this week</h3>
        <p className="text-gray-500 text-sm">
          Upload a weekly plan to see {childName}'s assigned works
        </p>
      </div>
    );
  }

  const stats = {
    total: assignments.length,
    mastered: assignments.filter(a => a.progress_status === 'mastered').length,
    percent: Math.round((assignments.filter(a => a.progress_status === 'mastered').length / assignments.length) * 100)
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Week header */}
      {weekInfo && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Week {weekInfo.week}, {weekInfo.year}</h3>
              <p className="text-sm text-gray-500">{assignments.length} works assigned</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{stats.percent}%</div>
              <p className="text-xs text-gray-500">{stats.mastered}/{stats.total} complete</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">○</span>
          Not Started
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs">P</span>
          Presented
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-xs">Pr</span>
          Practicing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-xs">M</span>
          Mastered
        </span>
      </div>

      {/* Assignments list */}
      <div className="space-y-2">
        {assignments.map(assignment => {
          const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'text-gray-600', bg: 'bg-gray-100' };
          const status = STATUS_CONFIG[assignment.progress_status];
          
          return (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center p-3 gap-3">
                {/* Area badge */}
                <div className={`w-8 h-8 rounded-lg ${area.bg} flex items-center justify-center ${area.color} font-bold text-sm`}>
                  {area.letter}
                </div>

                {/* Status toggle */}
                <button
                  onClick={() => handleStatusTap(assignment)}
                  className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center font-bold text-sm transition-transform active:scale-90`}
                >
                  {status.label}
                </button>

                {/* Work name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{assignment.work_name}</p>
                  {assignment.notes && (
                    <p className="text-xs text-gray-500 truncate">{assignment.notes}</p>
                  )}
                </div>

                {/* Media count badge */}
                {assignment.mediaCount && assignment.mediaCount > 0 && (
                  <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                    📷 {assignment.mediaCount}
                  </div>
                )}

                {/* Capture button */}
                <button
                  onClick={() => handleCaptureTap(assignment)}
                  className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  📸
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
