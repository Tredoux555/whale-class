// app/admin/schools/[slug]/english/page.tsx
// English Progression Management - With Inline Editing
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface EnglishWork {
  id: string;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  category: 'sound_games' | 'word_building' | 'word_family' | 'reading' | 'primary_phonics' | 'blends' | 'phonograms';
  isActive: boolean;
}

const CATEGORIES = {
  sound_games: { name: 'Sound Games', icon: '👂', color: 'bg-purple-500', bgLight: 'bg-purple-500/20' },
  word_building: { name: 'Word Building', icon: '🔤', color: 'bg-amber-500', bgLight: 'bg-amber-500/20' },
  word_family: { name: 'Word Family', icon: '🏠', color: 'bg-orange-500', bgLight: 'bg-orange-500/20' },
  reading: { name: 'Pink Reading', icon: '📖', color: 'bg-pink-500', bgLight: 'bg-pink-500/20' },
  primary_phonics: { name: 'Primary Phonics', icon: '📕', color: 'bg-red-600', bgLight: 'bg-red-600/20' },
  blends: { name: 'Blends', icon: '🔵', color: 'bg-blue-500', bgLight: 'bg-blue-500/20' },
  phonograms: { name: 'Phonograms', icon: '🟢', color: 'bg-green-500', bgLight: 'bg-green-500/20' },
};

// Default English works
const DEFAULT_WORKS: EnglishWork[] = [
  { id: 'bs', code: 'BS', name: 'Beginning Sounds', description: 'I Spy with beginning sounds', sequence: 1, category: 'sound_games', isActive: true },
  { id: 'es', code: 'ES', name: 'Ending Sounds', description: 'I Spy with ending sounds', sequence: 2, category: 'sound_games', isActive: true },
  { id: 'ms', code: 'MS', name: 'Middle Sounds', description: 'Identifying middle vowel sounds', sequence: 3, category: 'sound_games', isActive: true },
  { id: 'wbw_a', code: 'WBW/a/', name: 'Word Building: Short A', description: 'cat, hat, bat, mat', sequence: 4, category: 'word_building', isActive: true },
  { id: 'wbw_e', code: 'WBW/e/', name: 'Word Building: Short E', description: 'pen, bed, red, hen', sequence: 5, category: 'word_building', isActive: true },
  { id: 'wbw_i', code: 'WBW/i/', name: 'Word Building: Short I', description: 'pin, sit, bit, pig', sequence: 6, category: 'word_building', isActive: true },
  { id: 'wbw_o', code: 'WBW/o/', name: 'Word Building: Short O', description: 'hot, pot, dog, log', sequence: 7, category: 'word_building', isActive: true },
  { id: 'wbw_u', code: 'WBW/u/', name: 'Word Building: Short U', description: 'cup, bus, sun, fun', sequence: 8, category: 'word_building', isActive: true },
  { id: 'wfw_a', code: 'WFW/a/', name: 'Word Family: Short A', description: '-at, -an, -ap, -ad families', sequence: 9, category: 'word_family', isActive: true },
  { id: 'wfw_e', code: 'WFW/e/', name: 'Word Family: Short E', description: '-en, -et, -ed, -eg families', sequence: 10, category: 'word_family', isActive: true },
  { id: 'wfw_i', code: 'WFW/i/', name: 'Word Family: Short I', description: '-in, -it, -ip, -ig families', sequence: 11, category: 'word_family', isActive: true },
  { id: 'wfw_o', code: 'WFW/o/', name: 'Word Family: Short O', description: '-ot, -op, -og, -ob families', sequence: 12, category: 'word_family', isActive: true },
  { id: 'wfw_u', code: 'WFW/u/', name: 'Word Family: Short U', description: '-un, -ut, -ug, -ub families', sequence: 13, category: 'word_family', isActive: true },
  { id: 'pr_a', code: 'PR/a/', name: 'Pink Reading: Short A', description: 'Reading CVC with short A', sequence: 14, category: 'reading', isActive: true },
  { id: 'pr_e', code: 'PR/e/', name: 'Pink Reading: Short E', description: 'Reading CVC with short E', sequence: 15, category: 'reading', isActive: true },
  { id: 'pr_i', code: 'PR/i/', name: 'Pink Reading: Short I', description: 'Reading CVC with short I', sequence: 16, category: 'reading', isActive: true },
  { id: 'pr_o', code: 'PR/o/', name: 'Pink Reading: Short O', description: 'Reading CVC with short O', sequence: 17, category: 'reading', isActive: true },
  { id: 'pr_u', code: 'PR/u/', name: 'Pink Reading: Short U', description: 'Reading CVC with short U', sequence: 18, category: 'reading', isActive: true },
  { id: 'prph_red_1', code: 'PrPh Red 1', name: 'Primary Phonics: Red 1', description: 'Sam, Mac, Nat stories', sequence: 19, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_2', code: 'PrPh Red 2', name: 'Primary Phonics: Red 2', description: 'Continuing short A', sequence: 20, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_3', code: 'PrPh Red 3', name: 'Primary Phonics: Red 3', description: 'Short I introduction', sequence: 21, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_4', code: 'PrPh Red 4', name: 'Primary Phonics: Red 4', description: 'Short A & I mixed', sequence: 22, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_5', code: 'PrPh Red 5', name: 'Primary Phonics: Red 5', description: 'Short O introduction', sequence: 23, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_6', code: 'PrPh Red 6', name: 'Primary Phonics: Red 6', description: 'Short A, I, O mixed', sequence: 24, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_7', code: 'PrPh Red 7', name: 'Primary Phonics: Red 7', description: 'Short U introduction', sequence: 25, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_8', code: 'PrPh Red 8', name: 'Primary Phonics: Red 8', description: 'All short vowels', sequence: 26, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_9', code: 'PrPh Red 9', name: 'Primary Phonics: Red 9', description: 'Short E introduction', sequence: 27, category: 'primary_phonics', isActive: true },
  { id: 'prph_red_10', code: 'PrPh Red 10', name: 'Primary Phonics: Red 10', description: 'All five short vowels mastery', sequence: 28, category: 'primary_phonics', isActive: true },
  { id: 'bl_init', code: 'BL/init/', name: 'Initial Blends', description: 'bl, cl, fl, gl, br, cr, dr', sequence: 29, category: 'blends', isActive: true },
  { id: 'bl_final', code: 'BL/final/', name: 'Final Blends', description: 'nd, nt, nk, mp, ft, lt', sequence: 30, category: 'blends', isActive: true },
];

