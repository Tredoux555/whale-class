'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, CheckCircle, Loader2 } from 'lucide-react';

interface CurriculumWork {
  id: string;
  name: string;
  sequence: number;
}

interface ChildInfo {
  id: string;
  name: string;
  school_id: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500', border: 'border-pink-300' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500', border: 'border-purple-300' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'bg-blue-500', border: 'border-blue-300' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500', border: 'border-green-300' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500', border: 'border-orange-300' },
];

export default function QuickPlacePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [currentPositions, setCurrentPositions] = useState<Record<string, string | null>>({});
  const [selectedPositions, setSelectedPositions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/students/${studentId}/quick-place`);
      const data = await res.json();
      
      setChild(data.child);
      setCurriculum(data.curriculum || {});
      setCurrentPositions(data.currentPositions || {});
      
      const initial: Record<string, string> = {};
      for (const [area, workId] of Object.entries(data.currentPositions || {})) {
        if (workId) initial[area] = workId as string;
      }
      setSelectedPositions(initial);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      const placements = Object.entries(selectedPositions)
        .filter(([_, workId]) => workId)
        .map(([area_id, work_id]) => ({ area_id, work_id }));

      const res = await fetch(`/api/students/${studentId}/quick-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placements })
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    for (const area of AREAS) {
      const current = currentPositions[area.id] || '';
      const selected = selectedPositions[area.id] || '';
      if (current !== selected) return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/teacher/progress" className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Quick Placement</h1>
                <p className="text-sm text-gray-500">{child?.name}</p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                saved ? 'bg-green-500 text-white'
                  : hasChanges() ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Select current work per area. Previous → Mastered. Selected → Practicing.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-4">
        {AREAS.map(area => {
          const works = curriculum[area.id] || [];
          const selected = selectedPositions[area.id];
          const current = currentPositions[area.id];
          const changed = selected !== (current || '');

          return (
            <div key={area.id} className={`bg-white rounded-xl border-2 overflow-hidden ${changed ? area.border : 'border-gray-200'}`}>
              <div className={`${area.color} text-white px-4 py-3 flex items-center gap-3`}>
                <span className="text-2xl">{area.icon}</span>
                <div>
                  <h2 className="font-semibold">{area.name}</h2>
                  <p className="text-sm opacity-80">{works.length} works</p>
                </div>
              </div>
              <div className="p-4">
                <select
                  value={selected || ''}
                  onChange={(e) => setSelectedPositions(prev => ({ ...prev, [area.id]: e.target.value }))}
                  className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Not started —</option>
                  {works.map((work, idx) => (
                    <option key={work.id} value={work.id}>{idx + 1}. {work.name}</option>
                  ))}
                </select>
                {changed && <p className="mt-2 text-sm text-blue-600">✓ Will update progress</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
