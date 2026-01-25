'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ============================================
// MONTESSORI ENGLISH JOURNEY DATA
// ============================================

const ENGLISH_JOURNEY = [
  {
    id: 'oral',
    name: 'Oral Language',
    icon: '🗣️',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    description: 'Building vocabulary through immersion',
    skills: ['100+ word vocabulary', 'Understands instructions', 'Names common objects', 'Participates in songs'],
    ageRange: '2-3 years',
    learning: 'Building vocabulary through immersion. Children need 200-300 words before formal phonics begins.',
    home: 'Talk, talk, talk! Name everything. Read picture books. Sing English songs together.'
  },
  {
    id: 'sound',
    name: 'Sound Games',
    icon: '👂',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    description: 'Training the ear for phonemic awareness',
    skills: ['Beginning sounds', 'Ending sounds', 'Middle sounds', 'Sound blending', 'Sound segmenting'],
    ageRange: '3-4 years',
    learning: 'Training the ear to hear individual sounds in words. This phonemic awareness is the foundation of all reading.',
    home: 'Play "I Spy" with sounds: "I spy something that starts with /m/..." Make it a daily game!'
  },
  {
    id: 'sandpaper',
    name: 'Sandpaper Letters',
    icon: '✋',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    description: 'Connecting sounds to symbols through touch',
    skills: ['Traces letters correctly', 'Says sound after tracing', 'Knows consonants', 'Knows vowels', 'Knows phonograms (sh, ch, th)'],
    ageRange: '4-5 years',
    learning: 'Learning letter sounds through touch. Multi-sensory learning creates deep, lasting memory of letter-sound connections.',
    home: 'Practice letter sounds (not names!). Say "/m/" not "em". Trace letters in sand, salt, or shaving cream.'
  },
  {
    id: 'moveable',
    name: 'Moveable Alphabet',
    icon: '🔤',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    description: 'Building words before writing',
    skills: ['Builds CVC words', 'Spells from objects', 'Spells from pictures', 'Short phrases', 'Simple sentences'],
    ageRange: '4-5 years',
    learning: 'Building words with the moveable alphabet. This comes BEFORE reading in Montessori - children write before they read!',
    home: 'Play word-building games. "Can you spell CAT?" Use letter magnets on the fridge!'
  },
  {
    id: 'pink',
    name: 'Pink Series (CVC)',
    icon: '📕',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    description: 'Reading simple 3-letter words',
    skills: ['Short A words', 'Short E words', 'Short I words', 'Short O words', 'Short U words'],
    ageRange: '4-5 years',
    learning: 'Reading simple 3-letter words like "cat", "dog", and "pen". Your child is decoding words independently!',
    home: 'Read simple CVC books together. Point out words like "cat" and "hat" in everyday life.'
  },
  {
    id: 'blue',
    name: 'Blue Series (Blends)',
    icon: '📘',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    description: 'Reading consonant clusters',
    skills: ['Beginning blends (bl, cr, st)', 'Ending blends (nd, mp, lk)', 'CCVC words', 'CVCC words'],
    ageRange: '5-6 years',
    learning: 'Reading words with consonant blends like "stop", "frog", and "jump". Building reading fluency!',
    home: 'Read books with blend words. Practice "st-", "bl-", "cr-" sounds together.'
  },
  {
    id: 'green',
    name: 'Green Series (Phonograms)',
    icon: '📗',
    color: '#10B981',
    bgColor: '#ECFDF5',
    description: 'Reading vowel teams and digraphs',
    skills: ['ai/ay words', 'ee/ea words', 'oa/ow words', 'ou/ow words', 'r-controlled vowels'],
    ageRange: '5-6 years',
    learning: 'Mastering vowel teams and phonograms. This unlocks the ability to read most English words!',
    home: 'Point out vowel teams in books: "Look, this says /ee/ like in tree!"'
  },
  {
    id: 'grammar',
    name: 'Grammar',
    icon: '📐',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    description: 'Understanding how language works',
    skills: ['Nouns', 'Verbs', 'Adjectives', 'Articles', 'Sentence structure'],
    ageRange: '5-6 years',
    learning: 'Understanding how language works through experiential games with grammar symbols.',
    home: 'Play action games: "Jump! That\'s a VERB - a doing word!"'
  }
];

// ============================================
// TYPES
// ============================================

interface EnglishProgress {
  id?: string;
  current_stage: string;
  stage_progress: number;
  skills_completed: string[];
  notes: string | null;
}

interface Child {
  id: string;
  name: string;
  age_group?: string;
  photo_url?: string;
  english_progress: EnglishProgress;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnglishProgressPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/english-progress');
      const data = await res.json();
      if (data.children) {
        setChildren(data.children);
        setTableExists(data.tableExists !== false);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (child: Child) => {
    setSaving(true);
    try {
      const res = await fetch('/api/english-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          current_stage: child.english_progress.current_stage,
          stage_progress: child.english_progress.stage_progress,
          skills_completed: child.english_progress.skills_completed,
          notes: child.english_progress.notes
        })
      });
      
