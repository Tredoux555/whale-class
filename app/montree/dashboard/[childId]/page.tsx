// /montree/dashboard/[childId]/page.tsx
// Session 112: Week view - child's weekly works
// Session 115: Added Focus Mode view toggle
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import InviteParentModal from '@/components/montree/InviteParentModal';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
  presented: { label: 'P', bg: 'bg-amber-300', text: 'text-amber-800' },
  practicing: { label: 'Pr', bg: 'bg-blue-400', text: 'text-blue-800' },
  completed: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' },
};

const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'completed'];

export default function WeekPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;
  const session = getSession();
  
  // Invite parent modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [savingNote, setSavingNote] = useState<number | null>(null);
  
  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [replacingWorkIndex, setReplacingWorkIndex] = useState<number | null>(null); // Which work we're replacing
  
  // Next work suggestion state (removed modal - using wheel picker now)

  // Wheel picker state
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const [wheelPickerArea, setWheelPickerArea] = useState<string>('');
  const [wheelPickerWorks, setWheelPickerWorks] = useState<any[]>([]);
  const [wheelPickerCurrentWork, setWheelPickerCurrentWork] = useState<string>('');

  // Fetch assignments (filter to active works only for Week view)
  const fetchAssignments = () => {
    fetch(`/api/montree/progress?child_id=${childId}`)
      .then(r => r.json())
      .then(data => {
        // Only show non-completed works in Week view
        const active = (data.progress || []).filter(
          (p: Assignment) => p.status !== 'completed' && p.status !== 'mastered'
        );
        setAssignments(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (childId) fetchAssignments();
  }, [childId]);

  // Open wheel picker for a specific area
  const openWheelPicker = async (area: string, currentWorkName?: string) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    setWheelPickerArea(area);
    setWheelPickerCurrentWork(currentWorkName || '');
    setWheelPickerOpen(true);

    // Load works for this area if not cached
    const areaKey = area === 'math' ? 'mathematics' : area;
    if (!curriculum[areaKey] && !curriculum[area]) {
      try {
        const res = await fetch(`/api/montree/works/search?area=${encodeURIComponent(areaKey)}`);
        const data = await res.json();

        // Map to wheel picker format with status
        const worksWithStatus = (data.works || []).map((w: any, idx: number) => {
          // Find if this work has progress
          const progress = assignments.find(a =>
            a.work_name?.toLowerCase() === w.name?.toLowerCase()
          );
          return {
            id: w.id,
            name: w.name,
            name_chinese: w.chinese_name,
            status: progress?.status || 'not_started',
            sequence: idx + 1,
          };
        });

        setWheelPickerWorks(worksWithStatus);
        setCurriculum(prev => ({ ...prev, [areaKey]: worksWithStatus }));
      } catch (err) {
        console.error('Failed to load works:', err);
        toast.error('Failed to load works');
      }
    } else {
      // Use cached works but update status
      const cachedWorks = curriculum[areaKey] || curriculum[area] || [];
      const worksWithStatus = cachedWorks.map((w: any) => {
        const progress = assignments.find(a =>
          a.work_name?.toLowerCase() === w.name?.toLowerCase()
        );
        return { ...w, status: progress?.status || w.status || 'not_started' };
      });
      setWheelPickerWorks(worksWithStatus);
    }
  };

  // Handle work selection from wheel picker
  const handleWheelPickerSelect = async (work: any, status: string) => {
    try {
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.name,
          area: wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea,
          status: status === 'mastered' ? 'completed' : status,
        }),
      });

      const statusLabel = status === 'mastered' ? 'Mastered! 🎉' :
                          status === 'practicing' ? 'Practicing' : 'Presented';
      toast.success(`${work.name} → ${statusLabel}`);
      fetchAssignments();
    } catch {
      toast.error('Failed to update');
    }
  };

  // Cycle status on tap
  const cycleStatus = async (index: number) => {
    const a = assignments[index];
    const currentIdx = STATUS_FLOW.indexOf(a.status || 'not_started');
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];
    
    // Optimistic update
    const updated = [...assignments];
    updated[index] = { ...a, status: nextStatus };
    setAssignments(updated);
    
    try {
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          child_id: childId, 
          work_name: a.work_name, 
          area: a.area, 
          status: nextStatus 
        }),
      });
      toast.success(`→ ${nextStatus === 'completed' ? 'Mastered! 🎉' : nextStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
      // Revert on error
      const reverted = [...assignments];
      reverted[index] = a;
      setAssignments(reverted);
    }
  };

  // Open picker and fetch curriculum
  const openPicker = async () => {
    setPickerOpen(true);
    if (Object.keys(curriculum).length === 0) {
      setLoadingCurriculum(true);
      try {
        // Load all works at once
        const res = await fetch(`/api/montree/works/search`);
        const data = await res.json();
        
        // Group by area
        const byArea: Record<string, CurriculumWork[]> = {};
        for (const w of data.works || []) {
          const areaKey = w.area?.area_key || 'unknown';
          if (!byArea[areaKey]) byArea[areaKey] = [];
          byArea[areaKey].push({
            id: w.id,
            name: w.name,
            name_chinese: w.chinese_name,
            area_id: areaKey,
          });
        }
        setCurriculum(byArea);
      } catch {}
      setLoadingCurriculum(false);
    }
  };

  // Add work to child (or replace existing)
  const addWork = async (work: CurriculumWork) => {
    // Check if already exists (unless we're replacing it)
    const existingIndex = assignments.findIndex(a => a.work_name?.toLowerCase() === work.name?.toLowerCase());
    if (existingIndex >= 0 && existingIndex !== replacingWorkIndex) {
      toast.error('Already added');
      return;
    }

    try {
      // If replacing a work, mark the old one as completed first
      if (replacingWorkIndex !== null && assignments[replacingWorkIndex]) {
        const oldWork = assignments[replacingWorkIndex];
        await fetch('/api/montree/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: childId,
            work_name: oldWork.work_name,
            area: oldWork.area,
            status: 'completed'
          }),
        });
      }

      // Add the new work
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.name,
          area: work.area_id || selectedArea,
          status: 'presented'
        }),
      });
      
      toast.success(replacingWorkIndex !== null 
        ? `${assignments[replacingWorkIndex]?.work_name} ✓ → ${work.name}`
        : `Added: ${work.name}`
      );
      setPickerOpen(false);
      setSelectedArea(null);
      setReplacingWorkIndex(null);
      fetchAssignments();
    } catch {
      toast.error('Failed to add');
    }
  };

  // Save note
  const saveNote = async (index: number) => {
    const noteText = notes[index];
    if (!noteText?.trim()) return;
    
    const a = assignments[index];
    setSavingNote(index);
    
    try {
      const res = await fetch('/api/montree/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId, 
          work_name: a.work_name, 
          area: a.area,
          notes: noteText, 
          teacher_id: session?.teacher?.id,
        }),
      });
      if (res.ok) {
        toast.success('Note saved!');
        setNotes(prev => ({ ...prev, [index]: '' }));
      }
    } catch { 
      toast.error('Error saving'); 
    }
    setSavingNote(null);
  };

  // Get area config
  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[area] || AREA_CONFIG[area.replace('mathematics', 'math')] || { name: area, icon: '📋', color: '#888' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-pulse text-3xl mb-2">📋</div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />
      
      {/* Invite Parent Modal */}
      <InviteParentModal
        childId={childId}
        childName={session?.classroom?.children?.find((c: any) => c.id === childId)?.name || 'Child'}
        teacherId={session?.teacher?.id}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => router.push(`/montree/dashboard/${childId}/weekly-review`)}
          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          📊 Reports
        </button>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
        >
          👨‍👩‍👧 Invite
        </button>
      </div>

      {/* Works List */}
      {assignments.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">This Week's Focus</h2>
          <div className="space-y-2">
            {assignments.map((a, i) => {
              const areaConfig = getAreaConfig(a.area);
              const status = STATUS_CONFIG[a.status] || STATUS_CONFIG.not_started;
              const isExpanded = expandedIndex === i;
              
              return (
                <div key={i}>
                  <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <button
                      className="text-2xl active:scale-90 transition-transform"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openWheelPicker(a.area, a.work_name);
                      }}
                      onTouchStart={(e) => {
                        const timer = setTimeout(() => {
                          openWheelPicker(a.area, a.work_name);
                        }, 500);
                        const clear = () => clearTimeout(timer);
                        e.currentTarget.addEventListener('touchend', clear, { once: true });
                        e.currentTarget.addEventListener('touchmove', clear, { once: true });
                      }}
                      title="Long-press to browse works"
                    >
                      {areaConfig.icon}
                    </button>
                    
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)} className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{a.work_name}</p>
                      <p className="text-xs text-gray-500">{areaConfig.name}</p>
                    </button>
                    
                    <button
                      onClick={() => cycleStatus(i)}
                      className={`w-10 h-10 rounded-full ${status.bg} ${status.text} font-bold text-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform`}
                    >
                      {status.label}
                    </button>
                    
                    <button 
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-1 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-3">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(a.work_name + ' Montessori presentation')}`, '_blank')}
                          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95"
                        >
                          ▶️ Demo
                        </button>
                        <button 
                          onClick={() => window.location.href = `/montree/dashboard/capture?child=${childId}`}
                          className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95"
                        >
                          📸 Capture
                        </button>
                      </div>
                      
                      {/* Notes */}
                      <div className="relative">
                        <textarea
                          value={notes[i] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Add observation..."
                          className="w-full p-4 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none
                            bg-gradient-to-b from-amber-100 to-amber-50 border-0 shadow-md
                            text-amber-900 placeholder-amber-400"
                          rows={3}
                        />
                        <button
                          onClick={() => saveNote(i)}
                          disabled={!notes[i]?.trim() || savingNote === i}
                          className="absolute bottom-2 right-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg 
                            disabled:opacity-50 hover:bg-amber-600 active:scale-95 shadow-sm"
                        >
                          {savingNote === i ? '...' : '📌 Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2">This Week's Focus</h2>
          <p className="text-sm text-gray-500">Tap + to add works for this week.</p>
        </div>
      )}

      {/* Add Work Button */}
      <button
        onClick={openPicker}
        className="w-full py-4 bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 
          hover:border-emerald-400 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-2xl text-emerald-600">+</span>
        </div>
        <span className="font-medium text-gray-600">Add Work</span>
      </button>

      {/* Browse All Works */}
      <button
        onClick={openPicker}
        className="w-full py-4 bg-white rounded-2xl shadow-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-emerald-600">🔍</span>
        <span className="font-medium text-emerald-600">Find Work</span>
        <span className="text-emerald-600">Browse all works</span>
      </button>

      {/* Wheel Picker for browsing works in an area */}
      <WorkWheelPicker
        isOpen={wheelPickerOpen}
        onClose={() => setWheelPickerOpen(false)}
        area={wheelPickerArea}
        works={wheelPickerWorks}
        currentWorkName={wheelPickerCurrentWork}
        onSelectWork={handleWheelPickerSelect}
      />

      {/* Work Picker Modal (for Add Work button) */}
      {pickerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" 
          onClick={() => { setPickerOpen(false); setSelectedArea(null); setReplacingWorkIndex(null); }}
        >
          <div 
            className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">
                    {selectedArea ? getAreaConfig(selectedArea).name : 'Choose Area'}
                  </h3>
                  {replacingWorkIndex !== null && assignments[replacingWorkIndex] && (
                    <p className="text-sm text-emerald-100">
                      Replacing: {assignments[replacingWorkIndex].work_name}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => { setPickerOpen(false); setSelectedArea(null); setReplacingWorkIndex(null); }} 
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCurriculum ? (
                <div className="text-center py-8">
                  <div className="animate-bounce text-3xl mb-2">📚</div>
                  <p className="text-gray-500">Loading curriculum...</p>
                </div>
              ) : !selectedArea ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(AREA_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedArea(key)}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-all text-left"
                    >
                      <span className="text-3xl block mb-2">{config.icon}</span>
                      <span className="font-medium text-gray-800">{config.name}</span>
                      <span className="text-xs text-gray-500 block">
                        {curriculum[key]?.length || curriculum[key === 'mathematics' ? 'math' : key]?.length || 0} works
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => setSelectedArea(null)} className="text-emerald-600 text-sm mb-2">
                    ← Back to areas
                  </button>
                  {(curriculum[selectedArea] || curriculum[selectedArea === 'mathematics' ? 'math' : selectedArea] || []).map((work, i) => {
                    const isAdded = assignments.some(a => a.work_name?.toLowerCase() === work.name?.toLowerCase());
                    return (
                      <button
                        key={i}
                        onClick={() => !isAdded && addWork(work)}
                        disabled={isAdded}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3
                          ${isAdded ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-emerald-50 active:scale-98'}`}
                      >
                        <span className="text-xl">{getAreaConfig(selectedArea).icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{work.name}</p>
                          {work.name_chinese && <p className="text-xs text-gray-500">{work.name_chinese}</p>}
                        </div>
                        {isAdded ? (
                          <span className="text-xs text-gray-400">Added ✓</span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
