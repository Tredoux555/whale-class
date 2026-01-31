// /montree/onboarding/page.tsx
// Teacher onboarding - Add students with curriculum progress
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Curriculum areas with their works in sequence
const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'English', icon: '🌍', color: '#8b5cf6' },
];

// Age options for picker
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
};

type Student = {
  id: string;
  name: string;
  age: number;
  progress: { [areaId: string]: string | null }; // work_id or null for "not started"
};

// Spinning Wheel Picker Component
function WheelPicker({
  items,
  selectedId,
  onSelect,
  label,
  icon,
  color
}: {
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label: string;
  icon: string;
  color: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);
  const displayLabel = selectedItem?.label || 'Not started yet';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white/5 border border-white/20 rounded-xl text-left flex items-center gap-3 hover:bg-white/10 transition-colors"
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <p className="text-xs text-white/50">{label}</p>
          <p className="text-white font-medium truncate">{displayLabel}</p>
        </div>
        <span className="text-white/40">▼</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          ref={containerRef}
        >
          {/* Wheel picker simulation */}
          <div className="max-h-64 overflow-y-auto">
            {/* Not started option */}
            <button
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className={`w-full px-4 py-3 text-left hover:bg-white/10 flex items-center gap-3 border-b border-white/10 ${
                selectedId === null ? 'bg-emerald-500/20' : ''
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-gray-500/30 flex items-center justify-center text-xs">—</span>
              <span className="text-white/70">Not started yet</span>
            </button>

            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left hover:bg-white/10 flex items-center gap-3 ${
                  selectedId === item.id ? 'bg-emerald-500/20' : ''
                } ${index < items.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <span className="text-white flex-1 truncate">{item.label}</span>
                {selectedId === item.id && <span className="text-emerald-400">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Age Picker Component
function AgePicker({
  value,
  onChange
}: {
  value: number;
  onChange: (age: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = AGE_OPTIONS.find(a => a.value === value) || AGE_OPTIONS[2];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white/5 border border-white/20 rounded-xl text-left flex items-center gap-3 hover:bg-white/10 transition-colors"
      >
        <span className="text-xl">🎂</span>
        <div className="flex-1">
          <p className="text-xs text-white/50">Age</p>
          <p className="text-white font-medium">{selected.label} years old</p>
        </div>
        <span className="text-white/40">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {AGE_OPTIONS.map((age, index) => (
              <button
                key={age.value}
                onClick={() => { onChange(age.value); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left hover:bg-white/10 flex items-center gap-3 ${
                  value === age.value ? 'bg-emerald-500/20' : ''
                } ${index < AGE_OPTIONS.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <span className="text-white flex-1">{age.label} years old</span>
                {value === age.value && <span className="text-emerald-400">✓</span>}
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
  const [step, setStep] = useState(0); // 0: welcome, 1: add students, 2: complete
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Curriculum works loaded from API
  const [curriculumWorks, setCurriculumWorks] = useState<{ [areaId: string]: Work[] }>({});
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  // Students being added
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
      // Load curriculum for this classroom
      loadCurriculum(parsed.classroom?.id);
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
        // Group works by area_key
        const grouped: { [areaId: string]: Work[] } = {};
        for (const area of CURRICULUM_AREAS) {
          grouped[area.id] = [];
        }

        // The API returns curriculum array with nested area object
        if (data.curriculum) {
          for (const work of data.curriculum) {
            // Get area_key from nested area object or from byArea grouping
            const areaKey = work.area?.area_key || work.area_key;
            if (areaKey && grouped[areaKey]) {
              grouped[areaKey].push({
                id: work.id || work.work_key,
                name: work.name,
                sequence: work.sequence || 0,
              });
            }
          }
          // Sort each area by sequence
          for (const areaId of Object.keys(grouped)) {
            grouped[areaId].sort((a, b) => a.sequence - b.sequence);
          }
        }
        setCurriculumWorks(grouped);
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const addStudent = () => {
    if (!currentStudent.name.trim()) return;

    if (editingStudentIndex !== null) {
      // Update existing student
      const updated = [...students];
      updated[editingStudentIndex] = { ...currentStudent };
      setStudents(updated);
      setEditingStudentIndex(null);
    } else {
      // Add new student
      setStudents([...students, { ...currentStudent }]);
    }

    // Reset form
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
      setCurrentStudent({
        id: crypto.randomUUID(),
        name: '',
        age: 3.5,
        progress: {},
      });
    }
  };

  const saveAndComplete = async () => {
    if (students.length === 0) {
      setError('Please add at least one student');
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
          students: students.map(s => ({
            name: s.name,
            age: s.age,
            progress: s.progress,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save students');
      }

      // Mark onboarding complete
      const sessionData = localStorage.getItem('montree_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.onboarded = true;
        localStorage.setItem('montree_session', JSON.stringify(parsed));
      }

      setStep(2); // Show completion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const skipOnboarding = () => {
    const sessionData = localStorage.getItem('montree_session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.onboarded = true;
      localStorage.setItem('montree_session', JSON.stringify(parsed));
    }
    router.push('/montree/dashboard');
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center">
          <div className="text-6xl mb-6">👋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Montree!</h1>

          <div className="text-left bg-emerald-50 rounded-2xl p-5 mb-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              I&apos;m so excited to show you how this works and the features that will make your life so much easier!
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              But first, I must apologize — I have to give you a little work to do.
              <span className="font-semibold"> I promise this will save you a ton of effort in the future.</span>
            </p>
            <p className="text-gray-800 font-semibold text-lg">
              🌳 Let&apos;s get your children into the classroom!
            </p>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Let&apos;s Do This! →
          </button>

          <button
            onClick={skipOnboarding}
            className="w-full py-2 text-gray-500 hover:text-gray-700 mt-3"
          >
            Skip for now
          </button>

          {session?.teacher?.name && (
            <p className="text-sm text-gray-400 mt-6">
              Logged in as {session.teacher.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 1: Add Students
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Add Your Students</h1>
            <p className="text-emerald-300/70">
              {session?.classroom?.name || 'Your Classroom'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Student Form */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 outline-none text-lg"
              />
            </div>

            {/* Age Picker */}
            <div className="mb-4">
              <AgePicker
                value={currentStudent.age}
                onChange={(age) => setCurrentStudent({ ...currentStudent, age })}
              />
            </div>

            {/* Curriculum Progress Section */}
            {currentStudent.name && (
              <div className="mt-6">
                <h3 className="text-white/70 text-sm font-medium mb-3">
                  Where is {currentStudent.name.split(' ')[0]} in the curriculum?
                </h3>
                <p className="text-white/40 text-xs mb-4">
                  Select the most recent work they&apos;ve been presented. Leave blank if not started.
                </p>

                {loadingCurriculum ? (
                  <div className="text-white/50 text-center py-4">Loading curriculum...</div>
                ) : (
                  <div className="space-y-3">
                    {CURRICULUM_AREAS.map(area => (
                      <WheelPicker
                        key={area.id}
                        label={area.name}
                        icon={area.icon}
                        color={area.color}
                        items={(curriculumWorks[area.id] || []).map(w => ({
                          id: w.id,
                          label: w.name,
                        }))}
                        selectedId={currentStudent.progress[area.id] || null}
                        onSelect={(workId) => setCurrentStudent({
                          ...currentStudent,
                          progress: { ...currentStudent.progress, [area.id]: workId },
                        })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add/Update Button */}
            <button
              onClick={addStudent}
              disabled={!currentStudent.name.trim()}
              className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingStudentIndex !== null ? '✓ Update Student' : '+ Add Student'}
            </button>

            {editingStudentIndex !== null && (
              <button
                onClick={() => {
                  setEditingStudentIndex(null);
                  setCurrentStudent({ id: crypto.randomUUID(), name: '', age: 3.5, progress: {} });
                }}
                className="w-full mt-2 py-2 text-white/60 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Students List */}
          {students.length > 0 && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>👥</span>
                Students Added ({students.length})
              </h2>

              <div className="space-y-2">
                {students.map((student, index) => {
                  const progressCount = Object.values(student.progress).filter(Boolean).length;
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-white/50 text-xs">
                            {student.age} yrs • {progressCount > 0 ? `${progressCount} areas` : 'New student'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editStudent(index)}
                          className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeStudent(index)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30"
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={skipOnboarding}
              className="px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20"
            >
              Skip
            </button>
            <button
              onClick={saveAndComplete}
              disabled={loading || students.length === 0}
              className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : `Save ${students.length} Student${students.length !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Complete
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">You&apos;re All Set!</h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          {students.length} student{students.length !== 1 ? 's' : ''} added to your classroom.
          Now let&apos;s explore your dashboard!
        </p>

        <div className="bg-emerald-50 rounded-2xl p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-800 mb-2">What&apos;s Next?</h3>
          <ul className="text-gray-600 text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              View your curriculum dashboard
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Track student progress with one tap
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Generate weekly reports for parents
            </li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/montree/dashboard')}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
