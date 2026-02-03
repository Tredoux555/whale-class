// /montree/dashboard/students/page.tsx
// Student Management - Add, Edit, Remove students at any time
// Accessible from dashboard for year-round student management
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';

// Curriculum areas (standard Montessori - Language includes English/Phonics)
const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
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

// Tenure options - how long has student been in the program
const TENURE_OPTIONS = [
  { value: 'new', label: 'Just started (less than 2 weeks)', months: 0 },
  { value: 'few_weeks', label: 'A few weeks (2-4 weeks)', months: 1 },
  { value: '1_3_months', label: '1-3 months', months: 2 },
  { value: '3_6_months', label: '3-6 months', months: 4 },
  { value: '6_12_months', label: '6-12 months', months: 9 },
  { value: '1_year_plus', label: 'More than a year', months: 15 },
];

// Helper to calculate enrolled_at from tenure selection
function getEnrolledAtFromTenure(tenure: string): string {
  const option = TENURE_OPTIONS.find(t => t.value === tenure);
  if (!option) return new Date().toISOString().split('T')[0];
  const date = new Date();
  date.setMonth(date.getMonth() - option.months);
  return date.toISOString().split('T')[0];
}

// Helper to get tenure value from enrolled_at date
function getTenureFromEnrolledAt(enrolledAt: string | null): string {
  if (!enrolledAt) return 'new';
  const enrolled = new Date(enrolledAt);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - enrolled.getFullYear()) * 12 + (now.getMonth() - enrolled.getMonth());

  if (monthsDiff < 1) return 'new';
  if (monthsDiff < 2) return 'few_weeks';
  if (monthsDiff < 4) return '1_3_months';
  if (monthsDiff < 7) return '3_6_months';
  if (monthsDiff < 13) return '6_12_months';
  return '1_year_plus';
}

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
  photo_url?: string;
  enrolled_at?: string;
  progress?: { [areaId: string]: { workId: string | null; workName?: string } };
};

