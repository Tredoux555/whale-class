// app/admin/schools/[slug]/classrooms/[id]/curriculum/page.tsx
// Classroom Curriculum Editor - Teacher inserts/deletes/reorders works
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Work {
  id: string;
  name: string;
  area: string;
  sequence: number;
  isActive: boolean;
}

const AREAS = ['practical_life', 'sensorial', 'math', 'language', 'cultural'] as const;

const AREA_LABELS: Record<string, { name: string; color: string }> = {
  practical_life: { name: 'Practical Life', color: 'bg-amber-500' },
  sensorial: { name: 'Sensorial', color: 'bg-pink-500' },
  math: { name: 'Mathematics', color: 'bg-blue-500' },
  language: { name: 'Language', color: 'bg-green-500' },
  cultural: { name: 'Cultural', color: 'bg-purple-500' },
};

// Mock curriculum data (would come from master → school → classroom copy)
const MOCK_WORKS: Work[] = [
  // Practical Life
  { id: 'pl1', name: 'Water Pouring', area: 'practical_life', sequence: 1, isActive: true },
  { id: 'pl2', name: 'Dry Pouring (Grains)', area: 'practical_life', sequence: 2, isActive: true },
  { id: 'pl3', name: 'Spooning', area: 'practical_life', sequence: 3, isActive: true },
  { id: 'pl4', name: 'Tonging', area: 'practical_life', sequence: 4, isActive: true },
  { id: 'pl5', name: 'Tweezing', area: 'practical_life', sequence: 5, isActive: true },
  { id: 'pl6', name: 'Sewing Cards', area: 'practical_life', sequence: 6, isActive: true },
  { id: 'pl7', name: 'Folding Cloths', area: 'practical_life', sequence: 7, isActive: true },
  { id: 'pl8', name: 'Hand Washing', area: 'practical_life', sequence: 8, isActive: true },
  // Sensorial
  { id: 's1', name: 'Cylinder Blocks', area: 'sensorial', sequence: 1, isActive: true },
  { id: 's2', name: 'Pink Tower', area: 'sensorial', sequence: 2, isActive: true },
  { id: 's3', name: 'Brown Stair', area: 'sensorial', sequence: 3, isActive: true },
  { id: 's4', name: 'Red Rods', area: 'sensorial', sequence: 4, isActive: true },
  { id: 's5', name: 'Color Tablets Box 1', area: 'sensorial', sequence: 5, isActive: true },
  { id: 's6', name: 'Color Tablets Box 2', area: 'sensorial', sequence: 6, isActive: true },
  // Math
  { id: 'm1', name: 'Number Rods', area: 'math', sequence: 1, isActive: true },
  { id: 'm2', name: 'Sandpaper Numbers', area: 'math', sequence: 2, isActive: true },
  { id: 'm3', name: 'Spindle Boxes', area: 'math', sequence: 3, isActive: true },
  { id: 'm4', name: 'Cards and Counters', area: 'math', sequence: 4, isActive: true },
  { id: 'm5', name: 'Golden Beads Introduction', area: 'math', sequence: 5, isActive: true },
  // Language
  { id: 'l1', name: 'Sandpaper Letters', area: 'language', sequence: 1, isActive: true },
  { id: 'l2', name: 'Moveable Alphabet', area: 'language', sequence: 2, isActive: true },
  { id: 'l3', name: 'Metal Insets', area: 'language', sequence: 3, isActive: true },
  { id: 'l4', name: 'Object Box', area: 'language', sequence: 4, isActive: true },
  // Cultural
  { id: 'c1', name: 'Globe Introduction', area: 'cultural', sequence: 1, isActive: true },
  { id: 'c2', name: 'Puzzle Maps', area: 'cultural', sequence: 2, isActive: true },
  { id: 'c3', name: 'Land & Water Forms', area: 'cultural', sequence: 3, isActive: true },
];

