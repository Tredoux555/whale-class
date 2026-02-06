// /montree/admin/page.tsx
// Principal Admin Dashboard - Full school management
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import InboxButton from '@/components/montree/InboxButton';

interface Classroom {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  student_count: number;
}

interface School {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  plan_type: string;
  trial_ends_at: string | null;
}

interface Principal {
  id: string;
  name: string;
  email: string;
}

interface Stats {
  total_classrooms: number;
  total_teachers: number;
  total_students: number;
  classrooms_without_teacher: number;
}

const ICONS = ['🐻', '🦁', '🐨', '🐼', '🦊', '🐰', '🦋', '🌈', '🌻', '⭐', '🎨', '📚'];
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

export default function AdminPage() {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  
  // Form states
  const [classroomForm, setClassroomForm] = useState({ name: '', icon: '🐻', color: '#10B981' });
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '' });
  const [settingsForm, setSettingsForm] = useState({ school_name: '', principal_name: '', principal_email: '', new_password: '' });
  
  // Feedback states
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    
    if (!schoolData || !principalData) {
      router.push('/montree/principal/login');
      return;
    }
    
    fetchData();
  };

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const school = schoolData ? JSON.parse(schoolData) : null;
    const principal = principalData ? JSON.parse(principalData) : null;
    
    return {
      'Content-Type': 'application/json',
      'x-school-id': school?.id || '',
      'x-principal-id': principal?.id || '',
    };
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/overview', { headers: getHeaders() });
      
      if (res.status === 401) {
        router.push('/montree/principal/login');
        return;
      }
      
      const data = await res.json();
      setSchool(data.school);
      setPrincipal(data.principal);
      setClassrooms(data.classrooms || []);
      setStats(data.stats);
      
      // Init settings form
      if (data.school && data.principal) {
        setSettingsForm({
          school_name: data.school.name,
          principal_name: data.principal.name,
          principal_email: data.principal.email,
          new_password: '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
      setError('Failed to load dashboard');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_school');
    localStorage.removeItem('montree_principal');
    router.push('/montree');
  };

  // Classroom CRUD
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
      const body = editingClassroom 
        ? { id: editingClassroom.id, ...classroomForm }
        : classroomForm;
      
      const res = await fetch('/api/montree/admin/classrooms', {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        setShowClassroomModal(false);
        toast.success(editingClassroom ? 'Classroom updated' : 'Classroom created');
        fetchData();
      }
    } catch (err) {
      console.error('Save classroom error:', err);
      toast.error('Failed to save classroom');
    } finally {
      setSaving(false);
    }
  };

  const deleteClassroom = async (id: string) => {
    if (!confirm('Delete this classroom? This cannot be undone.')) return;
    
    try {
      await fetch(`/api/montree/admin/classrooms?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      fetchData();
    } catch (err) {
      console.error('Delete classroom error:', err);
      toast.error('Failed to delete classroom');
    }
  };

  // Teacher CRUD
  const openTeacherModal = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setTeacherForm({ name: '', email: '' });
    setNewCode(null);
    setShowTeacherModal(true);
  };

  const saveTeacher = async () => {
    if (!teacherForm.name.trim() || !selectedClassroomId) return;
    setSaving(true);
    
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...teacherForm, classroom_id: selectedClassroomId }),
      });
      
      const data = await res.json();
      if (data.success && data.teacher?.login_code) {
        setNewCode(data.teacher.login_code);
        fetchData();
      }
    } catch (err) {
      console.error('Save teacher error:', err);
      toast.error('Failed to add teacher');
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async (teacherId: string) => {
    if (!confirm('Generate a new login code? The old code will stop working.')) return;
    
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ id: teacherId, regenerate_code: true }),
      });
      
      const data = await res.json();
      if (data.new_login_code) {
        setNewCode(data.new_login_code);
        setShowTeacherModal(true);
      }
    } catch (err) {
      console.error('Regenerate code error:', err);
      toast.error('Failed to generate new code');
    }
  };

  // Settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/settings', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(settingsForm),
      });
      
      if (res.ok) {
        // Update localStorage
        const schoolData = localStorage.getItem('montree_school');
        if (schoolData) {
          const school = JSON.parse(schoolData);
          school.name = settingsForm.school_name;
          localStorage.setItem('montree_school', JSON.stringify(school));
        }
        setShowSettingsModal(false);
        toast.success('Settings saved');
        fetchData();
      }
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/montree" className="text-emerald-300 hover:text-white text-2xl">←</Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{school?.name}</h1>
              <p className="text-emerald-300 text-sm">Principal: {principal?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {principal?.id && (
              <InboxButton
                conversationId={principal.id}
                userName={principal.name || 'Principal'}
              />
            )}
            <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-emerald-700/50 rounded-lg text-white hover:bg-emerald-600">⚙️</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30">Logout</button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.total_classrooms}</div>
              <div className="text-emerald-300 text-sm">Classrooms</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.total_teachers}</div>
              <div className="text-emerald-300 text-sm">Teachers</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.total_students}</div>
              <div className="text-emerald-300 text-sm">Students</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{stats.classrooms_without_teacher}</div>
              <div className="text-emerald-300 text-sm">Need Teacher</div>
            </div>
          </div>
        )}

        {/* Next Step Banner - Guide principals on what to do */}
        {stats && (
          <>
            {stats.total_classrooms === 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">👆</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Next Step: Create Your First Classroom</h3>
                    <p className="text-amber-200 text-sm">Click the button below to add a classroom for your school</p>
                  </div>
                  <button onClick={() => openClassroomModal()} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 animate-pulse">
                    + Add Classroom
                  </button>
                </div>
              </div>
            )}

            {stats.total_classrooms > 0 && stats.classrooms_without_teacher > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">👆</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Next Step: Add Teachers</h3>
                    <p className="text-amber-200 text-sm">{stats.classrooms_without_teacher} classroom{stats.classrooms_without_teacher > 1 ? 's need' : ' needs'} a teacher assigned</p>
                  </div>
                </div>
              </div>
            )}

            {stats.total_classrooms > 0 && stats.classrooms_without_teacher === 0 && stats.total_students === 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">👇</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Next Step: Add Students</h3>
                    <p className="text-emerald-200 text-sm">Click &quot;Students&quot; on any classroom below to add your students</p>
                  </div>
                </div>
              </div>
            )}

            {stats.total_students > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">✅</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">You&apos;re All Set!</h3>
                    <p className="text-emerald-200 text-sm">Teachers can now log in with their codes and start tracking student progress</p>
                  </div>
                  <Link href="/montree/login" className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600">
                    Try Teacher View →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* Classrooms Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Classrooms</h2>
            <button onClick={() => openClassroomModal()} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium">+ Add Classroom</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map(classroom => (
              <div key={classroom.id} className="bg-white/10 rounded-xl p-4 border-l-4" style={{ borderLeftColor: classroom.color }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{classroom.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white">{classroom.name}</h3>
                      <p className="text-emerald-300 text-sm">{classroom.student_count} students</p>
                    </div>
                  </div>
                  <button onClick={() => openClassroomModal(classroom)} className="text-emerald-300 hover:text-white text-sm">Edit</button>
                </div>

                {classroom.teacher_name ? (
                  <div className="bg-black/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-emerald-300 text-sm">Teacher</span>
                      <span className="text-white font-medium">{classroom.teacher_name}</span>
                    </div>
                    <button onClick={() => regenerateCode(classroom.teacher_id!)} className="text-xs text-amber-400 hover:text-amber-300">🔄 New Login Code</button>
                  </div>
                ) : (
                  <button onClick={() => openTeacherModal(classroom.id)} className="w-full py-2 bg-amber-500/20 text-amber-300 rounded-lg text-sm hover:bg-amber-500/30 mb-3">+ Add Teacher</button>
                )}

                <div className="flex gap-2">
                  <Link href={`/montree/admin/students?classroom=${classroom.id}`} className="flex-1 py-2 bg-white/10 text-white rounded-lg text-sm text-center hover:bg-white/20">Students</Link>
                  <button onClick={() => deleteClassroom(classroom.id)} className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">🗑️</button>
                </div>
              </div>
            ))}

            {/* Add Classroom Card */}
            <button onClick={() => openClassroomModal()} className="bg-white/5 border-2 border-dashed border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center min-h-[180px]">
              <span className="text-4xl mb-2 opacity-50">+</span>
              <span className="text-emerald-300">Add Classroom</span>
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Link href="/montree/admin/students" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20">
            <span className="text-2xl block mb-2">👨‍👩‍👧</span>
            <span className="text-white text-sm">Students</span>
          </Link>
          <Link href="/montree/admin/teachers" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20">
            <span className="text-2xl block mb-2">👩‍🏫</span>
            <span className="text-white text-sm">Teachers</span>
          </Link>
          <Link href="/montree/admin/reports" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20">
            <span className="text-2xl block mb-2">📊</span>
            <span className="text-white text-sm">Reports</span>
          </Link>
          <Link href="/montree/admin/import" className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 text-center hover:bg-emerald-500/30">
            <span className="text-2xl block mb-2">📄</span>
            <span className="text-emerald-300 text-sm">Import</span>
          </Link>
          <Link href="/montree/games" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20">
            <span className="text-2xl block mb-2">🎮</span>
            <span className="text-white text-sm">Games</span>
          </Link>
          <Link href="/montree/admin/parent-codes" className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20">
            <span className="text-2xl block mb-2">👪</span>
            <span className="text-emerald-300 text-sm">Parent Codes</span>
          </Link>
          <button onClick={handleLogout} className="bg-red-500/20 rounded-xl p-4 text-center hover:bg-red-500/30">
            <span className="text-2xl block mb-2">🚪</span>
            <span className="text-red-300 text-sm">Logout</span>
          </button>
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

      {/* Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-900 rounded-2xl p-6 max-w-md w-full border border-emerald-700">
            <h2 className="text-xl font-bold text-white mb-4">{newCode ? '🎉 New Login Code!' : 'Add Teacher'}</h2>
            
            {newCode ? (
              <div className="text-center">
                <p className="text-emerald-300 mb-4">Share this login code with the teacher. It will only be shown once!</p>
                <div className="bg-black/30 rounded-xl p-6 mb-4">
                  <div className="text-4xl font-mono font-bold text-emerald-400 tracking-wider mb-2">{newCode}</div>
                  <button onClick={() => copyCode(newCode)} className={`px-4 py-2 rounded-lg text-sm ${copiedCode === newCode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'}`}>
                    {copiedCode === newCode ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <button onClick={() => { setShowTeacherModal(false); setNewCode(null); }} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium">Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-emerald-300 text-sm mb-1">Teacher Name *</label>
                    <input type="text" value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="e.g., Ms. Sarah" />
                  </div>
                  <div>
                    <label className="block text-emerald-300 text-sm mb-1">Email (optional)</label>
                    <input type="email" value={teacherForm.email} onChange={e => setTeacherForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white" placeholder="teacher@school.com" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowTeacherModal(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl">Cancel</button>
                  <button onClick={saveTeacher} disabled={saving || !teacherForm.name.trim()} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
                </div>
              </>
            )}
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
                <label className="block text-emerald-300 text-sm mb-1">New Password (leave blank to keep current)</label>
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