// Compact Curriculum Picker for student management
function CurriculumPicker({
  areaId,
  areaName,
  icon,
  color,
  works,
  selectedWorkId,
  onSelect,
}: {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  works: Work[];
  selectedWorkId: string | null;
  onSelect: (workId: string | null, workName?: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedWork = works.find(w => w.id === selectedWorkId);
  const displayLabel = selectedWork?.name || 'Not started';
  const filteredWorks = searchQuery.trim()
    ? works.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : works;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-left flex items-center gap-2 hover:border-blue-300 transition-colors text-sm"
        style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
      >
        <span>{icon}</span>
        <span className="flex-1 truncate text-slate-600">{displayLabel}</span>
        <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search...`}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm placeholder-slate-400 focus:border-blue-400 outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {!searchQuery && (
              <button
                onClick={() => { onSelect(null); setIsOpen(false); }}
                className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm ${selectedWorkId === null ? 'bg-blue-50' : ''}`}
              >
                <span className="text-slate-400">—</span>
                <span className="text-slate-500">Not started</span>
              </button>
            )}
            {filteredWorks.map((work, idx) => (
              <button
                key={work.id}
                onClick={() => { onSelect(work.id, work.name); setIsOpen(false); setSearchQuery(''); }}
                className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm ${selectedWorkId === work.id ? 'bg-blue-50' : ''}`}
              >
                <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>
                  {idx + 1}
                </span>
                <span className="flex-1 truncate text-slate-700">{work.name}</span>
                {selectedWorkId === work.id && <span className="text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [curriculumWorks, setCurriculumWorks] = useState<{ [areaId: string]: Work[] }>({});

  // Add/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: 3.5,
    tenure: 'new' as string,
    progress: {} as { [k: string]: { workId: string | null; workName?: string } }
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);
    loadStudents(sess.classroom?.id);
    loadCurriculum(sess.classroom?.id);
  }, [router]);

  const loadStudents = async (classroomId?: string) => {
    if (!classroomId) return;
    try {
      const res = await fetch(`/api/montree/children?classroom_id=${classroomId}`);
      const data = await res.json();
      setStudents(data.children || []);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculum = async (classroomId?: string) => {
    if (!classroomId) return;
    try {
      const res = await fetch(`/api/montree/curriculum?classroom_id=${classroomId}`);
      if (res.ok) {
        const data = await res.json();
        const grouped: { [areaId: string]: Work[] } = {};
        for (const area of CURRICULUM_AREAS) grouped[area.id] = [];
        for (const work of data.curriculum || []) {
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
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }
  };

  const openAddForm = () => {
    setEditingStudent(null);
    setFormData({ name: '', age: 3.5, tenure: 'new', progress: {} });
    setShowForm(true);
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      age: student.age || 3.5,
      tenure: getTenureFromEnrolledAt(student.enrolled_at || null),
      progress: student.progress || {},
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({ name: '', age: 3.5, tenure: 'new', progress: {} });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !session?.classroom?.id) return;
    setSaving(true);

    try {
      const enrolledAt = getEnrolledAtFromTenure(formData.tenure);

      if (editingStudent) {
        // Update existing student
        const res = await fetch(`/api/montree/children/${editingStudent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            age: formData.age,
            enrolled_at: enrolledAt,
          }),
        });
        if (!res.ok) throw new Error('Failed to update');
        toast.success(`${formData.name} updated`);
      } else {
        // Add new student - use /api/montree/children POST
        const res = await fetch('/api/montree/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classroomId: session.classroom.id,
            name: formData.name,
            age: formData.age,
            enrolled_at: enrolledAt,
            progress: Object.fromEntries(
              Object.entries(formData.progress).map(([areaId, data]) => [areaId, data.workId])
            ),
          }),
        });
        if (!res.ok) throw new Error('Failed to add');
        toast.success(`${formData.name} added to class`);
      }

      closeForm();
      loadStudents(session.classroom?.id);
    } catch (err) {
      toast.error(editingStudent ? 'Failed to update student' : 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!session?.classroom?.id) return;
    try {
      const res = await fetch(`/api/montree/children/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Student removed');
      setDeleteConfirm(null);
      loadStudents(session.classroom?.id);
    } catch (err) {
      toast.error('Failed to remove student');
    }
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">👶</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/montree/dashboard" className="text-white/80 hover:text-white">
            ← Back
          </Link>
          <div>
            <h1 className="font-bold">Students</h1>
            <p className="text-xs text-white/70">{session.classroom?.name}</p>
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30"
        >
          + Add Student
        </button>
      </header>

      {/* Students List */}
      <main className="p-4 max-w-2xl mx-auto">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">👶</span>
            <p className="text-slate-500 mb-4">No students in this classroom yet</p>
            <button
              onClick={openAddForm}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
            >
              Add Your First Student
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {student.photo_url ? (
                        <img src={student.photo_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-400">
                        {student.age ? `${student.age} years` : 'Age not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(student)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(student.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-sm hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === student.id && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-700 text-sm mb-2">
                      Are you sure you want to remove {student.name}? This will also delete their progress records.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium"
                      >
                        Yes, Remove
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-slate-400 text-xs mt-6">
          {students.length} student{students.length !== 1 ? 's' : ''} in {session.classroom?.name}
        </p>
      </main>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-lg text-slate-800">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 text-xl">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Student's name"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:border-blue-400 outline-none"
                  autoFocus
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <select
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseFloat(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:border-blue-400 outline-none"
                >
                  {AGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} years old</option>
                  ))}
                </select>
              </div>

              {/* Tenure - How long in program */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time in program
                  <span className="text-slate-400 font-normal ml-1">(helps Guru give better advice)</span>
                </label>
                <select
                  value={formData.tenure}
                  onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:border-blue-400 outline-none"
                >
                  {TENURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Curriculum Progress (only for new students) */}
              {!editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Progress (optional)
                  </label>
                  <div className="space-y-2">
                    {CURRICULUM_AREAS.map((area) => (
                      <CurriculumPicker
                        key={area.id}
                        areaId={area.id}
                        areaName={area.name}
                        icon={area.icon}
                        color={area.color}
                        works={curriculumWorks[area.id] || []}
                        selectedWorkId={formData.progress[area.id]?.workId || null}
                        onSelect={(workId, workName) => setFormData({
                          ...formData,
                          progress: {
                            ...formData.progress,
                            [area.id]: { workId, workName },
                          },
                        })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
