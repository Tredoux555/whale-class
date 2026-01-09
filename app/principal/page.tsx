'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  teacher_id: string | null;
  student_count: number;
}

interface School {
  id: string;
  name: string;
  slug: string;
  classroom_count?: number;
  student_count?: number;
}

export default function PrincipalDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', age_group: '3-6' });
  const [saving, setSaving] = useState(false);

  // Load schools on mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await fetch('/api/admin/schools');
        const data = await res.json();
        const allSchools = data.schools || [];
        setSchools(allSchools);
        
        // Check localStorage for saved school, otherwise use first
        const saved = localStorage.getItem('principal_school_id');
        if (saved && allSchools.find((s: School) => s.id === saved)) {
          setSelectedSchoolId(saved);
        } else if (allSchools.length > 0) {
          setSelectedSchoolId(allSchools[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadSchools();
  }, []);

  // Load classrooms when school changes
  useEffect(() => {
    if (!selectedSchoolId) return;
    localStorage.setItem('principal_school_id', selectedSchoolId);
    
    const s = schools.find(x => x.id === selectedSchoolId);
    setSchool(s || null);
    
    const loadClassrooms = async () => {
      try {
        const res = await fetch(`/api/admin/classrooms?school_id=${selectedSchoolId}`);
        const data = await res.json();
        setClassrooms(data.classrooms || []);
      } catch (e) { console.error(e); }
    };
    loadClassrooms();
  }, [selectedSchoolId, schools]);

  const handleAddClass = async () => {
    if (!newClass.name.trim() || !selectedSchoolId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: selectedSchoolId, ...newClass })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewClass({ name: '', age_group: '3-6' });
        // Refresh classrooms
        const classRes = await fetch(`/api/admin/classrooms?school_id=${selectedSchoolId}`);
        const classData = await classRes.json();
        setClassrooms(classData.classrooms || []);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const totalStudents = classrooms.reduce((sum, c) => sum + c.student_count, 0);
  const assignedTeachers = classrooms.filter(c => c.teacher_id).length;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm">Principal Portal</p>
              <h1 className="text-2xl font-bold">{school?.name || 'Select School'}</h1>
            </div>
            {/* School Selector */}
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="bg-indigo-700 text-white px-4 py-2 rounded-lg border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border text-center">
            <div className="text-3xl font-bold text-indigo-600">{classrooms.length}</div>
            <div className="text-gray-500 text-sm">Classrooms</div>
          </div>
          <div className="bg-white rounded-xl p-6 border text-center">
            <div className="text-3xl font-bold text-emerald-600">{assignedTeachers}</div>
            <div className="text-gray-500 text-sm">Teachers Assigned</div>
          </div>
          <div className="bg-white rounded-xl p-6 border text-center">
            <div className="text-3xl font-bold text-purple-600">{totalStudents}</div>
            <div className="text-gray-500 text-sm">Total Students</div>
          </div>
        </div>

        {/* Classrooms */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📚 Classrooms</h2>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Classroom</button>
        </div>

        {classrooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500 mb-4">No classrooms yet. Add your first classroom!</p>
            <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">+ Add Classroom</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">📚</div>
                  <div>
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="text-sm text-gray-500">Ages {c.age_group}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>👩‍🏫 {c.teacher_id ? 'Assigned' : <span className="text-orange-500">Unassigned</span>}</span>
                  <span>👶 {c.student_count} students</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/principal/classrooms/${c.id}`} className="flex-1 text-center py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">
                    Manage
                  </Link>
                  <Link href={`/teacher/setup?classroom=${c.id}`} className="flex-1 text-center py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200">
                    + Students
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-white rounded-xl border">
          <h3 className="font-semibold mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200">+ Add Classroom</button>
            <Link href="/principal/teachers" className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200">👩‍🏫 Manage Teachers</Link>
            <Link href="/admin/schools" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">🏫 Master Admin</Link>
          </div>
        </div>
      </main>

      {/* Add Classroom Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Classroom to {school?.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Classroom Name *</label>
                <input type="text" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="🐼 Panda Class" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Group</label>
                <select value={newClass.age_group} onChange={(e) => setNewClass({...newClass, age_group: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                  <option value="2-3">2-3 years (Toddler)</option>
                  <option value="3-4">3-4 years</option>
                  <option value="3-6">3-6 years (Primary)</option>
                  <option value="4-5">4-5 years</option>
                  <option value="5-6">5-6 years</option>
                  <option value="6-9">6-9 years (Lower Elementary)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleAddClass} disabled={!newClass.name.trim() || saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Adding...' : 'Add Classroom'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
