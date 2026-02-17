// /montree/admin/page.tsx
// Principal Admin Dashboard — Classroom tiles with drill-down navigation
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface ClassroomTeacher {
  id: string;
  name: string;
  email: string;
  role: string;
  last_login: string | null;
  login_code: string | null;
}

interface Classroom {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teachers: ClassroomTeacher[];
  teacher_count: number;
  student_count: number;
}

interface School { id: string; name: string; slug: string; }
interface Principal { id: string; name: string; email: string; }
interface Stats { total_classrooms: number; total_teachers: number; total_students: number; classrooms_without_teacher: number; }

const ICONS = ['🐻', '🦁', '🐨', '🐼', '🦊', '🐰', '🦋', '🌈', '🌻', '⭐', '🎨', '📚'];
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

export default function AdminPage() {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [classroomForm, setClassroomForm] = useState({ name: '', icon: '🐻', color: '#10B981' });
  const [settingsForm, setSettingsForm] = useState({ school_name: '', principal_name: '', principal_email: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    if (!schoolData || !principalData) { router.push('/montree/principal/login'); return; }
    fetchData();
  }, []);

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const s = schoolData ? JSON.parse(schoolData) : null;
    const p = principalData ? JSON.parse(principalData) : null;
    return { 'Content-Type': 'application/json', 'x-school-id': s?.id || '', 'x-principal-id': p?.id || '' };
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/overview', { headers: getHeaders() });
      if (res.status === 401) { router.push('/montree/principal/login'); return; }
      const data = await res.json();
      setSchool(data.school);
      setPrincipal(data.principal);
      setClassrooms(data.classrooms || []);
      setStats(data.stats);
      if (data.school && data.principal) {
        setSettingsForm({ school_name: data.school.name, principal_name: data.principal.name, principal_email: data.principal.email, new_password: '' });
      }
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_school');
    localStorage.removeItem('montree_principal');
    router.push('/montree');
  };

  const openClassroomModal = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setClassroomForm({ name: classroom.name, icon: classroom.icon, color: classroom.color });
    } else {
      setEditingClassroom(null);
      setClassroomForm({ name: '', icon: '🐻', color: '#10B981' });
    }
    setShowClassroomModal(true);
  };

  const saveClassroom = async () => {
    if (!classroomForm.name.trim()) return;
    setSaving(true);
    try {
      const method = editingClassroom ? 'PATCH' : 'POST';
      const body = editingClassroom ? { id: editingClassroom.id, ...classroomForm } : classroomForm;
      const res = await fetch('/api/montree/admin/classrooms', { method, headers: getHeaders(), body: JSON.stringify(body) });
      if (res.ok) { setShowClassroomModal(false); toast.success(editingClassroom ? 'Classroom updated' : 'Classroom created'); fetchData(); }
    } catch { toast.error('Failed to save classroom'); }
    finally { setSaving(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/settings', { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(settingsForm) });
      if (res.ok) {
        const sd = localStorage.getItem('montree_school');
        if (sd) { const s = JSON.parse(sd); s.name = settingsForm.school_name; localStorage.setItem('montree_school', JSON.stringify(s)); }
        setShowSettingsModal(false); toast.success('Settings saved'); fetchData();
      }
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🏫</div>
          <p className="text-emerald-200">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const leadTeacher = (c: Classroom) => c.teachers?.find(t => t.role === 'lead_teacher') || c.teachers?.[0] || null;
  const assistantCount = (c: Classroom) => Math.max(0, (c.teacher_count || 0) - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{school?.name}</h1>
            <p className="text-emerald-300 text-sm">Principal: {principal?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-emerald-700/50 rounded-lg text-white hover:bg-emerald-600">⚙️</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 text-sm">Logout</button>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total_classrooms}</div>
              <div className="text-emerald-300 text-xs">Classrooms</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total_teachers}</div>
              <div className="text-emerald-300 text-xs">Teachers</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total_students}</div>
              <div className="text-emerald-300 text-xs">Students</div>
            </div>
          </div>
        )}

        {/* Onboarding banner (only if no classrooms) */}
        {stats && stats.total_classrooms === 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👆</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Create Your First Classroom</h3>
                <p className="text-amber-200 text-sm">Add classrooms to start managing your school</p>
              </div>
              <button onClick={() => openClassroomModal()} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 animate-pulse">
                + Add Classroom
              </button>
            </div>
          </div>
        )}

        {/* Classroom Tiles — the main content */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Classrooms</h2>
            <button onClick={() => openClassroomModal()} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium text-sm">+ Add Classroom</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classrooms.map(classroom => {
              const lead = leadTeacher(classroom);
              const assistants = assistantCount(classroom);

              return (
                <button
                  key={classroom.id}
                  onClick={() => router.push(`/montree/admin/classrooms/${classroom.id}`)}
                  className="bg-white/10 rounded-2xl p-4 border-l-4 text-left hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                  style={{ borderLeftColor: classroom.color }}
                >
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{classroom.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{classroom.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-300 text-xs">{classroom.student_count} students</span>
                      </div>
                    </div>
                  </div>

                  {/* Teacher info */}
                  {lead ? (
                    <div className="bg-black/20 rounded-lg px-3 py-2 mb-2">
                      <div className="text-white text-sm font-medium truncate">{lead.name}</div>
                      {assistants > 0 && (
                        <div className="text-emerald-400/70 text-xs">+{assistants} assistant{assistants > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-500/20 rounded-lg px-3 py-2 mb-2 text-center">
                      <span className="text-amber-300 text-xs">No teacher assigned</span>
                    </div>
                  )}

                  {/* Chevron hint */}
                  <div className="text-right text-emerald-400/50 group-hover:text-emerald-300 transition-colors text-sm">
                    View →
                  </div>
                </button>
              );
            })}

            {/* Add Classroom tile */}
            <button onClick={() => openClassroomModal()} className="bg-white/5 border-2 border-dashed border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center min-h-[160px]">
              <span className="text-3xl mb-2 opacity-50">+</span>
              <span className="text-emerald-300 text-sm">Add Classroom</span>
            </button>
          </div>
        </div>

      </div>

      {/* Classroom Modal */}
      {showClassroomModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 rounded-2xl p-6 max-w-md w-full border border-emerald-700">
            <h2 className="text-xl font-bold text-white mb-4">{editingClassroom ? 'Edit Classroom' : 'Add Classroom'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Name</label>
                <input type="text" value={classroomForm.name} onChange={e => setClassroomForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="e.g., Butterfly Class" />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setClassroomForm(f => ({ ...f, icon }))} className={`w-10 h-10 rounded-lg text-xl ${classroomForm.icon === icon ? 'bg-emerald-500' : 'bg-black/20'}`}>{icon}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setClassroomForm(f => ({ ...f, color }))} className={`w-8 h-8 rounded-full ${classroomForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-emerald-900' : ''}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowClassroomModal(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl">Cancel</button>
              <button onClick={saveClassroom} disabled={saving || !classroomForm.name.trim()} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 rounded-2xl p-6 max-w-md w-full border border-emerald-700">
            <h2 className="text-xl font-bold text-white mb-4">⚙️ School Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">School Name</label>
                <input type="text" value={settingsForm.school_name} onChange={e => setSettingsForm(f => ({ ...f, school_name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Principal Name</label>
                <input type="text" value={settingsForm.principal_name} onChange={e => setSettingsForm(f => ({ ...f, principal_name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Email</label>
                <input type="email" value={settingsForm.principal_email} onChange={e => setSettingsForm(f => ({ ...f, principal_email: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">New Password (leave blank to keep)</label>
                <input type="password" value={settingsForm.new_password} onChange={e => setSettingsForm(f => ({ ...f, new_password: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="••••••••" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSettingsModal(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl">Cancel</button>
              <button onClick={saveSettings} disabled={saving} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
