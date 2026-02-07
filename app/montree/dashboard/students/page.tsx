// /montree/dashboard/students/page.tsx
// Student Management - Add, Edit, Remove students at any time
// Accessible from dashboard for year-round student management
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';

// Curriculum areas (standard Montessori - letter icons)
const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: 'P', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: 'S', color: '#f97316' },
  { id: 'mathematics', name: 'Math', icon: 'M', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: 'L', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: 'C', color: '#8b5cf6' },
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

// Gender options
const GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
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

type BulkStudentForm = {
  name: string;
  age: number;
  gender: string;
  tenure: string;
  progress: { [areaId: string]: { workId: string | null; workName?: string } };
  notes: string;
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
  classroomId,
  onWorkAdded,
}: {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  works: Work[];
  selectedWorkId: string | null;
  onSelect: (workId: string | null, workName?: string) => void;
  classroomId: string;
  onWorkAdded?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customWorkName, setCustomWorkName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleAddCustomWork = async () => {
    if (!customWorkName.trim() || !classroomId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          name: customWorkName.trim(),
          area_key: areaId,
          is_custom: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to add work');
      const data = await res.json();
      // Select the new work
      onSelect(data.work?.id || data.id, customWorkName.trim());
      // Notify parent to refresh curriculum
      if (onWorkAdded) onWorkAdded();
      // Reset
      setCustomWorkName('');
      setIsAddingCustom(false);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to add custom work:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <span className="w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>{icon}</span>
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

          {/* Divider and Add Custom Work */}
          <div className="border-t border-slate-100 p-2">
            {!isAddingCustom ? (
              <button
                onClick={(e) => { e.stopPropagation(); setIsAddingCustom(true); }}
                className="w-full px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50 rounded flex items-center gap-2"
              >
                <span>+</span>
                <span>Add custom work</span>
              </button>
            ) : (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={customWorkName}
                  onChange={(e) => setCustomWorkName(e.target.value)}
                  placeholder="Work name..."
                  className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm placeholder-slate-400 focus:border-teal-400 outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomWork(); if (e.key === 'Escape') { setIsAddingCustom(false); setCustomWorkName(''); } }}
                />
                <button
                  onClick={handleAddCustomWork}
                  disabled={!customWorkName.trim() || isSubmitting}
                  className="px-3 py-1.5 bg-teal-500 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? '...' : 'Add'}
                </button>
              </div>
            )}
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
  const [bulkMode, setBulkMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: 3.5,
    tenure: 'new' as string,
    progress: {} as { [k: string]: { workId: string | null; workName?: string } }
  });
  const [bulkStudents, setBulkStudents] = useState<BulkStudentForm[]>([
    { name: '', age: 3, gender: 'boy', tenure: 'new', progress: {}, notes: '' }
  ]);
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
    setBulkMode(true);
    setBulkStudents([
      { name: '', age: 3, gender: 'boy', tenure: 'new', progress: {}, notes: '' }
    ]);
    setShowForm(true);
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setBulkMode(false);
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
    setBulkMode(false);
    setFormData({ name: '', age: 3.5, tenure: 'new', progress: {} });
    setBulkStudents([
      { name: '', age: 3, gender: 'boy', tenure: 'new', progress: {}, notes: '' }
    ]);
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
          headers: { 'Content-Type': 'application/json', 'x-school-id': session.school?.id || '' },
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

  const handleBulkSave = async () => {
    const validStudents = bulkStudents.filter(s => s.name.trim());
    if (validStudents.length === 0 || !session?.classroom?.id) return;

    setSaving(true);
    const toastId = toast.loading(`Saving ${validStudents.length} student${validStudents.length !== 1 ? 's' : ''}...`);

    try {
      const payload = validStudents.map(student => ({
        name: student.name,
        age: student.age,
        gender: student.gender,
        tenure: student.tenure,
        progress: Object.fromEntries(
          Object.entries(student.progress).map(([areaId, data]) => [areaId, data.workId])
        ),
        notes: student.notes,
      }));

      const res = await fetch('/api/montree/children/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: session.classroom!.id,
          students: payload,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save students');
      }

      toast.dismiss(toastId);
      toast.success(`${validStudents.length} student${validStudents.length !== 1 ? 's' : ''} added to your classroom!`);
      closeForm();
      loadStudents(session.classroom?.id);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Failed to save students');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!session?.classroom?.id) return;
    try {
      const res = await fetch(`/api/montree/children/${studentId}`, {
        method: 'DELETE',
        headers: { 'x-school-id': session.school?.id || '' },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Student removed');
      setDeleteConfirm(null);
      loadStudents(session.classroom?.id);
    } catch (err) {
      toast.error('Failed to remove student');
    }
  };

  const addAnotherStudent = () => {
    if (bulkStudents.length < 30) {
      setBulkStudents([
        ...bulkStudents,
        { name: '', age: 3, gender: 'boy', tenure: 'new', progress: {}, notes: '' }
      ]);
    }
  };

  const removeStudent = (index: number) => {
    if (bulkStudents.length > 1) {
      setBulkStudents(bulkStudents.filter((_, i) => i !== index));
    }
  };

  const updateBulkStudent = (index: number, field: keyof BulkStudentForm, value: unknown) => {
    const updated = [...bulkStudents];
    updated[index] = { ...updated[index], [field]: value };
    setBulkStudents(updated);
  };

  const updateBulkProgress = (index: number, areaId: string, workId: string | null, workName?: string) => {
    const updated = [...bulkStudents];
    updated[index].progress[areaId] = { workId, workName };
    setBulkStudents(updated);
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
      {showForm && !bulkMode && (
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
                        classroomId={session.classroom?.id || ''}
                        onWorkAdded={() => loadCurriculum(session.classroom?.id)}
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

      {/* Bulk Import Form Modal */}
      {showForm && bulkMode && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center py-8 px-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                <h2 className="font-bold text-xl text-slate-800">Add Students</h2>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 text-2xl">
                  ✕
                </button>
              </div>

              {/* Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 p-6 flex gap-4">
                <div className="text-3xl flex-shrink-0">🌱</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Building Student Profiles</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Welcome! You're creating developmental profiles that will grow with each child over time. The more context you provide — their strengths, challenges, learning style, and personality — the better our Montessori Guru can support you with personalized guidance, activity recommendations, and insights. Think of this as the beginning of a living portrait of each child.
                  </p>
                </div>
              </div>

              {/* Students List */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
                {bulkStudents.map((student, index) => (
                  <div key={index} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                    {/* Student Number Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-slate-800">
                        Student {index + 1}
                      </h4>
                      {index > 0 && (
                        <button
                          onClick={() => removeStudent(index)}
                          className="text-slate-400 hover:text-red-500 text-2xl font-light"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Row 1: Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={student.name}
                          onChange={(e) => updateBulkStudent(index, 'name', e.target.value)}
                          placeholder="Student's name"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:border-teal-400 outline-none text-sm"
                        />
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                        <select
                          value={student.age}
                          onChange={(e) => updateBulkStudent(index, 'age', parseFloat(e.target.value))}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:border-teal-400 outline-none text-sm"
                        >
                          {AGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                        <select
                          value={student.gender}
                          onChange={(e) => updateBulkStudent(index, 'gender', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:border-teal-400 outline-none text-sm"
                        >
                          {GENDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Tenure */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Time at School</label>
                      <select
                        value={student.tenure}
                        onChange={(e) => updateBulkStudent(index, 'tenure', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:border-teal-400 outline-none text-sm"
                      >
                        {TENURE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 3: Curriculum */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current Work in Each Area
                      </label>
                      <p className="text-xs text-slate-500 mb-3">
                        Select the most recent work each child has been presented in each area. Earlier works will be marked as mastered.
                      </p>
                      <div className="space-y-2">
                        {CURRICULUM_AREAS.map((area) => (
                          <CurriculumPicker
                            key={area.id}
                            areaId={area.id}
                            areaName={area.name}
                            icon={area.icon}
                            color={area.color}
                            works={curriculumWorks[area.id] || []}
                            selectedWorkId={student.progress[area.id]?.workId || null}
                            onSelect={(workId, workName) =>
                              updateBulkProgress(index, area.id, workId, workName)
                            }
                            classroomId={session.classroom?.id || ''}
                            onWorkAdded={() => loadCurriculum(session.classroom?.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Notes */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Profile Notes
                      </label>
                      <textarea
                        value={student.notes}
                        onChange={(e) => updateBulkStudent(index, 'notes', e.target.value)}
                        placeholder="Share anything that helps us understand this child — strengths, challenges, interests, temperament, sensitivities, family context, learning style... The more detail, the better the Guru can help."
                        rows={4}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:border-teal-400 outline-none text-sm resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        This information is kept private and only used by the Guru to provide personalized support.
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Another Student Button */}
              {bulkStudents.length < 30 && (
                <div className="px-6 py-4 border-t border-slate-100">
                  <button
                    onClick={addAnotherStudent}
                    className="w-full py-2.5 px-4 bg-teal-50 border-2 border-dashed border-teal-200 text-teal-700 rounded-lg font-medium hover:bg-teal-100 transition-colors text-sm"
                  >
                    + Add Another Student
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={closeForm}
                  className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSave}
                  disabled={bulkStudents.filter(s => s.name.trim()).length === 0 || saving}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg transition-all"
                >
                  {saving ? 'Saving...' : `Save All (${bulkStudents.filter(s => s.name.trim()).length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