export default function ClassroomCurriculumPage() {
  const params = useParams();
  const slug = params.slug as string;
  const classroomId = params.id as string;
  
  const [works, setWorks] = useState<Work[]>(MOCK_WORKS);
  const [expandedArea, setExpandedArea] = useState<string | null>('practical_life');
  const [search, setSearch] = useState('');
  const [showInsertAt, setShowInsertAt] = useState<string | null>(null);
  const [newWorkName, setNewWorkName] = useState('');

  const toggleArea = (area: string) => {
    setExpandedArea(expandedArea === area ? null : area);
  };

  const worksByArea = (area: string) => 
    works.filter(w => w.area === area).sort((a, b) => a.sequence - b.sequence);

  const deleteWork = (id: string) => {
    setWorks(works.filter(w => w.id !== id));
  };

  const insertWork = (area: string, afterId: string | null) => {
    if (!newWorkName.trim()) return;
    
    const areaWorks = worksByArea(area);
    const insertIndex = afterId 
      ? areaWorks.findIndex(w => w.id === afterId) + 1 
      : 0;
    
    const newWork: Work = {
      id: Date.now().toString(),
      name: newWorkName.trim(),
      area,
      sequence: insertIndex + 1,
      isActive: true,
    };
    
    // Resequence
    const newWorks = [...works];
    const updatedAreaWorks = [...areaWorks];
    updatedAreaWorks.splice(insertIndex, 0, newWork);
    updatedAreaWorks.forEach((w, i) => w.sequence = i + 1);
    
    // Merge back
    const otherWorks = works.filter(w => w.area !== area);
    setWorks([...otherWorks, ...updatedAreaWorks]);
    
    setNewWorkName('');
    setShowInsertAt(null);
  };

  const moveWork = (id: string, direction: 'up' | 'down') => {
    const work = works.find(w => w.id === id);
    if (!work) return;
    
    const areaWorks = worksByArea(work.area);
    const index = areaWorks.findIndex(w => w.id === id);
    
    if (direction === 'up' && index > 0) {
      [areaWorks[index], areaWorks[index - 1]] = [areaWorks[index - 1], areaWorks[index]];
    } else if (direction === 'down' && index < areaWorks.length - 1) {
      [areaWorks[index], areaWorks[index + 1]] = [areaWorks[index + 1], areaWorks[index]];
    }
    
    areaWorks.forEach((w, i) => w.sequence = i + 1);
    const otherWorks = works.filter(w => w.area !== work.area);
    setWorks([...otherWorks, ...areaWorks]);
  };

  const filteredAreas = search 
    ? AREAS.filter(area => 
        worksByArea(area).some(w => 
          w.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    : AREAS;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}/classrooms/${classroomId}`} className="text-slate-500 hover:text-white text-sm">
              ← Back
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">Curriculum</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Insert, delete, or reorder works for this classroom</p>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <input
          type="text"
          placeholder="Search works..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
        />
      </div>

      {/* Areas */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {filteredAreas.map((area) => {
          const areaInfo = AREA_LABELS[area];
          const areaWorks = worksByArea(area);
          const isExpanded = expandedArea === area || search;
          const filteredWorks = search 
            ? areaWorks.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))
            : areaWorks;

          return (
            <div key={area} className="mb-2">
              {/* Area Header */}
              <button
                onClick={() => !search && toggleArea(area)}
                className="w-full flex items-center justify-between py-3 hover:bg-slate-900/50 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${areaInfo.color}`} />
                  <span className="text-white font-medium">{areaInfo.name}</span>
                  <span className="text-slate-600 text-sm">({areaWorks.length})</span>
                </div>
                {!search && (
                  <svg 
                    className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Works List */}
              {isExpanded && (
                <div className="ml-6 border-l border-slate-800 pl-4 py-2">
                  {/* Insert at top */}
                  {showInsertAt === `${area}-top` ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Work name"
                        value={newWorkName}
                        onChange={(e) => setNewWorkName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && insertWork(area, null)}
                        autoFocus
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
                      />
                      <button onClick={() => insertWork(area, null)} className="px-3 py-2 bg-white text-black text-sm rounded">Add</button>
                      <button onClick={() => { setShowInsertAt(null); setNewWorkName(''); }} className="px-3 py-2 text-slate-500 text-sm">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowInsertAt(`${area}-top`)}
                      className="w-full py-2 border border-dashed border-slate-800 rounded text-slate-600 text-sm hover:border-slate-700 hover:text-slate-500 mb-2"
                    >
                      + Insert work here
                    </button>
                  )}

                  {filteredWorks.map((work, index) => (
                    <div key={work.id}>
                      {/* Work Row */}
                      <div className="flex items-center justify-between py-2 group">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 text-sm w-6">{work.sequence}</span>
                          <span className="text-white">{work.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveWork(work.id, 'up')}
                            className="p-1 text-slate-600 hover:text-white"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveWork(work.id, 'down')}
                            className="p-1 text-slate-600 hover:text-white"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteWork(work.id)}
                            className="p-1 text-slate-600 hover:text-red-400 ml-2"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Insert after this work */}
                      {showInsertAt === work.id ? (
                        <div className="flex gap-2 my-2 ml-9">
                          <input
                            type="text"
                            placeholder="Work name"
                            value={newWorkName}
                            onChange={(e) => setNewWorkName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && insertWork(area, work.id)}
                            autoFocus
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
                          />
                          <button onClick={() => insertWork(area, work.id)} className="px-3 py-2 bg-white text-black text-sm rounded">Add</button>
                          <button onClick={() => { setShowInsertAt(null); setNewWorkName(''); }} className="px-3 py-2 text-slate-500 text-sm">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowInsertAt(work.id)}
                          className="w-full py-1 text-slate-700 text-xs hover:text-slate-500 text-left ml-9 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          + insert
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
