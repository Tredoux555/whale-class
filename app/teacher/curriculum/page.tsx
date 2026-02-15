// app/teacher/curriculum/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Work {
  id: string; name: string; description: string; sequence: number;
  materialsOnShelf: boolean; customNotes: string; isCustom: boolean;
}
interface Category { id: string; name: string; works: Work[]; }
interface Area { id: string; name: string; categories: Category[]; }

const areaColors: Record<string, { bg: string; border: string; text: string }> = {
  practical_life: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  sensorial: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  mathematics: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  language: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  cultural: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' }
};

export default function TeacherCurriculumPage() {
  const [curriculum, setCurriculum] = useState<Area[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => { fetchCurriculum(); }, []);
  
  async function fetchCurriculum() {
    try {
      // Get classroom from session/context - for now use first available
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      const clsId = authData.user?.classroom_id || authData.classroomId;
      setClassroomId(clsId);
      
      if (clsId) {
        const res = await fetch(`/api/classroom/${clsId}/curriculum`);
        const data = await res.json();
        if (data.success) setCurriculum(data.curriculum);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  
  async function toggleMaterial(work: Work) {
    if (!classroomId) return;
    setSaving(true);
    try {
      await fetch(`/api/classroom/${classroomId}/curriculum`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, updates: { materials_on_shelf: !work.materialsOnShelf } })
      });
      setCurriculum(prev => prev.map(a => ({
        ...a, categories: a.categories.map(c => ({
          ...c, works: c.works.map(w => w.id === work.id ? { ...w, materialsOnShelf: !w.materialsOnShelf } : w)
        }))
      })));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }
  
  async function saveNotes(work: Work, notes: string) {
    if (!classroomId) return;
    setSaving(true);
    try {
      await fetch(`/api/classroom/${classroomId}/curriculum`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, updates: { custom_notes: notes } })
      });
      setCurriculum(prev => prev.map(a => ({
        ...a, categories: a.categories.map(c => ({
          ...c, works: c.works.map(w => w.id === work.id ? { ...w, customNotes: notes } : w)
        }))
      })));
      setEditingWork(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }
  
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;
  
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/teacher" className="text-emerald-600 hover:text-emerald-800">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">My Curriculum</h1>
          <p className="text-gray-600">Toggle works on/off based on your shelf. Add notes.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          {curriculum.map(area => {
            const total = area.categories.reduce((s, c) => s + c.works.length, 0);
            const onShelf = area.categories.reduce((s, c) => s + c.works.filter(w => w.materialsOnShelf).length, 0);
            const colors = areaColors[area.id] || areaColors.practical_life;
            return (
              <div key={area.id} className={`${colors.bg} ${colors.border} border rounded-lg px-3 py-2`}>
                <span className={`font-medium ${colors.text}`}>{area.name}</span>
                <span className="text-gray-500 text-sm ml-2">{onShelf}/{total}</span>
              </div>
            );
          })}
        </div>
        
        <div className="space-y-4">
          {curriculum.map(area => {
            const colors = areaColors[area.id] || areaColors.practical_life;
            const isExpanded = expandedAreas.has(area.id);
            return (
              <div key={area.id} className="bg-white rounded-lg shadow overflow-hidden">
                <button onClick={() => setExpandedAreas(p => { const n = new Set(p); isExpanded ? n.delete(area.id) : n.add(area.id); return n; })}
                  className={`w-full ${colors.bg} ${colors.border} border-b px-4 py-3 flex justify-between`}>
                  <span className={`font-semibold ${colors.text}`}>{area.name}</span>
                  <span>{isExpanded ? '▼' : '▶'}</span>
                </button>
                {isExpanded && (
                  <div className="divide-y">
                    {area.categories.map(cat => {
                      const key = `${area.id}-${cat.id}`;
                      const catExp = expandedCats.has(key);
                      return (
                        <div key={cat.id}>
                          <button onClick={() => setExpandedCats(p => { const n = new Set(p); catExp ? n.delete(key) : n.add(key); return n; })}
                            className="w-full px-4 py-2 flex justify-between hover:bg-gray-50">
                            <span className="font-medium text-gray-700">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">{cat.works.filter(w => w.materialsOnShelf).length}/{cat.works.length}</span>
                              <span>{catExp ? '▼' : '▶'}</span>
                            </div>
                          </button>
                          {catExp && (
                            <div className="bg-gray-50 px-4 py-2 space-y-2">
                              {cat.works.map(work => (
                                <div key={work.id} className={`flex items-center gap-3 p-2 rounded ${work.materialsOnShelf ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                                  <button onClick={() => toggleMaterial(work)} disabled={saving}
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${work.materialsOnShelf ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                                    {work.materialsOnShelf && '✓'}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={work.materialsOnShelf ? '' : 'text-gray-500'}>{work.name}</span>
                                      {work.isCustom && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">Custom</span>}
                                    </div>
                                    {work.customNotes && <p className="text-xs text-gray-500 mt-1">📝 {work.customNotes}</p>}
                                  </div>
                                  <button onClick={() => setEditingWork(work)} className="text-gray-400 hover:text-gray-600 p-1">✏️</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {editingWork && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="font-semibold text-lg mb-4">Notes: {editingWork.name}</h3>
              <textarea id="work-notes" defaultValue={editingWork.customNotes || ''} placeholder="Add notes..." rows={4} className="w-full p-3 border rounded-lg mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setEditingWork(null)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => saveNotes(editingWork, (document.getElementById('work-notes') as HTMLTextAreaElement).value)}
                  disabled={saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


