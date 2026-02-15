// app/teacher/students/[studentId]/quick-place/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Work { id: string; name: string; sequence: number; }
interface Category { id: string; name: string; works: Work[]; }
interface Area { id: string; name: string; categories: Category[]; }

const areaConfig: Record<string, { name: string; color: string; bg: string }> = {
  practical_life: { name: 'Practical Life', color: 'text-red-700', bg: 'bg-red-50' },
  sensorial: { name: 'Sensorial', color: 'text-pink-700', bg: 'bg-pink-50' },
  mathematics: { name: 'Mathematics', color: 'text-blue-700', bg: 'bg-blue-50' },
  language: { name: 'Language', color: 'text-green-700', bg: 'bg-green-50' },
  cultural: { name: 'Cultural', color: 'text-yellow-700', bg: 'bg-yellow-50' }
};

export default function QuickPlacePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [curriculum, setCurriculum] = useState<Area[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>({
    practical_life: '', sensorial: '', mathematics: '', language: '', cultural: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [studentId]);
  
  async function fetchData() {
    try {
      const studentRes = await fetch(`/api/children/${studentId}`);
      const studentData = await studentRes.json();
      if (!studentData.success) throw new Error(studentData.error);
      setStudent(studentData.child);
      
      const clsId = studentData.child.classroom_id;
      setClassroomId(clsId);
      
      const currRes = await fetch(`/api/classroom/${clsId}/curriculum`);
      const currData = await currRes.json();
      if (!currData.success) throw new Error(currData.error);
      setCurriculum(currData.curriculum);
      
      const placeRes = await fetch(`/api/students/${studentId}/quick-place?classroomId=${clsId}`);
      const placeData = await placeRes.json();
      if (placeData.success && placeData.positions) {
        const current: Record<string, string> = {};
        for (const [area, pos] of Object.entries(placeData.positions) as any) {
          current[area] = pos.currentWorkId || '';
        }
        setPlacements(prev => ({ ...prev, ...current }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSave() {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/students/${studentId}/quick-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placements })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess(`Done! ${data.totalWorksSet} works updated.`);
      setTimeout(() => router.push(`/teacher/progress`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  
  function getWorksForArea(areaId: string): Work[] {
    const area = curriculum.find(a => a.id === areaId);
    if (!area) return [];
    return area.categories.flatMap(c => c.works).sort((a, b) => a.sequence - b.sequence);
  }
  
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/teacher/progress" className="text-blue-600 hover:text-blue-800">← Back</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Quick Placement</h1>
          {student && <p className="text-gray-600">Set {student.name}'s current position</p>}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800 text-sm">
          Select the work each student is <strong>currently working on</strong>. Previous works will be marked mastered.
        </div>
        
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-800">{success}</div>}
        
        <div className="space-y-4">
          {Object.entries(areaConfig).map(([areaId, cfg]) => {
            const works = getWorksForArea(areaId);
            return (
              <div key={areaId} className={`${cfg.bg} border rounded-lg p-4`}>
                <label className={`block font-semibold ${cfg.color} mb-2`}>{cfg.name}</label>
                <select value={placements[areaId] || ''} onChange={e => setPlacements(p => ({ ...p, [areaId]: e.target.value }))}
                  className="w-full p-3 border rounded-lg bg-white">
                  <option value="">-- Not started --</option>
                  {works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 flex gap-4">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Placement'}
          </button>
          <Link href="/teacher/progress" className="px-6 py-3 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</Link>
        </div>
      </div>
    </div>
  );
}


