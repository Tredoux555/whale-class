// /montree/admin/classrooms/[classroomId]/page.tsx
// Classroom drill-down — teachers (lead/assistant) + student tiles
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  login_code: string | null;
  last_login: string | null;
  is_active: boolean;
}

interface Student {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  is_active: boolean;
}

interface ClassroomDetail {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Add teacher modal
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '' });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', age: '' });

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) { router.push('/montree/principal/login'); return; }
    fetchData();
  }, [classroomId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/montree/admin/classrooms/${classroomId}`);
      if (!res.ok) { toast.error(t('admin.errors.classroomNotFound')); router.push('/montree/admin'); return; }
      const data = await res.json();
      setClassroom(data.classroom);
      setTeachers(data.teachers || []);
      setStudents(data.students || []);
    } catch { toast.error(t('admin.errors.failedToLoadClassroom')); }
    finally { setLoading(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const changeRole = async (teacherId: string, newRole: string) => {
    try {
      await fetch('/api/montree/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacherId, role: newRole }),
      });
      toast.success(t('admin.messages.roleUpdated'));
      fetchData();
    } catch { toast.error(t('admin.errors.failedToUpdateRole')); }
  };

  const addTeacher = async () => {
    if (!teacherForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teacherForm.name.trim(), email: teacherForm.email.trim() || null, classroom_id: classroomId }),
      });
      const data = await res.json();
      if (data.success && data.teacher?.login_code) {
        setNewCode(data.teacher.login_code);
        fetchData();
      }
    } catch { toast.error(t('admin.errors.failedToAddTeacher')); }
    finally { setSaving(false); }
  };

  const addStudent = async () => {
    if (!studentForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentForm.name.trim(), age: studentForm.age ? parseFloat(studentForm.age) : null, classroom_id: classroomId }),
      });
      if (res.ok) {
        toast.success(t('admin.messages.studentAdded'));
        setShowAddStudent(false);
        setStudentForm({ name: '', age: '' });
        fetchData();
      }
    } catch { toast.error(t('admin.errors.failedToAddStudent')); }
    finally { setSaving(false); }
  };

  const regenerateCode = async (teacherId: string) => {
    if (!confirm(t('admin.confirmations.regenerateCode'))) return;
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacherId, regenerate_code: true }),
      });
      const data = await res.json();
      if (data.new_login_code) { setNewCode(data.new_login_code); setShowAddTeacher(true); }
    } catch { toast.error(t('admin.errors.failedToRegenerateCode')); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="text-5xl animate-bounce">🏫</div>
      </div>
    );
  }

  if (!classroom) return null;

  const leadTeachers = teachers.filter(t => t.role === 'lead_teacher');
  const assistantTeachers = teachers.filter(t => t.role !== 'lead_teacher');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/montree/admin')} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            ←
          </button>
          <span className="text-3xl">{classroom.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-white">{classroom.name}</h1>
            <p className="text-emerald-100 text-sm">{students.length} students · {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">

        {/* Teachers Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">{t('admin.sections.teachers')}</h2>
            <button onClick={() => { setShowAddTeacher(true); setNewCode(null); setTeacherForm({ name: '', email: '' }); }} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">+ {t('admin.actions.addTeacher')}</button>
          </div>

          {teachers.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <p className="text-white/60">{t('admin.emptyStates.noTeachersAssigned')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Lead teachers — larger cards */}
              {leadTeachers.map(t => (
                <div key={t.id} className="bg-white/10 rounded-xl p-4 border-l-4 border-emerald-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center text-xl">👩‍🏫</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-lg">{t.name}</span>
                          <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs rounded-full font-medium">{t('admin.roles.lead')}</span>
                        </div>
                        {t.email && <p className="text-white/50 text-sm">{t.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.login_code && (
                        <button onClick={() => copyCode(t.login_code!)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg font-mono">
                          {copiedCode === t.login_code ? '✓ ' + t('admin.actions.copied') : t.login_code}
                        </button>
                      )}
                      <button onClick={() => regenerateCode(t.id)} className="text-xs text-amber-400 hover:text-amber-300">🔄</button>
                      <select value={t.role} onChange={e => changeRole(t.id, e.target.value)} className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/20">
                        <option value="lead_teacher">{t('admin.roles.lead')}</option>
                        <option value="assistant_teacher">{t('admin.roles.assistant')}</option>
                        <option value="teacher">{t('admin.roles.teacher')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Assistant teachers — smaller cards */}
              {assistantTeachers.map(t => (
                <div key={t.id} className="bg-white/5 rounded-xl p-3 border-l-4 border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-lg">👩‍🏫</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{t.name}</span>
                          <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-full">
                            {t.role === 'assistant_teacher' ? t('admin.roles.assistant').toUpperCase() : t('admin.roles.teacher').toUpperCase()}
                          </span>
                        </div>
                        {t.email && <p className="text-white/40 text-xs">{t.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.login_code && (
                        <button onClick={() => copyCode(t.login_code!)} className="px-2 py-1 bg-white/10 text-white text-xs rounded-lg font-mono">
                          {copiedCode === t.login_code ? '✓' : t.login_code}
                        </button>
                      )}
                      <select value={t.role} onChange={e => changeRole(t.id, e.target.value)} className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/20">
                        <option value="lead_teacher">{t('admin.roles.lead')}</option>
                        <option value="assistant_teacher">{t('admin.roles.assistant')}</option>
                        <option value="teacher">{t('admin.roles.teacher')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">{t('admin.sections.students')}</h2>
            <button onClick={() => { setShowAddStudent(true); setStudentForm({ name: '', age: '' }); }} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">+ {t('admin.actions.addStudent')}</button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {students.map((student, sIdx) => (
              <button
                key={student.id}
                onClick={() => router.push(`/montree/admin/classrooms/${classroomId}/students/${student.id}`)}
                className="bg-white/10 rounded-xl p-3 flex flex-col items-center hover:bg-white/15 hover:scale-[1.03] active:scale-[0.97] transition-all group"
                {...(sIdx === 0 ? { 'data-guide': 'first-student' } : {})}
              >
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-2 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xl sm:text-2xl font-bold">{student.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Name */}
                <span className="text-white text-sm font-medium truncate w-full text-center">{student.name.split(' ')[0]}</span>
                {student.age && (
                  <span className="text-emerald-300/60 text-xs">{student.age}y</span>
                )}
              </button>
            ))}

            {/* Add Student tile */}
            <button
              onClick={() => { setShowAddStudent(true); setStudentForm({ name: '', age: '' }); }}
              className="bg-white/5 border-2 border-dashed border-emerald-500/30 rounded-xl p-3 flex flex-col items-center justify-center hover:border-emerald-500/50 hover:bg-white/10 transition-all min-h-[120px]"
            >
              <span className="text-2xl opacity-50 mb-1">+</span>
              <span className="text-emerald-300 text-xs">{t('admin.actions.addStudent')}</span>
            </button>
          </div>

          {students.length === 0 && (
            <div className="bg-white/10 rounded-xl p-8 text-center mt-4">
              <p className="text-white/60">{t('admin.emptyStates.noStudentsYet')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 rounded-2xl p-6 max-w-md w-full border border-emerald-700">
            <h2 className="text-xl font-bold text-white mb-4">{newCode ? '🎉 ' + t('admin.modals.loginCode') : t('admin.modals.addTeacher')}</h2>
            {newCode ? (
              <div className="text-center">
                <p className="text-emerald-300 mb-4">{t('admin.messages.shareCodeWithTeacher')}</p>
                <div className="bg-black/30 rounded-xl p-6 mb-4">
                  <div className="text-4xl font-mono font-bold text-emerald-400 tracking-wider mb-2">{newCode}</div>
                  <button onClick={() => copyCode(newCode)} className={`px-4 py-2 rounded-lg text-sm ${copiedCode === newCode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'}`}>
                    {copiedCode === newCode ? '✓ ' + t('admin.actions.copied') : t('admin.actions.copyCode')}
                  </button>
                </div>
                <button onClick={() => { setShowAddTeacher(false); setNewCode(null); }} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium">{t('admin.actions.done')}</button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-emerald-300 text-sm mb-1">{t('admin.form.nameRequired')}</label>
                    <input type="text" value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="Ms. Sarah" />
                  </div>
                  <div>
                    <label className="block text-emerald-300 text-sm mb-1">{t('admin.form.emailOptional')}</label>
                    <input type="email" value={teacherForm.email} onChange={e => setTeacherForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="teacher@school.com" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddTeacher(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl">{t('admin.actions.cancel')}</button>
                  <button onClick={addTeacher} disabled={saving || !teacherForm.name.trim()} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">{saving ? t('admin.states.creating') : t('admin.actions.create')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 rounded-2xl p-6 max-w-md w-full border border-emerald-700">
            <h2 className="text-xl font-bold text-white mb-4">{t('admin.modals.addStudent')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">{t('admin.form.nameRequired')}</label>
                <input type="text" value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="Student name" />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">{t('admin.form.ageOptional')}</label>
                <input type="number" step="0.5" min="2" max="7" value={studentForm.age} onChange={e => setStudentForm(f => ({ ...f, age: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="e.g., 3.5" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddStudent(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl">{t('admin.actions.cancel')}</button>
              <button onClick={addStudent} disabled={saving || !studentForm.name.trim()} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">{saving ? t('admin.states.adding') : t('admin.actions.add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
