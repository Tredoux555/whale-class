'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  student_count: number;
  students?: { id: string; name: string }[];
}

interface Child {
  id: string;
  name: string;
  age_group?: string;
  teacher_id?: string;
}

interface Stats {
  teachers: number;
  classrooms: number;
  students: number;
}

interface GameStats {
  todaySessions: number;
  activeStudents: number;
  totalMinutes: number;
}

export default function PrincipalDashboard() {
  const [stats, setStats] = useState<Stats>({ teachers: 0, classrooms: 0, students: 0 });
  const [gameStats, setGameStats] = useState<GameStats>({ todaySessions: 0, activeStudents: 0, totalMinutes: 0 });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  
  // Teacher management state
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAssignStudents, setShowAssignStudents] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load teachers with student details
      const teacherRes = await fetch('/api/teacher/list');
      const teacherData = await teacherRes.json();
      const teacherList = teacherData.teachers || [];
      setTeachers(teacherList);

      // Load all children
      const childRes = await fetch('/api/children');
      const childData = await childRes.json();
      const children = childData.children || [];
      setAllChildren(children);

      setStats({
        teachers: teacherList.length,
        classrooms: teacherList.filter((t: Teacher) => t.student_count > 0).length,
        students: children.length,
      });

      // Load today's game activity
      try {
        const gameRes = await fetch('/api/games/today-stats');
        const gameData = await gameRes.json();
        if (gameData) {
          setGameStats({
            todaySessions: gameData.todaySessions || 0,
            activeStudents: gameData.activeStudents || 0,
            totalMinutes: gameData.totalMinutes || 0,
          });
        }
      } catch (gameErr) {
        console.log('Game stats not available yet');
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/teacher/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeacherName.trim() }),
      });
      if (res.ok) {
        setNewTeacherName('');
        setShowAddTeacher(false);
        loadData();
      }
    } catch (e) {
      console.error('Failed to add teacher:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignStudent = async (childId: string, teacherId: string) => {
    setSaving(true);
    try {
      await fetch('/api/teacher/assign-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, teacherId }),
      });
      loadData();
    } catch (e) {
      console.error('Failed to assign student:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignStudent = async (childId: string, teacherId: string) => {
    setSaving(true);
    try {
      await fetch('/api/teacher/unassign-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, teacherId }),
      });
      loadData();
    } catch (e) {
      console.error('Failed to unassign student:', e);
    } finally {
      setSaving(false);
    }
  };

  // Get unassigned students
  const unassignedStudents = allChildren.filter(child => {
    const isAssigned = teachers.some(t => 
      t.students?.some(s => s.id === child.id)
    );
    return !isAssigned;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🏫</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-2xl">🏫</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{greeting},</p>
                <h1 className="text-xl font-bold text-gray-800">Principal</h1>
              </div>
            </div>
            <Link
              href="/admin/montree"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <span>🌳 Montree</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-indigo-200/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Principal Dashboard</h2>
              <p className="text-indigo-100">School overview and class management</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">{stats.classrooms}</div>
                <div className="text-xs text-indigo-100">Classes</div>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">{stats.teachers}</div>
                <div className="text-xs text-indigo-100">Teachers</div>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">{stats.students}</div>
                <div className="text-xs text-indigo-100">Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Game Activity */}
        {(gameStats.todaySessions > 0 || gameStats.activeStudents > 0) && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 mb-8 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <h3 className="font-bold">Today's Game Activity</h3>
                  <p className="text-purple-100 text-sm">Student engagement with learning games</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{gameStats.todaySessions}</div>
                  <div className="text-xs text-purple-100">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{gameStats.activeStudents}</div>
                  <div className="text-xs text-purple-100">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{gameStats.totalMinutes}m</div>
                  <div className="text-xs text-purple-100">Play Time</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== CLASSES SECTION (PRIMARY) ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <h2 className="text-xl font-bold text-gray-800">Classes</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddTeacher(true)}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium text-sm"
                >
                  + Add Teacher
                </button>
                <button
                  onClick={() => setShowAssignStudents(true)}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm"
                >
                  🔗 Assign Students
                </button>
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          <div className="p-6">
            {teachers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-lg">No classes yet</p>
                <p className="text-sm mt-2">Add a teacher to create a class</p>
                <button
                  onClick={() => setShowAddTeacher(true)}
                  className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  + Add First Teacher
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={`rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                      selectedTeacher?.id === teacher.id
                        ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTeacher(selectedTeacher?.id === teacher.id ? null : teacher)}
                  >
                    {/* Class Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{teacher.name}'s Class</h3>
                          <p className="text-indigo-100 text-sm">{teacher.student_count} students</p>
                        </div>
                      </div>
                    </div>

                    {/* Students Preview */}
                    <div className="p-4 bg-gradient-to-b from-indigo-50 to-white">
                      {teacher.student_count === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-2">No students assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {teacher.students?.slice(0, 6).map((student) => (
                            <span
                              key={student.id}
                              className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 border"
                            >
                              {student.name}
                            </span>
                          ))}
                          {(teacher.students?.length || 0) > 6 && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                              +{(teacher.students?.length || 0) - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
                      <Link
                        href={`/teacher/classroom?teacher=${teacher.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        👥 Classroom
                      </Link>
                      <Link
                        href={`/teacher/progress?teacher=${teacher.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center py-2 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        📊 Progress
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeacher(teacher);
                          setShowAssignStudents(true);
                        }}
                        className="flex-1 text-center py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        + Students
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unassigned Students Alert */}
        {unassignedStudents.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-amber-800">
                {unassignedStudents.length} Unassigned Students
              </h3>
              <button
                onClick={() => setShowAssignStudents(true)}
                className="ml-auto px-4 py-2 bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 transition-colors font-medium text-sm"
              >
                Assign Now
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.slice(0, 10).map((child) => (
                <span
                  key={child.id}
                  className="px-3 py-1 bg-white rounded-full text-sm text-amber-800 border border-amber-200"
                >
                  {child.name}
                </span>
              ))}
              {unassignedStudents.length > 10 && (
                <span className="px-3 py-1 bg-amber-100 rounded-full text-sm text-amber-600">
                  +{unassignedStudents.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Access Tools */}
        <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: '/teacher/curriculum', icon: '📋', title: 'Curriculum', desc: '342 works' },
            { href: '/games', icon: '🎮', title: 'Games', desc: '14 games' },
            { href: '/teacher/tools', icon: '🛠️', title: 'Materials', desc: 'Generators' },
            { href: '/admin', icon: '⚙️', title: 'Admin', desc: 'Settings' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-bold text-gray-800">{item.title}</div>
              <div className="text-sm text-gray-500">{item.desc}</div>
            </Link>
          ))}
        </div>
      </main>

      {/* ===== ADD TEACHER MODAL ===== */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
              <h3 className="text-xl font-bold">👩‍🏫 Add New Teacher</h3>
              <p className="text-emerald-100 text-sm mt-1">Create a new class with this teacher</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Name
              </label>
              <input
                type="text"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="e.g., Ms. Sarah"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddTeacher(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeacher}
                  disabled={saving || !newTeacherName.trim()}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Teacher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSIGN STUDENTS MODAL ===== */}
      {showAssignStudents && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <h3 className="text-xl font-bold">🔗 Assign Students to Teachers</h3>
              <p className="text-purple-100 text-sm mt-1">
                {selectedTeacher 
                  ? `Assigning to ${selectedTeacher.name}'s class` 
                  : 'Select a teacher and assign students'}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Teacher Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>
                <div className="flex flex-wrap gap-2">
                  {teachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        selectedTeacher?.id === teacher.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {teacher.name} ({teacher.student_count})
                    </button>
                  ))}
                </div>
              </div>

              {selectedTeacher && (
                <>
                  {/* Current Students */}
                  {selectedTeacher.students && selectedTeacher.students.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Current Students ({selectedTeacher.students.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeacher.students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            <span>{student.name}</span>
                            <button
                              onClick={() => handleUnassignStudent(student.id, selectedTeacher.id)}
                              className="w-4 h-4 bg-purple-200 hover:bg-red-300 rounded-full flex items-center justify-center text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Students */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Available Students ({unassignedStudents.length})
                    </h4>
                    {unassignedStudents.length === 0 ? (
                      <p className="text-gray-400 text-sm">All students are assigned!</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {unassignedStudents.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleAssignStudent(child.id, selectedTeacher.id)}
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-700 rounded-full text-sm transition-colors"
                          >
                            <span>+</span>
                            <span>{child.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAssignStudents(false);
                  setSelectedTeacher(null);
                }}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
