// /montree/dashboard/[childId]/page.tsx
// Session 112: Week view - child's weekly works
// Session 115: Added Focus Mode view toggle
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import FocusModeView from '@/components/montree/FocusModeView';
import InviteParentModal from '@/components/montree/InviteParentModal';

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

interface NextWorkSuggestion {
  id: string;
  name: string;
  name_chinese?: string;
  area: string;
  description?: string;
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
  
  // View mode toggle (focus vs list)
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus');
  
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
  
  // Next work suggestion state
  const [nextWorkSuggestion, setNextWorkSuggestion] = useState<NextWorkSuggestion | null>(null);
  const [showNextWorkModal, setShowNextWorkModal] = useState(false);
  const [addingNextWork, setAddingNextWork] = useState(false);

  // Fetch assignments
  const fetchAssignments = () => {
    fetch(`/api/montree/progress?child_id=${childId}`)
      .then(r => r.json())
      .then(data => {
        setAssignments(data.progress || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (childId) fetchAssignments();
  }, [childId]);

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
      
      // If just mastered, fetch next work suggestion
      if (nextStatus === 'completed') {
        fetchNextWork(a.work_name, a.area);
      }
    } catch {
      toast.error('Failed to update');
      // Revert on error
      const reverted = [...assignments];
      reverted[index] = a;
      setAssignments(reverted);
    }
  };

  // Fetch next work in sequence
  const fetchNextWork = async (workName: string, area: string) => {
    try {
      const res = await fetch(`/api/montree/works/next?work_name=${encodeURIComponent(workName)}&area=${encodeURIComponent(area)}`);
      const data = await res.json();
      
      if (data.success && data.next_work) {
        // Check if already in assignments
        const alreadyAdded = assignments.some(
          a => a.work_name?.toLowerCase() === data.next_work.name?.toLowerCase()
        );
        
        if (!alreadyAdded) {
          setNextWorkSuggestion(data.next_work);
          setShowNextWorkModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch next work:', err);
    }
  };

  // Add suggested next work
  const addNextWork = async () => {
    if (!nextWorkSuggestion) return;
    setAddingNextWork(true);
    
    try {
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: nextWorkSuggestion.name,
          area: nextWorkSuggestion.area,
          status: 'presented'
        }),
      });
      toast.success(`Added: ${nextWorkSuggestion.name}`);
      setShowNextWorkModal(false);
      setNextWorkSuggestion(null);
      fetchAssignments();
    } catch {
      toast.error('Failed to add');
    }
    setAddingNextWork(false);
  };

  // Open picker and fetch curriculum
  const openPicker = async () => {
    setPickerOpen(true);
    if (Object.keys(curriculum).length === 0 && session?.classroom?.id) {
      setLoadingCurriculum(true);
      try {
        const res = await fetch(`/api/montree/curriculum?classroom_id=${session.classroom.id}`);
        const data = await res.json();
        setCurriculum(data.byArea || {});
      } catch {}
      setLoadingCurriculum(false);
    }
  };

  // Add work to child
  const addWork = async (work: CurriculumWork) => {
    if (assignments.some(a => a.work_name?.toLowerCase() === work.name?.toLowerCase())) {
      toast.error('Already added');
      return;
    }

    try {
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
      toast.success(`Added: ${work.name}`);
      setPickerOpen(false);
      setSelectedArea(null);
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
      
      {/* View Toggle + Weekly Review Button */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('focus')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'focus' 
                ? 'bg-emerald-500 text-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Focus
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' 
                ? 'bg-emerald-500 text-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 List
          </button>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Focus Mode View */}
      {viewMode === 'focus' ? (
        <FocusModeView
          childId={childId}
          classroomId={session?.classroom?.id || ''}
          assignments={assignments}
          curriculum={curriculum}
          onStatusChange={async (workName, area, newStatus) => {
            const index = assignments.findIndex(a => a.work_name === workName);
            if (index >= 0) {
              const updated = [...assignments];
              updated[index] = { ...updated[index], status: newStatus };
              setAssignments(updated);
              
              await fetch('/api/montree/progress/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ child_id: childId, work_name: workName, area, status: newStatus }),
              });
              toast.success(`→ ${newStatus === 'completed' ? 'Mastered! 🎉' : newStatus.replace('_', ' ')}`);
            }
          }}
          onAddWork={async (work, area) => {
            await fetch('/api/montree/progress/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ child_id: childId, work_name: work.name, area, status: 'presented' }),
            });
            toast.success(`Added: ${work.name}`);
            fetchAssignments();
          }}
          onExpandWork={(workName, area) => {
            const index = assignments.findIndex(a => a.work_name === workName);
            if (index >= 0) {
              setExpandedIndex(index);
              setViewMode('list'); // Switch to list to show expanded
            }
          }}
        />
      ) : (
        <>
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
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)} className="text-2xl">
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

      {/* Work Picker Modal */}
      {pickerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" 
          onClick={() => { setPickerOpen(false); setSelectedArea(null); }}
        >
          <div 
            className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  {selectedArea ? getAreaConfig(selectedArea).name : 'Choose Area'}
                </h3>
                <button 
                  onClick={() => { setPickerOpen(false); setSelectedArea(null); }} 
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

      {/* Next Work Suggestion Modal */}
      {showNextWorkModal && nextWorkSuggestion && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowNextWorkModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-white">Work Mastered!</h3>
              <p className="text-emerald-100 text-sm mt-1">Ready for the next step?</p>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-1">NEXT IN SEQUENCE</p>
                <p className="text-lg font-bold text-gray-800">{nextWorkSuggestion.name}</p>
                {nextWorkSuggestion.name_chinese && (
                  <p className="text-sm text-gray-500">{nextWorkSuggestion.name_chinese}</p>
                )}
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {nextWorkSuggestion.area?.replace('_', ' ')}
                </p>
              </div>
              
              {nextWorkSuggestion.description && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  {nextWorkSuggestion.description}
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={() => setShowNextWorkModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Later
              </button>
              <button
                onClick={addNextWork}
                disabled={addingNextWork}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingNextWork ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <span>Add</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
