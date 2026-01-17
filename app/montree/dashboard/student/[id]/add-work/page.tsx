// /montree/dashboard/student/[id]/add-work/page.tsx
// ADD WORK - Real curriculum data from API
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

type WorkStatus = 'presented' | 'practicing' | 'completed';

interface CurriculumWork {
  id: string;
  name: string;
  area: string;
  areaName: string;
  category: string;
  chineseName?: string;
}

interface Area {
  id: string;
  name: string;
  emoji: string;
}

export default function AddWorkPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [areas, setAreas] = useState<Area[]>([]);
  const [works, setWorks] = useState<CurriculumWork[]>([]);
  const [filteredWorks, setFilteredWorks] = useState<CurriculumWork[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedWork, setSelectedWork] = useState<CurriculumWork | null>(null);
  const [status, setStatus] = useState<WorkStatus>('presented');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Load curriculum on mount
  useEffect(() => {
    loadCurriculum();
  }, []);

  // Filter works when area or search changes
  useEffect(() => {
    let filtered = works;
    if (selectedArea !== 'all') {
      filtered = filtered.filter(w => w.area === selectedArea);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(s) ||
        w.chineseName?.toLowerCase().includes(s)
      );
    }
    setFilteredWorks(filtered);
  }, [works, selectedArea, search]);

  async function loadCurriculum() {
    try {
      const res = await fetch('/api/montree/curriculum');
      if (!res.ok) throw new Error('Failed to load curriculum');
      const data = await res.json();
      setAreas(data.areas || []);
      setWorks(data.works || []);
      setFilteredWorks(data.works || []);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePhotoCapture = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedWork) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          workId: selectedWork.id,
          workName: selectedWork.name,
          area: selectedWork.area,
          status,
          notes,
          photo,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.back();
    } catch (err) {
      alert('Failed to save work. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Add Work</h1>
          <p className="text-slate-500 text-sm">{works.length} works available</p>
        </div>
      </div>

      {/* Step 1: Select Work */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">1. Select Work</h2>
        <input
          type="text"
          placeholder="Search works..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />
        
        {/* Area Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedArea === area.id
                  ? 'bg-teal-500/20 border border-teal-500/50 text-teal-400'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}
            >
              {area.emoji} {area.name}
            </button>
          ))}
        </div>

        {/* Work List */}
        <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-800/50 rounded-xl p-2">
          {filteredWorks.slice(0, 50).map((work) => (
            <button
              key={work.id}
              onClick={() => setSelectedWork(work)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                selectedWork?.id === work.id
                  ? 'bg-teal-500/20 border border-teal-500/50 text-white'
                  : 'hover:bg-slate-700/50 text-slate-300'
              }`}
            >
              <div className="font-medium">{work.name}</div>
              <div className="text-xs text-slate-500">{work.areaName} • {work.category}</div>
            </button>
          ))}
          {filteredWorks.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No works found</p>
          )}
          {filteredWorks.length > 50 && (
            <p className="text-slate-500 text-xs text-center py-2">Showing 50 of {filteredWorks.length}. Search to narrow.</p>
          )}
        </div>

        {selectedWork && (
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3">
            <p className="text-teal-400 text-sm">✓ {selectedWork.name}</p>
          </div>
        )}
      </div>

      {/* Step 2: Status */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">2. Status</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'presented', label: 'Presented', emoji: '○' },
            { value: 'practicing', label: 'Practicing', emoji: '◐' },
            { value: 'completed', label: 'Completed', emoji: '✓' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value as WorkStatus)}
              className={`p-3 rounded-xl border transition-all ${
                status === opt.value
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xl mb-1">{opt.emoji}</div>
              <div className="text-sm font-medium">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Photo */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">3. Photo (Optional)</h2>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        {photo ? (
          <div className="relative">
            <img src={photo} alt="Work" className="w-full h-40 object-cover rounded-xl" />
            <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full text-white">✕</button>
          </div>
        ) : (
          <button onClick={handlePhotoCapture} className="w-full h-28 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-teal-500 transition-all">
            <span className="text-2xl">📷</span>
            <span className="text-sm">Tap to capture</span>
          </button>
        )}
      </div>

      {/* Step 4: Notes */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold">4. Notes (Optional)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations..."
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
        />
      </div>

      {/* Save Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={!selectedWork || saving}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              selectedWork && !saving
                ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ Saving...' : 'Save Work'}
          </button>
        </div>
      </div>
    </div>
  );
}
