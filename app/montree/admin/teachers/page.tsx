// /app/montree/admin/teachers/page.tsx
// Teacher Management - Add, list, assign to classrooms
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  classrooms: { id: string; name: string; icon: string }[];
  login_code?: string;
}

interface Classroom {
  id: string;
  name: string;
  icon: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [assignedClassrooms, setAssignedClassrooms] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }
    fetchData();
  };

  const getSchoolId = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) return null;
    return JSON.parse(schoolData).id;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const schoolId = getSchoolId();
      const [teachersRes, classroomsRes] = await Promise.all([
        fetch(`/api/montree/admin/teachers?school_id=${schoolId}`),
        fetch(`/api/montree/admin/classrooms?school_id=${schoolId}`)
      ]);
      
      const teachersData = await teachersRes.json();
      const classroomsData = await classroomsRes.json();
      
      setTeachers(teachersData.teachers || []);
      setClassrooms(classroomsData.classrooms || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const schoolId = getSchoolId();
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          name: formName.trim(),
          email: formEmail.trim().toLowerCase()
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add teacher');
      }
      
      toast.success(`Teacher added! Login code: ${data.teacher.login_code}`);
      setShowAddModal(false);
      setFormName('');
      setFormEmail('');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add teacher');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (teacher: Teacher) => {
    try {
      const res = await fetch(`/api/montree/admin/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !teacher.is_active })
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      toast.success(teacher.is_active ? 'Teacher deactivated' : 'Teacher activated');
      fetchData();
    } catch {
      toast.error('Failed to update teacher');
    }
  };


  const openAssignModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setAssignedClassrooms(teacher.classrooms.map(c => c.id));
    setShowAssignModal(true);
  };

  const handleAssignClassrooms = async () => {
    if (!selectedTeacher) return;
    setSaving(true);
    
    try {
      const res = await fetch(`/api/montree/admin/teachers/${selectedTeacher.id}/classrooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_ids: assignedClassrooms })
      });
      
      if (!res.ok) throw new Error('Failed to assign');
      
      toast.success('Classrooms assigned');
      setShowAssignModal(false);
      fetchData();
    } catch {
      toast.error('Failed to assign classrooms');
    } finally {
      setSaving(false);
    }
  };

  const copyLoginCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Login code copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-4xl animate-bounce">👩‍🏫</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link href="/montree/admin" className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block">
          ← Back to Admin
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light text-white">
            👩‍🏫 <span className="font-semibold">Teachers</span>
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition"
          >
            + Add Teacher
          </button>
        </div>
      </div>

      {/* Teachers List */}
      <div className="max-w-4xl mx-auto space-y-4">
        {teachers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
            <p className="text-white/60">No teachers yet. Add your first teacher!</p>
          </div>
        ) : (
          teachers.map(teacher => (
            <div key={teacher.id} className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center text-2xl">
                👩‍🏫
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{teacher.name}</h3>
                  {!teacher.is_active && (
                    <span className="px-2 py-0.5 bg-red-500/30 text-red-300 text-xs rounded-full">Inactive</span>
                  )}
                </div>
                <p className="text-white/50 text-sm">{teacher.email}</p>
                {teacher.classrooms.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {teacher.classrooms.map(c => (
                      <span key={c.id} className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                        {c.icon} {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                {teacher.login_code && (
                  <button
                    onClick={() => copyLoginCode(teacher.login_code!)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
                    title="Copy login code"
                  >
                    📋 {teacher.login_code}
                  </button>
                )}
                <button
                  onClick={() => openAssignModal(teacher)}
                  className="px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 text-sm rounded-lg transition"
                >
                  Classrooms
                </button>
                <button
                  onClick={() => handleToggleActive(teacher)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    teacher.is_active 
                      ? 'bg-red-500/30 hover:bg-red-500/50 text-red-300' 
                      : 'bg-green-500/30 hover:bg-green-500/50 text-green-300'
                  }`}
                >
                  {teacher.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Add Teacher</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="Teacher name"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="teacher@school.com"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Classrooms Modal */}
      {showAssignModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Assign Classrooms to {selectedTeacher.name}
            </h2>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {classrooms.map(classroom => (
                <label key={classroom.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={assignedClassrooms.includes(classroom.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setAssignedClassrooms([...assignedClassrooms, classroom.id]);
                      } else {
                        setAssignedClassrooms(assignedClassrooms.filter(id => id !== classroom.id));
                      }
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-2xl">{classroom.icon}</span>
                  <span className="text-white">{classroom.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignClassrooms}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
