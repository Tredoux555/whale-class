// /montree/onboarding/page.tsx
// Teacher onboarding - Add students with curriculum progress (MANDATORY)
// Theme: Clean white/blue for teachers (NOT green - that's for principals)
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Curriculum areas
const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'English', icon: '🌍', color: '#8b5cf6' },
];

// Age options
const AGE_OPTIONS = [
  { value: 2.5, label: '2½' },
  { value: 3, label: '3' },
  { value: 3.5, label: '3½' },
  { value: 4, label: '4' },
  { value: 4.5, label: '4½' },
  { value: 5, label: '5' },
  { value: 5.5, label: '5½' },
  { value: 6, label: '6' },
];

type Work = {
  id: string;
  name: string;
  sequence: number;
  isCustom?: boolean;
};

type Student = {
  id: string;
  name: string;
  age: number;
  progress: { [areaId: string]: { workId: string | null; workName?: string } };
};

// Curriculum Wheel Picker with Add Custom Work + Search + Click-Outside + Long-press Insert
function CurriculumPicker({
  areaId,
  areaName,
  icon,
  color,
  works,
  selectedWorkId,
  onSelect,
  onAddCustomWork,
}: {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  works: Work[];
  selectedWorkId: string | null;
  onSelect: (workId: string | null, workName?: string) => void;
  onAddCustomWork: (areaId: string, workName: string, afterSequence: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customWorkName, setCustomWorkName] = useState('');
  const [insertAfterIndex, setInsertAfterIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddCustom(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when showing add custom form
  useEffect(() => {
    if (showAddCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showAddCustom, insertAfterIndex]);

  const selectedWork = works.find(w => w.id === selectedWorkId);
  const displayLabel = selectedWork?.name || 'Not started yet';

  // Filter works by search query
  const filteredWorks = searchQuery.trim()
    ? works.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : works;

  const handleAddCustomWork = () => {
    if (!customWorkName.trim()) return;
    const afterSeq = insertAfterIndex >= 0 ? works[insertAfterIndex]?.sequence || 0 : 0;
    onAddCustomWork(areaId, customWorkName.trim(), afterSeq);
    setCustomWorkName('');
    setShowAddCustom(false);
    setInsertAfterIndex(-1);
  };

  // Long press / right-click handler for sequence numbers
  const handleNumberContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setInsertAfterIndex(index);
    setShowAddCustom(true);
    setCustomWorkName('');
  };

  const handleNumberTouchStart = (index: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setInsertAfterIndex(index);
      setShowAddCustom(true);
      setCustomWorkName('');
    }, 500); // 500ms long press
  };

  const handleNumberTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors shadow-sm"
        style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{areaName}</p>
          <p className="text-slate-700 font-medium truncate">{displayLabel}</p>
        </div>
        <span className="text-slate-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${areaName.toLowerCase()}...`}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm placeholder-slate-400 focus:border-blue-400 outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Not started option (only show when not searching) */}
            {!searchQuery && (
              <button
                onClick={() => { onSelect(null); setIsOpen(false); setSearchQuery(''); }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 ${
                  selectedWorkId === null ? 'bg-blue-50' : ''
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-400">—</span>
                <span className="text-slate-500 flex-1">Not started yet</span>
                {selectedWorkId === null && <span className="text-blue-500">✓</span>}
              </button>
            )}

            {/* Works list */}
            {filteredWorks.length === 0 && searchQuery && (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No works matching &quot;{searchQuery}&quot;
              </div>
            )}

            {filteredWorks.map((work) => {
              const originalIndex = works.findIndex(w => w.id === work.id);
              return (
                <div key={work.id} className="relative">
                  <div
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 ${
                      selectedWorkId === work.id ? 'bg-blue-50' : ''
                    } border-b border-slate-50 cursor-pointer`}
                    onClick={() => { onSelect(work.id, work.name); setIsOpen(false); setSearchQuery(''); }}
                  >
                    {/* Sequence number - long press or right click to add work after */}
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-offset-1 transition-all active:scale-95"
                      style={{ backgroundColor: color }}
                      title="Long press or right-click to add work after this"
                      onContextMenu={(e) => handleNumberContextMenu(e, originalIndex)}
                      onTouchStart={() => handleNumberTouchStart(originalIndex)}
                      onTouchEnd={handleNumberTouchEnd}
                      onTouchCancel={handleNumberTouchEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {originalIndex + 1}
                    </span>
                    <span className={`flex-1 truncate ${work.isCustom ? 'text-amber-600' : 'text-slate-700'}`}>
                      {work.name}
                      {work.isCustom && <span className="text-xs ml-1 opacity-60">(custom)</span>}
                    </span>
                    {selectedWorkId === work.id && <span className="text-blue-500">✓</span>}
                  </div>

                  {showAddCustom && insertAfterIndex === originalIndex && (
                    <div className="px-4 py-3 bg-amber-50 border-y border-amber-200">
                      <p className="text-amber-700 text-xs mb-2 font-medium">
                        ➕ Add work after &quot;{work.name}&quot;
                      </p>
                      <input
                        ref={customInputRef}
                        type="text"
                        value={customWorkName}
                        onChange={(e) => setCustomWorkName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customWorkName.trim()) {
                            handleAddCustomWork();
                          } else if (e.key === 'Escape') {
                            setShowAddCustom(false);
                            setInsertAfterIndex(-1);
                          }
                        }}
                        placeholder="Enter custom work name..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm placeholder-slate-400 mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCustomWork}
                          disabled={!customWorkName.trim()}
                          className="flex-1 py-2 bg-amber-500 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                        >
                          Add Work
                        </button>
                        <button
                          onClick={() => { setShowAddCustom(false); setInsertAfterIndex(-1); }}
                          className="px-3 py-2 bg-slate-200 text-slate-600 text-sm rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {showAddCustom && insertAfterIndex === -1 && (
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                <input
                  type="text"
                  value={customWorkName}
                  onChange={(e) => setCustomWorkName(e.target.value)}
                  placeholder="Enter custom work name..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm placeholder-slate-400 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomWork}
                    className="flex-1 py-2 bg-amber-500 text-white text-sm rounded-lg font-medium"
                  >
                    Add at Beginning
                  </button>
                  <button
                    onClick={() => { setShowAddCustom(false); setInsertAfterIndex(-1); }}
                    className="px-3 py-2 bg-slate-200 text-slate-600 text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Custom Work Footer */}
          <div className="border-t border-slate-100 p-2 bg-slate-50">
            <p className="text-slate-400 text-xs mb-1 px-2">Can&apos;t find the work? Add custom:</p>
            <div className="flex gap-1 flex-wrap mb-2">
              <button
                onClick={() => { setShowAddCustom(true); setInsertAfterIndex(-1); }}
                className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200"
              >
                + At Beginning
              </button>
              {works.length > 0 && (
                <button
                  onClick={() => { setShowAddCustom(true); setInsertAfterIndex(works.length - 1); }}
                  className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200"
                >
                  + At End
                </button>
              )}
            </div>
            <p className="text-slate-400 text-xs px-2 flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>•</span>
              <span>Long-press or right-click a number to insert after it</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Age Picker Component with Click-Outside
function AgePicker({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = AGE_OPTIONS.find(a => a.value === value) || AGE_OPTIONS[2];

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left flex items-center gap-3 hover:border-blue-300 transition-colors shadow-sm"
      >
        <span className="text-xl">🎂</span>
        <div className="flex-1">
          <p className="text-xs text-slate-400">Age</p>
          <p className="text-slate-700 font-medium">{selected.label} years old</p>
        </div>
        <span className="text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {AGE_OPTIONS.map((age, index) => (
              <button
                key={age.value}
                onClick={() => { onChange(age.value); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 ${
                  value === age.value ? 'bg-blue-50' : ''
                } ${index < AGE_OPTIONS.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <span className="text-slate-700 flex-1">{age.label} years old</span>
                {value === age.value && <span className="text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [seedingCurriculum, setSeedingCurriculum] = useState(false);
  const [error, setError] = useState('');

  const [curriculumWorks, setCurriculumWorks] = useState<{ [areaId: string]: Work[] }>({});
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student>({
    id: crypto.randomUUID(),
    name: '',
    age: 3.5,
    progress: {},
  });
  const [editingStudentIndex, setEditingStudentIndex] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setSession(parsed);

      // Check if teacher already has students - if so, go to dashboard
      if (parsed.classroom?.id) {
        fetch(`/api/montree/children?classroom_id=${parsed.classroom.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.children && data.children.length > 0) {
              // Already onboarded - go to dashboard
              router.push('/montree/dashboard');
            } else {
              // No students yet - load curriculum and continue onboarding
              loadCurriculum(parsed.classroom.id);
            }
          })
          .catch(() => {
            loadCurriculum(parsed.classroom.id);
          });
      }
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  const loadCurriculum = async (classroomId: string) => {
    if (!classroomId) return;

    try {
      const res = await fetch(`/api/montree/curriculum?classroom_id=${classroomId}`);
      if (res.ok) {
        const data = await res.json();
        const grouped: { [areaId: string]: Work[] } = {};
        for (const area of CURRICULUM_AREAS) {
          grouped[area.id] = [];
        }

        if (data.curriculum && data.curriculum.length > 0) {
          for (const work of data.curriculum) {
            const areaKey = work.area?.area_key || work.area_key;
            if (areaKey && grouped[areaKey]) {
              grouped[areaKey].push({
                id: work.id || work.work_key,
                name: work.name,
                sequence: work.sequence || 0,
                isCustom: work.is_custom || false,
              });
            }
          }
          for (const areaId of Object.keys(grouped)) {
            grouped[areaId].sort((a, b) => a.sequence - b.sequence);
          }
          setCurriculumWorks(grouped);
        } else {
          // No curriculum found - need to seed it
          await seedCurriculum(classroomId);
        }
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const seedCurriculum = async (classroomId: string) => {
    setSeedingCurriculum(true);
    try {
      // Seed the curriculum from the brain
      const seedRes = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: classroomId, action: 'seed_from_brain' }),
      });

      if (seedRes.ok) {
        // Reload curriculum after seeding
        const res = await fetch(`/api/montree/curriculum?classroom_id=${classroomId}`);
        if (res.ok) {
          const data = await res.json();
          const grouped: { [areaId: string]: Work[] } = {};
          for (const area of CURRICULUM_AREAS) {
            grouped[area.id] = [];
          }

          if (data.curriculum) {
            for (const work of data.curriculum) {
              const areaKey = work.area?.area_key || work.area_key;
              if (areaKey && grouped[areaKey]) {
                grouped[areaKey].push({
                  id: work.id || work.work_key,
                  name: work.name,
                  sequence: work.sequence || 0,
                  isCustom: work.is_custom || false,
                });
              }
            }
            for (const areaId of Object.keys(grouped)) {
              grouped[areaId].sort((a, b) => a.sequence - b.sequence);
            }
          }
          setCurriculumWorks(grouped);
        }
      }
    } catch (err) {
      console.error('Failed to seed curriculum:', err);
    } finally {
      setSeedingCurriculum(false);
    }
  };

  const handleAddCustomWork = async (areaId: string, workName: string, afterSequence: number) => {
    if (!session?.classroom?.id) return;

    // Optimistic UI update with temporary ID
    const tempId = `temp_${Date.now()}`;
    const tempWork: Work = {
      id: tempId,
      name: workName,
      sequence: afterSequence + 0.5,
      isCustom: true,
    };

    // Update local state optimistically
    setCurriculumWorks(prev => {
      const updated = { ...prev };
      updated[areaId] = [...(updated[areaId] || []), tempWork].sort((a, b) => a.sequence - b.sequence);
      return updated;
    });

    setCurrentStudent(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        [areaId]: { workId: tempId, workName: workName },
      },
    }));

    try {
      // Persist to database
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom.id,
          area_key: areaId,
          name: workName,
          after_sequence: afterSequence,
          is_custom: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const savedWork = data.work;

        // Replace temp ID with actual database ID
        setCurriculumWorks(prev => {
          const updated = { ...prev };
          updated[areaId] = updated[areaId].map(w =>
            w.id === tempId ? { ...w, id: savedWork.id, sequence: savedWork.sequence } : w
          ).sort((a, b) => a.sequence - b.sequence);
          return updated;
        });

        // Update student progress with real ID
        setCurrentStudent(prev => {
          if (prev.progress[areaId]?.workId === tempId) {
            return {
              ...prev,
              progress: {
                ...prev.progress,
                [areaId]: { workId: savedWork.id, workName: workName },
              },
            };
          }
          return prev;
        });

        console.log(`Custom work "${workName}" saved to classroom curriculum`);
      } else {
        console.error('Failed to save custom work');
        // Could rollback optimistic update here if needed
      }
    } catch (err) {
      console.error('Error saving custom work:', err);
    }
  };

  const addStudent = () => {
    if (!currentStudent.name.trim()) return;

    if (editingStudentIndex !== null) {
      const updated = [...students];
      updated[editingStudentIndex] = { ...currentStudent };
      setStudents(updated);
      setEditingStudentIndex(null);
    } else {
      setStudents([...students, { ...currentStudent }]);
    }

    setCurrentStudent({
      id: crypto.randomUUID(),
      name: '',
      age: 3.5,
      progress: {},
    });
  };

  const editStudent = (index: number) => {
    setCurrentStudent({ ...students[index] });
    setEditingStudentIndex(index);
  };

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
    if (editingStudentIndex === index) {
      setEditingStudentIndex(null);
      setCurrentStudent({ id: crypto.randomUUID(), name: '', age: 3.5, progress: {} });
    }
  };

  const saveAndComplete = async () => {
    // Auto-add current student if they have a name (don't lose unsaved work!)
    let finalStudents = [...students];
    if (currentStudent.name.trim()) {
      if (editingStudentIndex !== null) {
        // Was editing - update that student
        finalStudents[editingStudentIndex] = { ...currentStudent };
      } else {
        // New student - add to list
        finalStudents = [...finalStudents, { ...currentStudent }];
      }
    }

    if (finalStudents.length === 0) {
      setError('Please add at least one student to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/onboarding/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: session.classroom.id,
          students: finalStudents.map(s => ({
            name: s.name,
            age: s.age,
            progress: Object.fromEntries(
              Object.entries(s.progress).map(([areaId, data]) => [areaId, data.workId])
            ),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save students');
      }

      const sessionData = localStorage.getItem('montree_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.onboarded = true;
        localStorage.setItem('montree_session', JSON.stringify(parsed));
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  // Step 0: Welcome (Emerald/Teal theme - warm & exciting)
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 w-full max-w-lg text-center">
          <div className="text-6xl mb-4">🌳</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Almost there!</h1>
          <p className="text-emerald-600 font-medium mb-6">One quick step and you&apos;re in</p>

          <div className="text-left bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 mb-6 border border-emerald-100">
            <p className="text-slate-700 leading-relaxed mb-4">
              ✨ We&apos;ve built something special for you — a system that will transform how you track and nurture each child&apos;s Montessori journey.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              To unlock all the magic, we just need to know who&apos;s in your classroom.
            </p>
            <p className="text-emerald-700 font-semibold text-lg flex items-center gap-2">
              <span>👶</span> Let&apos;s add your students!
            </p>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all"
          >
            Let&apos;s Go! →
          </button>

          {session?.teacher?.name && (
            <p className="text-sm text-slate-400 mt-6">
              {session.teacher.name} • {session.classroom?.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 1: Add Students (White/Blue theme)
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Add Your Students</h1>
            <p className="text-blue-600 font-medium">
              {session?.classroom?.name || 'Your Classroom'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Student Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>👶</span>
              {editingStudentIndex !== null ? 'Edit Student' : 'New Student'}
            </h2>

            {/* Name Input */}
            <div className="mb-4">
              <input
                type="text"
                value={currentStudent.name}
                onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })}
                placeholder="Student's name"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white outline-none text-lg transition-colors"
                autoFocus
              />
            </div>

            {/* Age Picker */}
            <div className="mb-6">
              <AgePicker
                value={currentStudent.age}
                onChange={(age) => setCurrentStudent({ ...currentStudent, age })}
              />
            </div>

            {/* Curriculum Progress */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-slate-700 font-medium mb-2 flex items-center gap-2">
                <span>📊</span> Current Progress
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Select the most recent work they&apos;ve been presented in each area.
              </p>

              {loadingCurriculum || seedingCurriculum ? (
                <div className="text-slate-500 text-center py-4">
                  {seedingCurriculum ? 'Setting up curriculum...' : 'Loading curriculum...'}
                </div>
              ) : (
                <div className="space-y-3">
                  {CURRICULUM_AREAS.map(area => (
                    <CurriculumPicker
                      key={area.id}
                      areaId={area.id}
                      areaName={area.name}
                      icon={area.icon}
                      color={area.color}
                      works={curriculumWorks[area.id] || []}
                      selectedWorkId={currentStudent.progress[area.id]?.workId || null}
                      onSelect={(workId, workName) => setCurrentStudent({
                        ...currentStudent,
                        progress: {
                          ...currentStudent.progress,
                          [area.id]: { workId, workName },
                        },
                      })}
                      onAddCustomWork={handleAddCustomWork}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Add/Update Button */}
            <button
              onClick={addStudent}
              disabled={!currentStudent.name.trim()}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingStudentIndex !== null ? '✓ Update Student' : '+ Add Student'}
            </button>

            {editingStudentIndex !== null && (
              <button
                onClick={() => {
                  setEditingStudentIndex(null);
                  setCurrentStudent({ id: crypto.randomUUID(), name: '', age: 3.5, progress: {} });
                }}
                className="w-full mt-2 py-2 text-slate-500 hover:text-slate-700"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Students List */}
          {students.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span>👥</span>
                Students Added ({students.length})
              </h2>

              <div className="space-y-2">
                {students.map((student, index) => {
                  const progressCount = Object.values(student.progress).filter(p => p.workId).length;
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-slate-700 font-medium">{student.name}</p>
                          <p className="text-slate-400 text-xs">
                            {student.age} yrs • {progressCount > 0 ? `${progressCount} areas started` : 'New to Montessori'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editStudent(index)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeStudent(index)}
                          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={saveAndComplete}
            disabled={loading || students.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : students.length === 0
              ? 'Add at least 1 student to continue'
              : `Save ${students.length} Student${students.length !== 1 ? 's' : ''} & Continue →`}
          </button>

          <p className="text-center text-slate-400 text-xs mt-4">
            You must add your students before using Montree
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Complete (White/Blue theme)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">You&apos;re All Set!</h1>
        <p className="text-slate-600 leading-relaxed mb-6">
          {students.length} student{students.length !== 1 ? 's' : ''} added to your classroom.
          Now let&apos;s explore your dashboard!
        </p>

        <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-left border border-blue-100">
          <h3 className="font-semibold text-slate-800 mb-2">What&apos;s Next?</h3>
          <ul className="text-slate-600 text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✓</span>
              View your curriculum dashboard
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✓</span>
              Track student progress with one tap
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✓</span>
              Generate weekly reports for parents
            </li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/montree/dashboard')}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
