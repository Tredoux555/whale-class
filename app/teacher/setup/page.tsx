'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
}

export default function TeacherSetupPage() {
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroom');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    date_of_birth: '',
    practical_life: 0,
    sensorial: 0,
    math: 0,
    language: 0,
    cultural: 0,
  });

  useEffect(() => {
    if (classroomId) fetchStudents();
    else setLoading(false);
  }, [classroomId]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.date_of_birth || !classroomId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          date_of_birth: form.date_of_birth,
          progress_levels: {
            practical_life: form.practical_life,
            sensorial: form.sensorial,
            math: form.math,
            language: form.language,
            cultural: form.cultural,
          }
        })
      });
      if (res.ok) {
        setForm({ name: '', date_of_birth: '', practical_life: 0, sensorial: 0, math: 0, language: 0, cultural: 0 });
        fetchStudents();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (!classroomId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-600">No classroom selected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  }

  const levels = ['Not Started', 'Beginning', 'Developing', 'Confident', 'Advanced'];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">👶 Class Setup</h1>
            <p className="text-gray-500 text-sm">{students.length} students added</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">
            {showForm ? 'Cancel' : '+ Add Student'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Student Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 border mb-6">
            <h2 className="font-bold text-lg mb-4">Add New Student</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Child's full name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>

            <h3 className="font-medium text-sm text-gray-700 mb-3">Current Progress Levels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
              {(['practical_life', 'sensorial', 'math', 'language', 'cultural'] as const).map((area) => (
                <div key={area} className="text-center">
                  <label className="block text-xs font-medium mb-1 capitalize">{area.replace('_', ' ')}</label>
                  <select value={form[area]} onChange={(e) => setForm({...form, [area]: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm">
                    {levels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={!form.name || !form.date_of_birth || saving} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        )}

        {/* Students List */}
        <h2 className="font-semibold mb-4">Students ({students.length})</h2>
        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
            <div className="text-5xl mb-4">👶</div>
            <p className="text-gray-500">No students yet. Click "Add Student" to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {students.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 border text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center text-2xl overflow-hidden">
                  {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <p className="font-medium text-sm truncate">{s.name}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
