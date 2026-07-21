// /montree/dashboard/students/page.tsx
// Student Management - Add, Edit, Remove students at any time
// Accessible from dashboard for year-round student management
'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent, setSession as saveSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast, Toaster } from 'sonner';
import ProfilePhotoCapture from '@/components/montree/student/ProfilePhotoCapture';
import StudentFormGuide from '@/components/montree/onboarding/StudentFormGuide';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';
import AreaBadge from '@/components/montree/shared/AreaBadge';

// Paste-based class-list import — same surface the dashboard empty state uses.
const BulkPasteImport = dynamic(() => import('@/components/montree/BulkPasteImport'), { ssr: false });


// Dark-register serif for headings (Jul 16 2026 sweep).
const SERIF = "var(--font-lora), 'Iowan Old Style', Georgia, serif";

// Derive curriculum areas from shared config (canonical colors)
const CURRICULUM_AREAS = AREA_ORDER.map(id => ({
  id,
  name: AREA_CONFIG[id].name,
  icon: AREA_CONFIG[id].icon,
  color: AREA_CONFIG[id].color,
}));

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

// Helper type for tenure options
type TenureOption = { value: string; label: string; months: number };

// Helper to calculate enrolled_at from tenure selection
function getEnrolledAtFromTenure(tenure: string, tenureOptions: TenureOption[]): string {
  const option = tenureOptions.find(t => t.value === tenure);
  if (!option) return new Date().toISOString().split('T')[0];
  const date = new Date();
  date.setMonth(date.getMonth() - option.months);
  return date.toISOString().split('T')[0];
}