      if (res.ok) {
        // Update local state
        setChildren(prev => prev.map(c => c.id === child.id ? child : c));
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedChild = (updates: Partial<EnglishProgress>) => {
    if (!selectedChild) return;
    setSelectedChild({
      ...selectedChild,
      english_progress: {
        ...selectedChild.english_progress,
        ...updates
      }
    });
  };

  const toggleSkill = (skill: string) => {
    if (!selectedChild) return;
    const current = selectedChild.english_progress.skills_completed || [];
    const newSkills = current.includes(skill)
      ? current.filter(s => s !== skill)
      : [...current, skill];
    
    // Auto-calculate progress based on skills completed
    const stage = ENGLISH_JOURNEY.find(s => s.id === selectedChild.english_progress.current_stage);
    const progress = stage ? Math.round((newSkills.length / stage.skills.length) * 100) : 0;
    
    updateSelectedChild({ 
      skills_completed: newSkills,
      stage_progress: Math.min(progress, 100)
    });
  };

  const getStageIndex = (stageId: string) => ENGLISH_JOURNEY.findIndex(s => s.id === stageId);
  const getStage = (stageId: string) => ENGLISH_JOURNEY.find(s => s.id === stageId);

  const handlePrint = () => {
    window.print();
  };

  // ============================================
  // RENDER: LOADING STATE
  // ============================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading children...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: REPORT VIEW (for printing/showing parents)
  // ============================================
  
  if (showReport && selectedChild) {
    const stage = getStage(selectedChild.english_progress.current_stage);
    const stageIdx = getStageIndex(selectedChild.english_progress.current_stage);
    const nextStage = stageIdx < ENGLISH_JOURNEY.length - 1 ? ENGLISH_JOURNEY[stageIdx + 1] : null;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 print:bg-white">
        {/* Controls - hidden on print */}
        <div className="print:hidden sticky top-0 bg-white shadow-md p-4 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setShowReport(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              ← Back to Editor
            </button>
            <div className="flex gap-2">
              <select
                value={selectedChild.id}
                onChange={(e) => {
                  const child = children.find(c => c.id === e.target.value);
                  if (child) setSelectedChild(child);
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                🖨️ Print Report
              </button>
            </div>
          </div>
        </div>

        {/* The Report */}
        <div ref={printRef} className="max-w-4xl mx-auto p-6 print:p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 print:shadow-none print:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b-4" style={{ borderColor: stage?.color }}>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-800">{selectedChild.name}</h1>
                <p className="text-gray-500 text-lg">Montessori English Progress Report</p>
              </div>
              <div className="text-right">
                <div className="text-6xl">{stage?.icon}</div>
                <p className="text-lg font-bold mt-2" style={{ color: stage?.color }}>{stage?.name}</p>
              </div>
            </div>

            {/* Journey Visualization */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">The English Journey</h3>
              <div className="flex items-center justify-between relative py-6">
                {/* Progress line */}
                <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-200 -translate-y-1/2"></div>
                <div 
                  className="absolute top-1/2 left-8 h-1 -translate-y-1/2 transition-all"
                  style={{ 
                    width: `${(stageIdx / (ENGLISH_JOURNEY.length - 1)) * 100}%`,
                    maxWidth: 'calc(100% - 64px)',
                    backgroundColor: stage?.color 
                  }}
                ></div>
                
                {ENGLISH_JOURNEY.map((s, i) => {
                  const isCompleted = i < stageIdx;
                  const isCurrent = i === stageIdx;
                  return (
                    <div key={s.id} className={`flex flex-col items-center z-10 ${isCompleted || isCurrent ? '' : 'opacity-40'}`}>
                      <div 
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-4 ${
                          isCompleted ? 'border-green-500' : isCurrent ? '' : 'border-gray-200'
                        }`}
                        style={{ 
                          backgroundColor: s.bgColor,
                          borderColor: isCurrent ? s.color : undefined
                        }}
                      >
                        {isCompleted ? '✓' : s.icon}
                      </div>
                      <span className="text-xs mt-2 font-semibold" style={{ color: s.color }}>
                        {s.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Stage Details */}
            <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: stage?.bgColor }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: stage?.color }}>
                    Currently Working On: {stage?.name}
                  </h3>
                  <p className="text-gray-600 mt-1">{stage?.description}</p>
                </div>
                <div className="text-4xl font-extrabold" style={{ color: stage?.color }}>
                  {selectedChild.english_progress.stage_progress}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-4 bg-white/50 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${selectedChild.english_progress.stage_progress}%`,
                    backgroundColor: stage?.color 
                  }}
                ></div>
              </div>

              {/* Skills Checklist */}
              <div className="grid grid-cols-2 gap-3">
                {stage?.skills.map(skill => {
                  const completed = selectedChild.english_progress.skills_completed?.includes(skill);
                  return (
                    <div key={skill} className={`flex items-center gap-2 ${completed ? 'text-green-700' : 'text-gray-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                        completed ? 'bg-green-500 text-white' : 'bg-white'
                      }`}>
                        {completed ? '✓' : '○'}
                      </span>
                      <span className="text-sm">{skill}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips for Parents */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-5">
                <h4 className="font-bold text-blue-800 mb-2 text-lg">🎯 What We're Learning</h4>
                <p className="text-blue-700">{stage?.learning}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5">
                <h4 className="font-bold text-green-800 mb-2 text-lg">🏠 Support at Home</h4>
                <p className="text-green-700">{stage?.home}</p>
              </div>
            </div>

            {/* Next Steps */}
            {nextStage && (
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <h4 className="font-bold text-gray-700 mb-1 text-lg">⏭️ Coming Up Next: {nextStage.name}</h4>
                <p className="text-gray-600">{nextStage.description}</p>
              </div>
            )}

            {/* Teacher Notes */}
            {selectedChild.english_progress.notes && (
              <div className="bg-amber-50 rounded-xl p-5 mb-6">
                <h4 className="font-bold text-amber-800 mb-2">📝 Teacher's Notes</h4>
                <p className="text-amber-700">{selectedChild.english_progress.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center text-sm text-gray-400">
              <p className="font-semibold">Beijing International School • Whale Class • {new Date().toLocaleDateString()}</p>
              <p className="mt-1">Following authentic Montessori language progression for ESL learners</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: EDIT MODE
  // ============================================
  
  if (editMode && selectedChild) {
    const stage = getStage(selectedChild.english_progress.current_stage);
    
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditMode(false); setSelectedChild(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-800">Edit: {selectedChild.name}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReport(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
              >
                👁️ Preview Report
              </button>
              <button
                onClick={() => saveProgress(selectedChild)}
                disabled={saving}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4">
          {/* Current Stage Selector */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Current Stage</h2>
            <div className="grid grid-cols-4 gap-2">
              {ENGLISH_JOURNEY.map(s => (
                <button
                  key={s.id}
                  onClick={() => updateSelectedChild({ 
                    current_stage: s.id, 
                    skills_completed: [],
                    stage_progress: 0 
                  })}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedChild.english_progress.current_stage === s.id 
                      ? 'ring-4 ring-offset-2' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: s.bgColor,
                    ringColor: s.color
                  }}
                >
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: s.color }}>{s.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Skills Checklist */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Skills Completed</h2>
            <p className="text-gray-500 text-sm mb-4">Tap to toggle. Progress auto-calculates based on skills.</p>
            
            <div className="space-y-2">
              {stage?.skills.map(skill => {
                const completed = selectedChild.english_progress.skills_completed?.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      completed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      completed ? 'bg-green-500 text-white' : 'bg-gray-200'
                    }`}>
                      {completed ? '✓' : '○'}
                    </span>
                    <span className="font-medium">{skill}</span>
                  </button>
                );
              })}
            </div>

            {/* Progress Display */}
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: stage?.bgColor }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold" style={{ color: stage?.color }}>Stage Progress</span>
                <span className="text-2xl font-bold" style={{ color: stage?.color }}>
                  {selectedChild.english_progress.stage_progress}%
                </span>
              </div>
              <div className="w-full h-3 bg-white/50 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${selectedChild.english_progress.stage_progress}%`,
                    backgroundColor: stage?.color 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Teacher Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Teacher Notes (optional)</h2>
            <textarea
              value={selectedChild.english_progress.notes || ''}
              onChange={(e) => updateSelectedChild({ notes: e.target.value })}
              placeholder="Add any notes about this child's English progress..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN LIST VIEW
  // ============================================
  
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold">English Progress</h1>
                <p className="text-blue-100">Montessori Language Journey Reports</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Database Warning */}
      {!tableExists && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-amber-800">⚠️ Database Setup Required</h3>
            <p className="text-amber-700 text-sm mt-1">
              Run the migration file <code className="bg-amber-100 px-1 rounded">migrations/020_english_progress.sql</code> in Supabase to enable saving.
            </p>
          </div>
        </div>
      )}

      {/* Children Grid */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(child => {
            const stage = getStage(child.english_progress.current_stage);
            return (
              <div
                key={child.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedChild(child); setEditMode(true); }}
              >
                {/* Colored top bar */}
                <div className="h-2" style={{ backgroundColor: stage?.color }}></div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{child.name}</h3>
                      <p className="text-sm text-gray-500">{child.age_group || 'Age not set'}</p>
                    </div>
                    <div className="text-3xl">{stage?.icon}</div>
                  </div>
                  
                  {/* Stage info */}
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: stage?.bgColor }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: stage?.color }}>
                        {stage?.name}
                      </span>
                      <span className="text-lg font-bold" style={{ color: stage?.color }}>
                        {child.english_progress.stage_progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${child.english_progress.stage_progress}%`,
                          backgroundColor: stage?.color 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedChild(child); 
                        setEditMode(true); 
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedChild(child); 
                        setShowReport(true); 
                      }}
                      className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition"
                    >
                      📄 Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {children.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-xl font-bold text-gray-700">No Children Found</h2>
            <p className="text-gray-500 mt-2">Add children to the database to track their English progress.</p>
          </div>
        )}
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
// Trigger deploy Sun Jan  4 16:09:23 CST 2026
