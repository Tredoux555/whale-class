'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  teacher: { id: string; name: string; email: string } | null;
  student_count: number;
}

interface School {
  id: string;
  name: string;
  slug: string;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = params.id as string;
  
  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', age_group: '3-6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [schoolId]);

  const fetchData = async () => {
    try {
      // Fetch school info
      const schoolRes = await fetch(`/api/admin/schools`);
      const schoolData = await schoolRes.json();
      const s = (schoolData.schools || []).find((x: School) => x.id === schoolId);
      setSchool(s || null);

      // Fetch classrooms
      const classRes = await fetch(`/api/admin/classrooms?school_id=${schoolId}`);
      const classData = await classRes.json();
      setClassrooms(classData.classrooms || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddClass = async () => {
    if (!newClass.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...newClass })
      });
      if (res.ok) { setShowAddModal(false); setNewClass({ name: '', age_group: '3-6' }); fetchData(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  if (!school) return <div className="min-h-screen flex items-center justify-center">School not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin/schools" className="text-emerald-600 text-sm mb-2 inline-block">← All Schools</Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <p className="text-gray-500 text-sm">/{school.slug}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">+ Add Classroom</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-4">📚 Classrooms ({classrooms.length})</h2>
        
        {classrooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500 mb-4">No classrooms yet</p>
            <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">+ Add First Classroom</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📚</div>
                  <div>
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="text-sm text-gray-500">Ages {c.age_group}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>👩‍🏫 {c.teacher?.name || 'Unassigned'}</span>
                  <span>👶 {c.student_count} students</span>
                </div>
                <Link href={`/admin/schools/${schoolId}/classrooms/${c.id}`} className="block text-center py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
                  Manage Classroom →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Classroom</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Classroom Name *</label><input type="text" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="🐋 Whale Class" /></div>
              <div><label className="block text-sm font-medium mb-1">Age Group</label>
                <select value={newClass.age_group} onChange={(e) => setNewClass({...newClass, age_group: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                  <option value="2-3">2-3 years</option>
                  <option value="3-4">3-4 years</option>
                  <option value="3-6">3-6 years</option>
                  <option value="4-5">4-5 years</option>
                  <option value="5-6">5-6 years</option>
                  <option value="6-9">6-9 years</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleAddClass} disabled={!newClass.name.trim() || saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Adding...' : 'Add Classroom'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