// School ID mapping
const SCHOOL_IDS: Record<string, string> = {
  'beijing-international': '00000000-0000-0000-0000-000000000001',
};

export default function SchoolEnglishPage() {
  const params = useParams();
  const slug = params.slug as string;
  const schoolId = SCHOOL_IDS[slug] || slug;
  
  const [works, setWorks] = useState<EnglishWork[]>(DEFAULT_WORKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'description' | 'code' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load works from database
  useEffect(() => {
    loadWorks();
  }, [schoolId]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId, editField]);

  const loadWorks = async () => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/english-works`);
      const data = await res.json();
      
      setIsDefault(data.is_default === true);
      
      if (data.works && data.works.length > 0) {
        // Map database fields to our format
        interface RawWork {
          id?: string;
          work_code?: string;
          code?: string;
          work_name?: string;
          name?: string;
          description?: string;
          sequence?: number;
          category?: string;
          is_active?: boolean;
        }
        const mappedWorks = data.works.map((w: RawWork) => ({
          id: w.id || w.work_code || w.code || '',
          code: w.work_code || w.code || '',
          name: w.work_name || w.name || '',
          description: w.description,
          sequence: w.sequence || 0,
          category: (w.category || 'other') as EnglishWork['category'],
          isActive: w.is_active !== false,
        }));
        setWorks(mappedWorks);
      }
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEditing = (work: EnglishWork, field: 'name' | 'description' | 'code') => {
    const value = field === 'name' ? work.name : field === 'description' ? (work.description || '') : work.code;
    setEditingId(work.id);
    setEditField(field);
    setEditValue(value);
    setOriginalValue(value);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingId || !editField || editValue === originalValue) {
      cancelEdit();
      return;
    }
    
    const work = works.find(w => w.id === editingId);
    if (!work) return;

    // Update local state immediately
    const updatedWorks = works.map(w => {
      if (w.id === editingId) {
        return {
          ...w,
          [editField]: editValue,
        };
      }
      return w;
    });
    setWorks(updatedWorks);

    // Clear editing state
    const savedField = editField;
    const savedValue = editValue;
    const savedSequence = work.sequence;
    const savedOldCode = work.code;
    setEditingId(null);
    setEditField(null);

    // Save to database - use sequence to find the work (most reliable)
    setSaving(true);
    try {
      interface UpdateData {
        sequence: number;
        name?: string;
        description?: string;
        code?: string;
        old_code?: string;
      }
      const updateData: UpdateData = { sequence: savedSequence };
      if (savedField === 'name') updateData.name = savedValue;
      if (savedField === 'description') updateData.description = savedValue;
      if (savedField === 'code') {
        updateData.code = savedValue;
        updateData.old_code = savedOldCode;
      }

      const res = await fetch(`/api/schools/${schoolId}/english-works`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (res.ok) {
        setSaveMessage('✓ Saved');
        setTimeout(() => setSaveMessage(null), 2000);
        // If we were using defaults, we need to save all works first
        if (isDefault) {
          await saveAllWorks(updatedWorks);
          setIsDefault(false);
        }
      } else {
        const err = await res.json();
        console.error('Save error:', err);
        setSaveMessage('⚠ Save failed');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('⚠ Save failed');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
    setOriginalValue('');
  };

  // Handle key press in edit input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

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

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    await saveAllWorks(works);
  };

  const toggleActive = async (id: string) => {
    const work = works.find(w => w.id === id);
    if (!work) return;
    
    const updatedWorks = works.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w);
    setWorks(updatedWorks);
    
    // Save to database
    setSaving(true);
    try {
      if (isDefault) {
        await saveAllWorks(updatedWorks);
        setIsDefault(false);
      } else {
        await fetch(`/api/schools/${schoolId}/english-works`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: work.sequence, is_active: !work.isActive }),
        });
      }
      setSaveMessage('✓ Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteWork = async (id: string) => {
    if (!confirm('Remove this work from the progression?')) return;
    
    const updatedWorks = works.filter(w => w.id !== id).map((w, i) => ({ ...w, sequence: i + 1 }));
    setWorks(updatedWorks);
    await saveAllWorks(updatedWorks);
  };

  const saveAllWorks = async (worksToSave: EnglishWork[] = works) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/english-works`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ works: worksToSave.map(w => ({
          code: w.code,
          name: w.name,
          description: w.description,
          category: w.category,
          is_active: w.isActive,
        })) }),
      });
      
      if (res.ok) {
        setSaveMessage('✓ Saved');
        setIsDefault(false);
        setTimeout(() => setSaveMessage(null), 2000);
      }
    } catch (error) {
      console.error('Save all failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Filter works
  const filteredWorks = filterCategory === 'all' 
    ? works 
    : works.filter(w => w.category === filterCategory);

  const activeCount = works.filter(w => w.isActive).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

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
              <p className="text-slate-400 text-sm">Click text to edit • Drag to reorder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('✓') ? 'text-green-400' : 'text-amber-400'}`}>
                {saveMessage}
              </span>
            )}
            {saving && (
              <span className="text-sm text-slate-400">Saving...</span>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-400 transition-colors text-sm"
            >
              + Add Work
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-amber-200 text-sm">
            <strong className="text-amber-400">✏️ Click to Edit:</strong> Click any code, name, or description to edit it inline. Press <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">Enter</kbd> to save, <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">Esc</kbd> to cancel. Changes sync to database instantly.
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
          {filteredWorks.map((work) => {
            const cat = CATEGORIES[work.category] || CATEGORIES.word_building;
            const actualIndex = works.findIndex(w => w.id === work.id);
            const isEditing = editingId === work.id;
            
            return (
              <div
                key={work.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDragEnd={handleDragEnd}
                className={`bg-slate-800 border rounded-xl p-4 transition-all ${
                  draggedIndex === actualIndex 
                    ? 'border-red-500 scale-[0.98] opacity-60 cursor-grabbing' 
                    : work.isActive 
                    ? 'border-slate-700 hover:border-slate-600' 
                    : 'border-slate-800 opacity-40'
                } ${isEditing ? '' : 'cursor-grab active:cursor-grabbing'}`}
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
                  
                  {/* Work Info - Editable */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Code - Editable */}
                      {isEditing && editField === 'code' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="font-mono font-bold text-amber-400 text-lg bg-slate-900 border-2 border-amber-500 rounded px-2 py-0.5 focus:outline-none w-36"
                        />
                      ) : (
                        <span 
                          onClick={() => startEditing(work, 'code')}
                          className="font-mono font-bold text-amber-400 text-lg cursor-text hover:bg-amber-500/20 rounded px-1 -mx-1 transition-colors"
                          title="Click to edit code"
                        >
                          {work.code}
                        </span>
                      )}
                      
                      {/* Name - Editable */}
                      {isEditing && editField === 'name' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="text-white font-medium bg-slate-900 border-2 border-teal-500 rounded px-2 py-0.5 focus:outline-none flex-1"
                        />
                      ) : (
                        <span 
                          onClick={() => startEditing(work, 'name')}
                          className="text-white font-medium truncate cursor-text hover:bg-teal-500/20 rounded px-1 -mx-1 transition-colors"
                          title="Click to edit name"
                        >
                          {work.name}
                        </span>
                      )}
                    </div>
                    
                    {/* Description - Editable */}
                    {isEditing && editField === 'description' ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        placeholder="Add description..."
                        className="text-sm text-slate-400 bg-slate-900 border-2 border-blue-500 rounded px-2 py-0.5 focus:outline-none w-full mt-1"
                      />
                    ) : (
                      <p 
                        onClick={() => startEditing(work, 'description')}
                        className={`text-sm truncate cursor-text hover:bg-blue-500/20 rounded px-1 -mx-1 mt-0.5 transition-colors ${
                          work.description ? 'text-slate-500' : 'text-slate-600 italic'
                        }`}
                        title="Click to edit description"
                      >
                        {work.description || 'Click to add description...'}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(work.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        work.isActive 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                      }`}
                    >
                      {work.isActive ? '✓ Active' : 'Hidden'}
                    </button>
                    
                    <button
                      onClick={() => deleteWork(work.id)}
                      className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                      title="Remove work"
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
      </main>

      {/* Add Work Modal */}
      {showAddModal && (
        <AddWorkModal 
          onClose={() => setShowAddModal(false)}
          onAdd={async (newWork) => {
            const updatedWorks = [...works, { ...newWork, sequence: works.length + 1, isActive: true }];
            setWorks(updatedWorks);
            setShowAddModal(false);
            await saveAllWorks(updatedWorks);
          }}
        />
      )}
    </div>
  );
}

// Add Work Modal Component
interface NewWork {
  id: string;
  code: string;
  name: string;
  description: string;
  category: EnglishWork['category'];
}

function AddWorkModal({ onClose, onAdd }: { onClose: () => void, onAdd: (work: NewWork) => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('word_building');

  const handleSubmit = () => {
    if (!code || !name) return;
    onAdd({
      id: code.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      code,
      name,
      description,
      category,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Add English Work</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Code *</label>
            <input 
              type="text" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., WBW/a/" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name *</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Word Building: Short A" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600"
            >
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., cat, hat, bat, mat" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code || !name}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Work
          </button>
        </div>
      </div>
    </div>
  );
}
