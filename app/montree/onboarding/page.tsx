// /montree/onboarding/page.tsx
// Teacher onboarding - Add students with curriculum progress (MANDATORY)
// Theme: Clean white/blue for teachers (NOT green - that's for principals)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import CurriculumPicker from './components/CurriculumPicker';
import AgePicker from './components/AgePicker';
import { Work, Student, CURRICULUM_AREAS, AGE_OPTIONS } from './types';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<{ teacher?: { role?: string; has_completed_tutorial?: boolean }; classroom?: { id?: string }; onboarded?: boolean } | null>(null);
  const isParent = session?.teacher?.role === 'homeschool_parent';
  const [loading, setLoading] = useState(false);
  const [seedingCurriculum, setSeedingCurriculum] = useState(false);
  const [error, setError] = useState('');

  const [curriculumWorks, setCurriculumWorks] = useState<{ [areaId: string]: Work[] }>({});
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student>({
    id: generateId(),
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

      // Home parents skip form-based onboarding — use conversational setup
      if (parsed.teacher?.role === 'homeschool_parent') {
        if (parsed.classroom?.id) {
          fetch(`/api/montree/children?classroom_id=${parsed.classroom.id}`)
            .then(r => r.json())
            .then(data => {
              if (data.children && data.children.length > 0) {
                router.replace(`/montree/home/${data.children[0].id}`);
              } else {
                router.replace('/montree/home/setup');
              }
            })
            .catch(() => {
              router.replace('/montree/home/setup');
            });
        } else {
          router.replace('/montree/home/setup');
        }
        return;
      }

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

    // Find the exact position to insert (right after the clicked work)
    const currentWorks = curriculumWorks[areaId] || [];
    const insertAfterIndex = currentWorks.findIndex(w => w.sequence === afterSequence);
    const insertAtIndex = insertAfterIndex >= 0 ? insertAfterIndex + 1 : currentWorks.length;

    // Calculate sequence: average of before and after, or afterSequence + 0.5 if at end
    const prevSeq = currentWorks[insertAtIndex - 1]?.sequence ?? afterSequence;
    const nextSeq = currentWorks[insertAtIndex]?.sequence ?? (prevSeq + 1);
    const newSequence = (prevSeq + nextSeq) / 2;

    const tempWork: Work = {
      id: tempId,
      name: workName,
      sequence: newSequence,
      isCustom: true,
    };

    // Update local state optimistically - insert at exact position
    setCurriculumWorks(prev => {
      const updated = { ...prev };
      const areaWorks = [...(updated[areaId] || [])];
      areaWorks.splice(insertAtIndex, 0, tempWork);
      updated[areaId] = areaWorks;
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
      }
    } catch (err) {
      // Error saving custom work
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
      id: generateId(),
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
      setCurrentStudent({ id: generateId(), name: '', age: 3.5, progress: {} });
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
      setError(isParent ? t('validation.addAtLeastOneChild') : t('validation.addAtLeastOneStudent'));
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

  // Step 0: Welcome (Emerald/Teal theme - warm & inspiring)
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100/50 p-10 w-full max-w-md text-center">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-4xl">🌳</span>
          </div>

          {/* Welcome headline */}
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            {t('onboarding.welcome')}
          </h1>
          <p className="text-emerald-600 text-lg mb-8">
            {t('onboarding.tagline')}
          </p>

          {/* Inspiring message */}
          <div className="text-left space-y-4 mb-8">
            <p className="text-slate-600 leading-relaxed">
              {t('onboarding.experienceIntro')}
            </p>
            <p className="text-slate-500 leading-relaxed text-sm">
              {t('onboarding.dashboardAwaits')} {isParent ? t('common.yourChildren') : t('common.students')}
            </p>
          </div>

          <button
            onClick={() => {
              // Mark as onboarded and go to dashboard
              const sessionData = localStorage.getItem('montree_session');
              if (sessionData) {
                const parsed = JSON.parse(sessionData);
                parsed.onboarded = true;
                localStorage.setItem('montree_session', JSON.stringify(parsed));
              }
              router.push('/montree/dashboard');
            }}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            {isParent ? t('onboarding.enterMyHome') : t('onboarding.enterMyClassroom')}
          </button>

          {session?.teacher?.name && (
            <p className="text-sm text-slate-400 mt-8">
              {session.teacher.name} · {session.classroom?.name}
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
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{isParent ? t('onboarding.addChildren') : t('onboarding.addStudents')}</h1>
            <p className="text-blue-600 font-medium">
              {session?.classroom?.name || t('onboarding.yourClassroom')}
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
              {editingStudentIndex !== null
                ? (isParent ? t('onboarding.editChild') : t('onboarding.editStudent'))
                : (isParent ? t('onboarding.newChild') : t('onboarding.newStudent'))}
            </h2>

            {/* Name Input */}
            <div className="mb-4">
              <input
                type="text"
                value={currentStudent.name}
                onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })}
                placeholder={isParent ? t('onboarding.childNamePlaceholder') : t('onboarding.studentNamePlaceholder')}
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
                <span>📊</span> {t('onboarding.currentProgress')}
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                {isParent ? t('onboarding.selectMostRecent').replace('{role}', 'child') : t('onboarding.selectMostRecent').replace('{role}', 'student')}
              </p>

              {loadingCurriculum || seedingCurriculum ? (
                <div className="text-slate-500 text-center py-4">
                  {seedingCurriculum ? t('onboarding.settingUpCurriculum') : t('onboarding.loadingCurriculum')}
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
              {editingStudentIndex !== null
                ? (isParent ? t('onboarding.updateChild') : t('onboarding.updateStudent'))
                : (isParent ? t('onboarding.addChild') : t('onboarding.addStudent'))}
            </button>

            {editingStudentIndex !== null && (
              <button
                onClick={() => {
                  setEditingStudentIndex(null);
                  setCurrentStudent({ id: generateId(), name: '', age: 3.5, progress: {} });
                }}
                className="w-full mt-2 py-2 text-slate-500 hover:text-slate-700"
              >
                {t('onboarding.cancelEdit')}
              </button>
            )}
          </div>

          {/* Students List */}
          {students.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span>👥</span>
                {isParent ? t('onboarding.childrenAdded') : t('onboarding.studentsAdded')} ({students.length})
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
                            {progressCount > 0
                              ? t('onboarding.yearsAreas').replace('{age}', student.age.toString()).replace('{count}', progressCount.toString())
                              : t('onboarding.newToMontessori')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editStudent(index)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300"
                        >
                          {t('common.edit')}
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
            {loading ? t('common.saving') : students.length === 0
              ? (isParent ? t('onboarding.addAtLeastOneChild') : t('onboarding.addAtLeastOneStudent'))
              : `${t('common.save')} ${students.length} ${isParent
                  ? (students.length !== 1 ? t('onboarding.saveChildren').replace('{count}', students.length.toString()) : t('onboarding.saveChild').replace('{count}', students.length.toString()))
                  : (students.length !== 1 ? t('onboarding.saveStudents').replace('{count}', students.length.toString()) : t('onboarding.saveStudent').replace('{count}', students.length.toString()))} & ${t('common.continue')} →`}
          </button>

          <p className="text-center text-slate-400 text-xs mt-4">
            {isParent ? t('onboarding.mustAddBefore') : t('onboarding.mustAddStudentsBefore')}
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Complete - Inspirational success screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100/50 p-10 w-full max-w-md text-center">
        {/* Celebration icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
          <span className="text-4xl">✨</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          {t('onboarding.beautiful')}
        </h1>
        <p className="text-emerald-600 text-lg mb-6">
          {students.length === 1 ? t('onboarding.mindReady').replace('{count}', '1') : t('onboarding.mindsReady').replace('{count}', students.length.toString())}
        </p>

        {/* Inspiring message */}
        <p className="text-slate-500 leading-relaxed mb-8">
          {t('onboarding.journeyStarts')}
        </p>

        {/* What awaits - more poetic */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 mb-8 text-left border border-emerald-100">
          <p className="text-slate-700 font-medium mb-3">{t('onboarding.whatAwaits')}</p>
          <div className="space-y-3 text-slate-600 text-sm">
            <p className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">→</span>
              <span>{t('onboarding.livingMap')}</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">→</span>
              <span>{t('onboarding.effortlessTracking')}</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">→</span>
              <span>{t('onboarding.beautifulRecord')}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/montree/dashboard')}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          {t('onboarding.goToDashboard')}
        </button>
      </div>
    </div>
  );
}
