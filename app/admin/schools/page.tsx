'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  classroom_count: number;
  teacher_count: number;
  student_count: number;
}

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', slug: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/admin/schools');
      const data = await res.json();
      setSchools(data.schools || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddSchool = async () => {
    if (!newSchool.name.trim()) return;
    setSaving(true);
    try {
      const slug = newSchool.slug || newSchool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSchool.name, slug })
      });
      if (res.ok) { setShowAddModal(false); setNewSchool({ name: '', slug: '' }); fetchSchools(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏫 School Management</h1>
            <p className="text-gray-500 text-sm">Master Admin - Manage all schools</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">+ Add School</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {schools.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-semibold mb-2">No schools yet</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-lg mt-4">+ Add First School</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md">
                <div className="p-6 border-b flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl">{s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover rounded-xl" /> : '🏫'}</div>
                  <div><h3 className="font-bold text-lg">{s.name}</h3><p className="text-sm text-gray-500">/{s.slug}</p></div>
                </div>
                <div className="grid grid-cols-3 divide-x">
                  <div className="p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{s.classroom_count}</div><div className="text-xs text-gray-500">Classes</div></div>
                  <div className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{s.teacher_count}</div><div className="text-xs text-gray-500">Teachers</div></div>
                  <div className="p-4 text-center"><div className="text-2xl font-bold text-purple-600">{s.student_count}</div><div className="text-xs text-gray-500">Students</div></div>
                </div>
                <div className="p-4 bg-gray-50 flex gap-2">
                  <Link href={`/admin/schools/${s.id}`} className="flex-1 text-center py-2 bg-white border rounded-lg text-sm">⚙️ Manage</Link>
                  <Link href={`/admin/schools/${s.id}/classrooms`} className="flex-1 text-center py-2 bg-emerald-600 text-white rounded-lg text-sm">📚 Classes</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New School</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">School Name *</label><input type="text" value={newSchool.name} onChange={(e) => setNewSchool({...newSchool, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Beijing International School" /></div>
              <div><label className="block text-sm font-medium mb-1">URL Slug</label><input type="text" value={newSchool.slug} onChange={(e) => setNewSchool({...newSchool, slug: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="beijing-international" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleAddSchool} disabled={!newSchool.name.trim() || saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Adding...' : 'Add School'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