// Helper to get tenure value from enrolled_at date
function getTenureFromEnrolledAt(enrolledAt: string | null, tenureOptions: TenureOption[]): string {
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

  const { t } = useI18n();
  const selectedWork = works.find(w => w.id === selectedWorkId);
  const displayLabel = selectedWork?.name || t('students.notStarted');
  const filteredWorks = searchQuery.trim()
    ? works.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : works;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 bg-black/30 border border-[rgba(52,211,153,0.15)] rounded-lg text-left flex items-center gap-2 hover:border-[rgba(52,211,153,0.35)] transition-colors text-sm"
        style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
      >
        <AreaBadge area={areaId} size="sm" />
        <span className="flex-1 truncate text-white/70">{displayLabel}</span>
        <span className="text-white/40 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 border border-[rgba(52,211,153,0.2)] rounded-lg shadow-xl overflow-hidden" style={{ background: '#0f2418' }}>
          <div className="p-2 border-b border-white/10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
              className="w-full px-2 py-1.5 bg-black/30 border border-[rgba(52,211,153,0.15)] rounded text-sm text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {!searchQuery && (
              <button
                onClick={() => { onSelect(null); setIsOpen(false); }}
                className={`w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2 text-sm ${selectedWorkId === null ? 'bg-[#34d399]/10' : ''}`}
              >
                <span className="text-white/40">—</span>
                <span className="text-white/60">{t('students.notStarted')}</span>
              </button>
            )}
            {filteredWorks.map((work, idx) => (
              <button
                key={work.id}
                onClick={() => { onSelect(work.id, work.name); setIsOpen(false); setSearchQuery(''); }}
                className={`w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2 text-sm ${selectedWorkId === work.id ? 'bg-[#34d399]/10' : ''}`}
              >
                <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>
                  {idx + 1}
                </span>
                <span className="flex-1 truncate text-white/85">{work.name}</span>
                {selectedWorkId === work.id && <span className="text-[#34d399]">✓</span>}
              </button>
            ))}
          </div>

          {/* Divider and Add Custom Work */}
          <div className="border-t border-white/10 p-2">
            {!isAddingCustom ? (
              <button
                onClick={(e) => { e.stopPropagation(); setIsAddingCustom(true); }}
                className="w-full px-3 py-2 text-left text-sm text-[#34d399] hover:bg-[#34d399]/10 rounded flex items-center gap-2"
              >
                <span>+</span>
                <span>{t('students.addCustomWork')}</span>
              </button>
            ) : (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={customWorkName}
                  onChange={(e) => setCustomWorkName(e.target.value)}
                  placeholder={t('students.customWorkPlaceholder')}
                  className="flex-1 px-2 py-1.5 bg-black/30 border border-[rgba(52,211,153,0.15)] rounded text-sm text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomWork(); if (e.key === 'Escape') { setIsAddingCustom(false); setCustomWorkName(''); } }}
                />
                <button
                  onClick={handleAddCustomWork}
                  disabled={!customWorkName.trim() || isSubmitting}
                  className="px-3 py-1.5 bg-[#1D6B48] text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-[#236B4C]"
                >
                  {isSubmitting ? t('common.loading') : t('common.add')}
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
  const { t, locale } = useI18n();
  const areaNameT = (key: string) => t(`area.${key}` as any) || AREA_CONFIG[key]?.name || key;

  // Gender options - translated
  const GENDER_OPTIONS = [
    { value: 'boy', label: t('students.genderBoy') },
    { value: 'girl', label: t('students.genderGirl') },
  ];

  // Tenure options - translated
  const TENURE_OPTIONS: TenureOption[] = [
    { value: 'new', label: t('students.tenureNew'), months: 0 },
    { value: 'few_weeks', label: t('students.tenureFewWeeks'), months: 1 },
    { value: '1_3_months', label: t('students.tenure1to3Months'), months: 2 },
    { value: '3_6_months', label: t('students.tenure3to6Months'), months: 4 },
    { value: '6_12_months', label: t('students.tenure6to12Months'), months: 9 },
    { value: '1_year_plus', label: t('students.tenureMoreThan1Year'), months: 15 },
  ];

  const [session, setSession] = useState<MontreeSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [curriculumWorks, setCurriculumWorks] = useState<{ [areaId: string]: Work[] }>({});

  // Add/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
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
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Guide state — only show once per device
  const [guideSkipped, setGuideSkipped] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('montree_guide_studentform_done');
    }
    return false;
  });
  const isFirstTime = session && !session.teacher.has_completed_tutorial && students.length === 0;

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

  // Auto-open bulk form for first-time users — HIDDEN: onboarding guides disabled
  useEffect(() => {
    if (false && session && !session.teacher.has_completed_tutorial && students.length === 0 && !loading && !showForm && !localStorage.getItem('montree_guide_studentform_done')) {
      openAddForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, students.length, loading]);

  const loadStudents = async (classroomId?: string) => {
    if (!classroomId) return;
    try {
      const res = await fetch(`/api/montree/children?classroom_id=${classroomId}`);
      const data = await res.json();
      setStudents(data.children || []);
    } catch (err) {
      toast.error(isHomeschoolParent(session) ? t('students.failedToLoadChildren') : t('students.failedToLoad'));
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

  // First-intake fix (Jul 21 2026): an empty classroom means the teacher is
  // still setting up their class, so "+ Add Student" / "Add Your First
  // Student" go straight to the paste-based Bulk Import — the same surface
  // the dashboard empty state offers. The detailed per-child form (below)
  // is for adding a new child to an already-running class. Homeschool
  // parents keep the single-child form: they have no class list to paste.
  const openAddFlow = () => {
    if (students.length === 0 && !isHomeschoolParent(session)) {
      setShowBulkImport(true);
      return;
    }
    openAddForm();
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
      tenure: getTenureFromEnrolledAt(student.enrolled_at || null, TENURE_OPTIONS),
      progress: student.progress || {},
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowPhotoCapture(false);
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
      const enrolledAt = getEnrolledAtFromTenure(formData.tenure, TENURE_OPTIONS);

      if (editingStudent) {
        // Update existing student
        const res = await montreeApi(`/api/montree/children/${editingStudent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formData.name,
            age: formData.age,
            enrolled_at: enrolledAt,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Student update failed:', res.status, errData);
          throw new Error(errData.error || t('students.failedToUpdate'));
        }
        toast.success(`${formData.name} ${t('students.updated')}`);
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
        if (!res.ok) throw new Error(t('students.failedToAdd'));
        toast.success(`${formData.name} ${isHomeschoolParent(session) ? t('students.added') : t('students.addedToClass')}`);

        // Mark tutorial complete after first student added
        if (session.teacher && !session.teacher.has_completed_tutorial) {
          try {
            await fetch('/api/montree/tutorial/complete', { method: 'POST' });
            // Update session in localStorage
            const updatedSession = {
              ...session,
              teacher: { ...session.teacher, has_completed_tutorial: true }
            };
            saveSession(updatedSession);
            setSession(updatedSession);
          } catch (err) {
            console.error('Failed to mark tutorial complete:', err);
            // Non-blocking error - student was still added successfully
          }
        }
      }

      closeForm();
      loadStudents(session.classroom?.id);
    } catch (err) {
      if (editingStudent) {
        toast.error(t('students.failedToUpdate'));
      } else {
        toast.error(isHomeschoolParent(session) ? t('students.failedToAddChild') : t('students.failedToAdd'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const validStudents = bulkStudents.filter(s => s.name.trim());
    if (validStudents.length === 0 || !session?.classroom?.id) return;

    setSaving(true);
    const toastId = toast.loading(isHomeschoolParent(session) ? t('students.savingChildren') : t('students.savingStudents'));

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
      toast.success(`${validStudents.length} ${isHomeschoolParent(session) ? t('students.savedChild') : t('students.saved')}`);

      // Mark tutorial complete after bulk add
      const wasFirstTime = session?.teacher && !session.teacher.has_completed_tutorial;
      if (wasFirstTime) {
        try {
          await fetch('/api/montree/tutorial/complete', { method: 'POST' });
          // Update session
          const updatedSession = {
            ...session,
            teacher: { ...session.teacher, has_completed_tutorial: true }
          };
          saveSession(updatedSession);
          setSession(updatedSession);
        } catch (err) {
          console.error('Failed to mark tutorial complete:', err);
        }
      }

      closeForm();
      loadStudents(session.classroom?.id);

      // Redirect first-time users to dashboard after saving
      if (wasFirstTime) {
        setTimeout(() => router.push('/montree/dashboard?onboarded=1'), 800);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : (isHomeschoolParent(session) ? t('students.failedToLoadChildren') : t('students.failedToLoad')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!session?.classroom?.id) return;
    try {
      const res = await montreeApi(`/api/montree/children/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t('common.removed'));
      setDeleteConfirm(null);
      loadStudents(session.classroom?.id);
    } catch (err) {
      toast.error(isHomeschoolParent(session) ? t('students.failedToRemoveChild') : t('students.failedToRemove'));
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1a0f' }}>
        <div className="animate-bounce text-4xl">👶</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: '#0a1a0f', color: '#fff' }}>
      {/* Fixed off-centre emerald glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
      }} />
      <div className="relative" style={{ zIndex: 1 }}>
      <Toaster position="top-center" />

      {/* Sub-header */}
      <div className="border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(8,20,12,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">👶</span>
          <h1 className="font-bold text-white/95" style={{ fontFamily: SERIF, fontWeight: 500 }}>{isHomeschoolParent(session) ? t('students.children') : t('students.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isHomeschoolParent(session) && (
            <button
              onClick={() => router.push('/montree/dashboard/labels')}
              className="px-3 py-1.5 bg-white/[0.08] text-white/70 rounded-lg text-sm font-medium hover:bg-white/[0.14] border border-[rgba(52,211,153,0.15)]"
            >
              🏷️ {t('nav.labels')}
            </button>
          )}
          <button
            data-tutorial="add-student-button"
            data-copilot="add-students"
            onClick={openAddFlow}
            className="px-3 py-1.5 bg-[#1D6B48] text-white rounded-lg text-sm font-medium hover:bg-[#236B4C]"
          >
            + {isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}
          </button>
        </div>
      </div>

      {/* Students List */}
      <main className="p-4 max-w-2xl mx-auto">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">👶</span>
            <p className="text-white/60 mb-4">
              {isHomeschoolParent(session) ? t('students.noChildren') : t('students.noStudents')}
            </p>
            <button
              onClick={openAddFlow}
              className="px-4 py-2 bg-[#1D6B48] text-white rounded-lg font-medium hover:bg-[#236B4C]"
            >
              {isHomeschoolParent(session) ? t('students.addFirstChild') : t('students.addFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-white/[0.06] rounded-xl border border-[rgba(52,211,153,0.15)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden" style={{ background: 'rgba(16,185,129,0.15)', fontFamily: SERIF }}>
                      {student.photo_url ? (
                        <img src={student.photo_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white/95">{student.name}</p>
                      <p className="text-xs text-white/40">
                        {student.age ? `${student.age} ${t('students.yearsOld')}` : t('students.ageNotSet')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(student)}
                      className="px-3 py-1.5 bg-white/[0.08] text-white/70 rounded-lg text-sm hover:bg-white/[0.14] border border-[rgba(52,211,153,0.15)]"
                    >
                      {t('students.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(student.id)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-300 rounded-lg text-sm hover:bg-red-500/20"
                    >
                      {t('students.remove')}
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === student.id && (
                  <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                    <p className="text-red-200 text-sm mb-2">
                      {t('students.deleteConfirm')} {student.name}? {t('students.deleteConfirmMessage')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                      >
                        {t('students.yes')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-white/[0.08] text-white/70 rounded-lg text-sm hover:bg-white/[0.14]"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-white/40 text-xs mt-6">
          {students.length} {isHomeschoolParent(session) ? t('students.children') : t('students.title')} {t('students.in')} {session.classroom?.name}
        </p>
      </main>

      {/* Bulk Paste Import Modal — first-intake path */}
      {showBulkImport && session?.classroom?.id && (
        <BulkPasteImport
          classroomId={session.classroom.id}
          existingCount={students.length}
          onImported={async (imported) => {
            setShowBulkImport(false);
            // Mirror handleBulkSave's post-save behaviour: mark the tutorial
            // complete for first-time teachers, refresh the list, then send
            // them to the dashboard where Guru picks up "Tell me about them".
            const wasFirstTime = session?.teacher && !session.teacher.has_completed_tutorial;
            if (wasFirstTime) {
              try {
                await fetch('/api/montree/tutorial/complete', { method: 'POST' });
                const updatedSession = {
                  ...session,
                  teacher: { ...session.teacher, has_completed_tutorial: true }
                };
                saveSession(updatedSession);
                setSession(updatedSession);
              } catch (err) {
                console.error('Failed to mark tutorial complete:', err);
              }
            }
            loadStudents(session.classroom?.id);
            if (wasFirstTime && imported.length > 0) {
              setTimeout(() => router.push('/montree/dashboard?onboarded=1'), 800);
            }
          }}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Add/Edit Form Modal */}
      {showForm && !bulkMode && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
          <div data-tutorial="student-form" className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto border border-[rgba(52,211,153,0.15)]" style={{ background: '#0c1f14' }}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0" style={{ background: '#0c1f14' }}>
              <h2 className="font-bold text-lg text-white/95" style={{ fontFamily: SERIF, fontWeight: 500 }}>
                {editingStudent
                  ? `${t('common.edit')} ${isHomeschoolParent(session) ? t('students.child') || 'Child' : t('students.student') || 'Student'}`
                  : `${t('common.add')} ${isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}`}
              </h2>
              <button onClick={closeForm} className="text-white/40 hover:text-white/70 text-xl">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">{t('students.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}
                  className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-xl text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
                  autoFocus
                />
              </div>

              {/* Profile Photo (edit mode only) */}
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">{t('students.photo')}</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', fontFamily: SERIF }}>
                      {editingStudent.photo_url ? (
                        <img src={editingStudent.photo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        editingStudent.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhotoCapture(true)}
                      className="flex-1 px-4 py-3 bg-[#34d399]/10 border border-[rgba(52,211,153,0.3)] text-[#34d399] rounded-xl font-medium hover:bg-[#34d399]/20 transition-colors text-sm"
                    >
                      📸 {editingStudent.photo_url ? t('students.changePhoto') : t('students.takePhoto')}
                    </button>
                  </div>
                </div>
              )}

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">{t('students.age')}</label>
                <select
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseFloat(e.target.value) })}
                  className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-xl text-white/90 focus:border-[#34d399] outline-none"
                >
                  {AGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} {t('students.yearsOld')}</option>
                  ))}
                </select>
              </div>

              {/* Tenure - How long in program */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {t('students.tenure')}
                  <span className="text-white/40 font-normal ml-1">{t('students.guruHint')}</span>
                </label>
                <select
                  value={formData.tenure}
                  onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-xl text-white/90 focus:border-[#34d399] outline-none"
                >
                  {TENURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Curriculum Progress (only for new students) */}
              {!editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('students.currentWork')} (optional)
                  </label>
                  <div className="space-y-2">
                    {CURRICULUM_AREAS.map((area) => (
                      <CurriculumPicker
                        key={area.id}
                        areaId={area.id}
                        areaName={areaNameT(area.id)}
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

            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 py-3 bg-white/[0.08] text-white/70 rounded-xl font-medium hover:bg-white/[0.14]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
                className="flex-1 py-3 bg-[#1D6B48] text-white rounded-xl font-medium disabled:opacity-50 hover:bg-[#236B4C]"
              >
                {saving ? t('common.loading') : editingStudent
                  ? `${t('common.update')} ${isHomeschoolParent(session) ? t('students.child') || 'Child' : t('students.student') || 'Student'}`
                  : `${t('common.add')} ${isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Photo Capture */}
      {showPhotoCapture && editingStudent && session?.school?.id && (
        <ProfilePhotoCapture
          childId={editingStudent.id}
          childName={editingStudent.name}
          onPhotoSaved={(url) => {
            // Update local state so avatar swaps immediately
            setStudents(prev => prev.map(s =>
              s.id === editingStudent.id ? { ...s, photo_url: url } : s
            ));
            setEditingStudent(prev => prev ? { ...prev, photo_url: url } : prev);
            setShowPhotoCapture(false);
            toast.success(t('common.photoSaved'));
          }}
          onCancel={() => setShowPhotoCapture(false)}
        />
      )}

      {/* Bulk Import Form Modal */}
      {showForm && bulkMode && (
        <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center py-8 px-4">
            <div className="w-full max-w-2xl rounded-2xl shadow-2xl border border-[rgba(52,211,153,0.15)]" style={{ background: '#0c1f14' }}>
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 rounded-t-2xl" style={{ background: '#0c1f14' }}>
                <h2 className="font-bold text-xl text-white/95" style={{ fontFamily: SERIF, fontWeight: 500 }}>{isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}</h2>
                <button onClick={closeForm} className="text-white/40 hover:text-white/70 text-2xl">
                  ✕
                </button>
              </div>

              {/* Banner */}
              <div className="border-b border-[rgba(52,211,153,0.15)] p-6 flex gap-4" style={{ background: 'rgba(52,211,153,0.06)' }}>
                <div className="text-3xl flex-shrink-0">🌱</div>
                <div>
                  <h3 className="font-bold text-white/95 mb-1" style={{ fontFamily: SERIF, fontWeight: 500 }}>{isHomeschoolParent(session) ? t('students.buildingProfilesChild') : t('students.buildingProfiles')}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {t('students.buildingProfilesDescription')}
                  </p>
                </div>
              </div>

              {/* Students List */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
                {bulkStudents.map((student, index) => (
                  <div key={index} className="bg-white/[0.04] rounded-2xl p-6 border border-[rgba(52,211,153,0.12)]">
                    {/* Student Number Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-white/95" style={{ fontFamily: SERIF, fontWeight: 500 }}>
                        {isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')} {index + 1}
                      </h4>
                      {index > 0 && (
                        <button
                          onClick={() => removeStudent(index)}
                          className="text-white/40 hover:text-red-400 text-2xl font-light"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Row 1: Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">{t('students.name')} *</label>
                        <input
                          type="text"
                          value={student.name}
                          onChange={(e) => updateBulkStudent(index, 'name', e.target.value)}
                          placeholder={isHomeschoolParent(session) ? t('students.addChild') : t('students.addStudent')}
                          className="w-full p-2.5 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none text-sm"
                          {...(index === 0 ? { 'data-guide': 'name' } : {})}
                        />
                      </div>

                      {/* Age */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">{t('students.age')}</label>
                        <select
                          value={student.age}
                          onChange={(e) => updateBulkStudent(index, 'age', parseFloat(e.target.value))}
                          className="w-full p-2.5 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 focus:border-[#34d399] outline-none text-sm"
                          {...(index === 0 ? { 'data-guide': 'age' } : {})}
                        >
                          {AGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">{t('students.gender')}</label>
                        <select
                          value={student.gender}
                          onChange={(e) => updateBulkStudent(index, 'gender', e.target.value)}
                          className="w-full p-2.5 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 focus:border-[#34d399] outline-none text-sm"
                          {...(index === 0 ? { 'data-guide': 'gender' } : {})}
                        >
                          {GENDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Tenure */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">{isHomeschoolParent(session) ? t('students.tenure') : t('students.tenureSchool')}</label>
                      <select
                        value={student.tenure}
                        onChange={(e) => updateBulkStudent(index, 'tenure', e.target.value)}
                        className="w-full p-2.5 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 focus:border-[#34d399] outline-none text-sm"
                        {...(index === 0 ? { 'data-guide': 'tenure' } : {})}
                      >
                        {TENURE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 3: Curriculum */}
                    <div className="mb-4" {...(index === 0 ? { 'data-guide': 'curriculum-section' } : {})}>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        {t('students.currentWork')}
                      </label>
                      <p className="text-xs text-white/50 mb-3">
                        {t('students.currentWorkHint')}
                      </p>
                      <div className="space-y-2">
                        {CURRICULUM_AREAS.map((area) => (
                          <div key={area.id} {...(index === 0 ? { 'data-guide': `area-${area.id}` } : {})}>
                            <CurriculumPicker
                              areaId={area.id}
                              areaName={areaNameT(area.id)}
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
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Notes */}
                    <div {...(index === 0 ? { 'data-guide': 'profile-notes' } : {})}>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        {t('students.profileNotes')}
                      </label>
                      <textarea
                        value={student.notes}
                        onChange={(e) => updateBulkStudent(index, 'notes', e.target.value)}
                        placeholder={t('students.buildingProfilesDescription')}
                        rows={4}
                        className="w-full p-2.5 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none text-sm resize-none"
                      />
                      <p className="text-xs text-white/50 mt-1">
                        {t('students.guruPrivacyNote')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Another Student Button */}
              {bulkStudents.length < 30 && (
                <div className="px-6 py-4 border-t border-white/10">
                  <button
                    onClick={addAnotherStudent}
                    data-guide="add-another"
                    className="w-full py-2.5 px-4 bg-[#34d399]/10 border-2 border-dashed border-[rgba(52,211,153,0.3)] text-[#34d399] rounded-lg font-medium hover:bg-[#34d399]/20 transition-colors text-sm"
                  >
                    + {isHomeschoolParent(session) ? t('students.addAnotherChild') : t('students.addAnother')}
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex gap-3 rounded-b-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <button
                  onClick={closeForm}
                  className="flex-1 py-3 bg-white/[0.08] text-white/70 rounded-lg font-medium hover:bg-white/[0.14] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleBulkSave}
                  data-guide="save-all"
                  disabled={bulkStudents.filter(s => s.name.trim()).length === 0 || saving}
                  className="flex-1 py-3 bg-[#1D6B48] text-white rounded-lg font-medium disabled:opacity-50 hover:bg-[#236B4C] transition-colors"
                >
                  {saving ? t('common.loading') : `${t('students.saveAll')} (${bulkStudents.filter(s => s.name.trim()).length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guided onboarding tour — HIDDEN: onboarding guides disabled */}
      {false && showForm && bulkMode && isFirstTime && !guideSkipped && (
        <StudentFormGuide
          isVisible={true}
          onComplete={() => { localStorage.setItem('montree_guide_studentform_done', '1'); setGuideSkipped(true); }}
          onSkip={() => { localStorage.setItem('montree_guide_studentform_done', '1'); setGuideSkipped(true); }}
          isHomeschoolParent={!!session && isHomeschoolParent(session)}
          childName={bulkStudents[0]?.name || ''}
        />
      )}
      </div>
    </div>
  );
}
