// app/admin/schools/[slug]/english/page.tsx
// English Progression Management - The Key Page!
// This is where you define WBW/a/, WBW/e/, etc. and their order
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface EnglishWork {
  id: string;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  category: 'sound_games' | 'word_building' | 'reading' | 'blends' | 'phonograms';
  isActive: boolean;
}

const CATEGORIES = {
  sound_games: { name: 'Sound Games', icon: '👂', color: 'bg-purple-500', bgLight: 'bg-purple-500/20' },
  word_building: { name: 'Word Building', icon: '🔤', color: 'bg-amber-500', bgLight: 'bg-amber-500/20' },
  reading: { name: 'Reading', icon: '📖', color: 'bg-pink-500', bgLight: 'bg-pink-500/20' },
  blends: { name: 'Blends', icon: '🔵', color: 'bg-blue-500', bgLight: 'bg-blue-500/20' },
  phonograms: { name: 'Phonograms', icon: '🟢', color: 'bg-green-500', bgLight: 'bg-green-500/20' },
};

// Default English works sequence
const DEFAULT_WORKS: EnglishWork[] = [
  { id: 'bs', code: 'BS', name: 'Beginning Sounds', description: 'I Spy with beginning sounds', sequence: 1, category: 'sound_games', isActive: true },
  { id: 'es', code: 'ES', name: 'Ending Sounds', description: 'I Spy with ending sounds', sequence: 2, category: 'sound_games', isActive: true },
  { id: 'ms', code: 'MS', name: 'Middle Sounds', description: 'Identifying middle vowel sounds', sequence: 3, category: 'sound_games', isActive: true },
  { id: 'wbw_a', code: 'WBW/a/', name: 'Word Building: Short A', description: 'cat, hat, bat, mat', sequence: 4, category: 'word_building', isActive: true },
  { id: 'wbw_e', code: 'WBW/e/', name: 'Word Building: Short E', description: 'pen, bed, red, hen', sequence: 5, category: 'word_building', isActive: true },
  { id: 'wbw_i', code: 'WBW/i/', name: 'Word Building: Short I', description: 'pin, sit, bit, pig', sequence: 6, category: 'word_building', isActive: true },
  { id: 'wbw_o', code: 'WBW/o/', name: 'Word Building: Short O', description: 'hot, pot, dog, log', sequence: 7, category: 'word_building', isActive: true },
  { id: 'wbw_u', code: 'WBW/u/', name: 'Word Building: Short U', description: 'cup, bus, sun, fun', sequence: 8, category: 'word_building', isActive: true },
  { id: 'pr_a', code: 'PR/a/', name: 'Pink Reading: Short A', description: 'Reading CVC with short A', sequence: 9, category: 'reading', isActive: true },
  { id: 'pr_e', code: 'PR/e/', name: 'Pink Reading: Short E', description: 'Reading CVC with short E', sequence: 10, category: 'reading', isActive: true },
  { id: 'pr_i', code: 'PR/i/', name: 'Pink Reading: Short I', description: 'Reading CVC with short I', sequence: 11, category: 'reading', isActive: true },
  { id: 'pr_o', code: 'PR/o/', name: 'Pink Reading: Short O', description: 'Reading CVC with short O', sequence: 12, category: 'reading', isActive: true },
  { id: 'pr_u', code: 'PR/u/', name: 'Pink Reading: Short U', description: 'Reading CVC with short U', sequence: 13, category: 'reading', isActive: true },
  { id: 'bl_init', code: 'BL/init/', name: 'Initial Blends', description: 'bl, cl, fl, gl, br, cr, dr', sequence: 14, category: 'blends', isActive: true },
  { id: 'bl_final', code: 'BL/final/', name: 'Final Blends', description: 'nd, nt, nk, mp, ft, lt', sequence: 15, category: 'blends', isActive: true },
];

const SCHOOL_NAME = 'Beijing International School';

export default function SchoolEnglishPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [works, setWorks] = useState<EnglishWork[]>(DEFAULT_WORKS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Drag handlers
  const handleDragStart = (index: number) => setDraggedIndex(index);
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newWorks = [...works];
    const [dragged] = newWorks.splice(draggedIndex, 1);
    newWorks.splice(index, 0, dragged);
    newWorks.forEach((w, i) => w.sequence = i + 1);
    
    setWorks(newWorks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const toggleActive = (id: string) => {
    setWorks(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
  };

  const deleteWork = (id: string) => {
    if (confirm('Remove this work from the progression?')) {
      setWorks(prev => {
        const filtered = prev.filter(w => w.id !== id);
        return filtered.map((w, i) => ({ ...w, sequence: i + 1 }));
      });
    }
  };

  // Filter works
  const filteredWorks = filterCategory === 'all' 
    ? works 
    : works.filter(w => w.category === filterCategory);

  const activeCount = works.filter(w => w.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/schools/${slug}`} className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Back
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔤</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">English Progression</h1>
              <p className="text-slate-400 text-sm">Drag to reorder</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-400 transition-colors text-sm"
          >
            + Add Work
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Info */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-200 text-sm">
            <strong className="text-red-400">English Works Sequence</strong> — 
            This defines the order children progress through English. Used for weekly reports.
          </p>
        </div>

        {/* Stats & Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-red-400">{works.length}</span>
              <span className="text-slate-400 text-sm ml-2">works</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-green-400">{activeCount}</span>
              <span className="text-slate-400 text-sm ml-2">active</span>
            </div>
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-600"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        {/* Works List */}
        <div className="space-y-2">
          {filteredWorks.map((work, index) => {
            const cat = CATEGORIES[work.category];
            const actualIndex = works.findIndex(w => w.id === work.id);
            
            return (
              <div
                key={work.id}
                draggable
                onDragStart={() => handleDragStart(actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDragEnd={handleDragEnd}
                className={`bg-slate-800 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing ${
                  draggedIndex === actualIndex 
                    ? 'border-red-500 scale-[0.98] opacity-60' 
                    : work.isActive 
                    ? 'border-slate-700 hover:border-slate-600' 
                    : 'border-slate-800 opacity-40'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="text-slate-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                  </div>
                  
                  {/* Sequence Number */}
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                    {work.sequence}
                  </div>
                  
                  {/* Category Badge */}
                  <div className={`w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                    {cat.icon}
                  </div>
                  
                  {/* Work Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-lg">{work.code}</span>
                      <span className="text-white font-medium truncate">{work.name}</span>
                    </div>
                    {work.description && (
                      <p className="text-sm text-slate-500 truncate">{work.description}</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(work.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        work.isActive 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {work.isActive ? '✓ Active' : 'Hidden'}
                    </button>
                    
                    <button
                      onClick={() => deleteWork(work.id)}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Legend */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div 
                key={key} 
                className={`flex items-center gap-2 ${cat.bgLight} rounded-lg px-3 py-1.5`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm text-white">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save Notice */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">Changes auto-save when database is connected</p>
        </div>
      </main>

      {/* Add Work Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Add English Work</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Code</label>
                <input 
                  type="text" 
                  placeholder="e.g., WBW/a/" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Word Building: Short A" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Category</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., cat, hat, bat, mat" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Will save to database when connected');
                  setShowAddModal(false);
                }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors font-medium"
              >
                Add Work
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
