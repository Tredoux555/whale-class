'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

interface Work {
  id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  description?: string;
  area_id: string;
  age_range?: string;
  is_active: boolean;
  direct_aims?: string[];
  indirect_aims?: string[];
  readiness_indicators?: string[];
  materials_needed?: string[];
  parent_explanation?: string;
  why_it_matters?: string;
  difficulty_level?: string;
  is_gateway?: boolean;
  sub_area?: string;
  primary_skills?: string[];
  teacher_notes?: string;
  // Quick Guide for teachers
  quick_guide?: string;
  video_search_term?: string;
}

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-green-400 to-emerald-500',
  sensorial: 'from-orange-400 to-amber-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-pink-400 to-rose-500',
  cultural: 'from-purple-400 to-violet-500'
};

export default function CurriculumPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [byArea, setByArea] = useState<Record<string, Work[]>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Edit modal state
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    name_chinese: '',
    description: '',
    age_range: '',
    direct_aims: '',
    indirect_aims: '',
    materials: '',
    teacher_notes: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) { router.push('/montree/login'); return; }
    try { setSession(JSON.parse(stored)); } 
    catch { router.push('/montree/login'); }
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) return;
    fetchCurriculum();
  }, [session?.classroom?.id]);

  const fetchCurriculum = async () => {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/curriculum?classroom_id=${session.classroom.id}`);
      const data = await res.json();
      setCurriculum(data.curriculum || []);
      setByArea(data.byArea || {});
    } catch (err) {
      toast.error('Failed to load curriculum');
    }
    setLoading(false);
  };

  const handleImportCurriculum = async () => {
    if (!session?.classroom?.id) return;
    if (!confirm('This will import the master Montessori curriculum (220 works). Your classroom will have its own copy to customize. Continue?')) return;
    
    setImporting(true);
    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          classroom_id: session.classroom.id, 
          action: 'seed_from_brain'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.seeded} works! This is now your classroom's curriculum.`);
        fetchCurriculum();
      } else {
        toast.error(data.error || 'Failed to import');
      }
    } catch (err) {
      toast.error('Failed to import curriculum');
    }
    setImporting(false);
  };

  // Open edit modal
  const openEditModal = (work: Work) => {
    setEditingWork(work);
    setEditForm({
      name: work.name || '',
      name_chinese: work.name_chinese || '',
      description: work.parent_explanation || work.description || '',
      age_range: work.age_range || '3-6',
      direct_aims: (work.direct_aims || []).join('\n'),
      indirect_aims: (work.indirect_aims || []).join('\n'),
      materials: (work.materials_needed || []).join('\n'),
      teacher_notes: work.teacher_notes || '',
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingWork) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: editingWork.id,
          name: editForm.name,
          name_chinese: editForm.name_chinese,
          description: editForm.description,
          age_range: editForm.age_range,
          direct_aims: editForm.direct_aims.split('\n').filter(s => s.trim()),
          indirect_aims: editForm.indirect_aims.split('\n').filter(s => s.trim()),
          materials: editForm.materials.split('\n').filter(s => s.trim()),
          teacher_notes: editForm.teacher_notes,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Work updated!');
        setEditingWork(null);
        fetchCurriculum();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save changes');
    }
    setSaving(false);
  };

  // Toggle work active/inactive
  const toggleWorkActive = async (work: Work) => {
    try {
      const res = await fetch('/api/montree/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: work.id,
          is_active: !work.is_active,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(work.is_active ? 'Work hidden' : 'Work restored');
        fetchCurriculum();
      }
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">📚</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 pb-24">
      <Toaster position="top-center" richColors />
      
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/montree/dashboard')} 
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">←</button>
              <div>
                <h1 className="text-xl font-bold">Curriculum</h1>
                <p className="text-emerald-100 text-sm">{curriculum.length} works available</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {curriculum.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <span className="text-5xl mb-4 block">📚</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Curriculum Yet</h2>
            <p className="text-gray-500 mb-6">Import the master Montessori curriculum to get started. Once imported, it belongs to your classroom and you can customize it.</p>
            <button onClick={handleImportCurriculum} disabled={importing}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold 
                shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {importing ? 'Importing...' : '📥 Import Master Curriculum'}
            </button>
          </div>
        ) : (
          <>
            {/* Import/Re-import button */}
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">Tap a work to see details. Tap ✏️ to edit.</p>
              <button onClick={handleImportCurriculum} disabled={importing}
                className="text-sm px-4 py-2 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 disabled:opacity-50">
                {importing ? 'Importing...' : '📥 Re-import Master'}
              </button>
            </div>
            
            {/* Area Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(byArea).map(([area, works]) => (
                <button key={area} onClick={() => setSelectedArea(selectedArea === area ? null : area)}
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all text-left
                    ${selectedArea === area ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AREA_COLORS[area] || 'from-gray-400 to-gray-500'} 
                    flex items-center justify-center text-2xl mb-2`}>
                    {AREA_ICONS[area] || '📖'}
                  </div>
                  <p className="font-semibold text-gray-800 capitalize">{area.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{works.length} works</p>
                </button>
              ))}
            </div>

            {/* Selected Area Works */}
            {selectedArea && byArea[selectedArea] && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 capitalize flex items-center gap-2">
                  {AREA_ICONS[selectedArea]} {selectedArea.replace('_', ' ')}
                </h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {byArea[selectedArea].map(work => {
                    const isExpanded = expandedWork === work.id;
                    return (
                      <div key={work.id} className={`bg-gray-50 rounded-xl overflow-hidden ${!work.is_active ? 'opacity-50' : ''}`}>
                        {/* Work Header */}
                        <div className="flex items-center gap-2 p-3">
                          <button 
                            onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                            className="flex-1 flex items-center gap-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800">{work.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {work.is_gateway && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Gateway</span>}
                              <span className="text-xs text-gray-400">{work.age_range || '3-6'}</span>
                              <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                          </button>
                          {/* Edit button */}
                          <button onClick={() => openEditModal(work)} 
                            className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200">
                            ✏️
                          </button>
                          {/* Hide/Show button */}
                          <button onClick={() => toggleWorkActive(work)} 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${work.is_active ? 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
                            {work.is_active ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
                            {/* QUICK GUIDE - Most important for teachers */}
                            {work.quick_guide && (
                              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-bold text-amber-800 flex items-center gap-2">
                                    ⚡ Quick Guide
                                  </p>
                                  {work.video_search_term && (
                                    <a 
                                      href={`https://youtube.com/results?search_query=${encodeURIComponent(work.video_search_term)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                      🎬 Watch Video
                                    </a>
                                  )}
                                </div>
                                <div className="text-sm text-amber-900 space-y-1">
                                  {work.quick_guide.split('\n').map((line, i) => (
                                    <p key={i} className="leading-relaxed">{line}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Video button if no quick guide but has video */}
                            {!work.quick_guide && work.video_search_term && (
                              <a 
                                href={`https://youtube.com/results?search_query=${encodeURIComponent(work.video_search_term)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                              >
                                🎬 Watch Presentation Video
                              </a>
                            )}
                            
                            {/* Teacher Notes (if any) */}
                            {work.teacher_notes && (
                              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                <p className="font-semibold text-yellow-700 text-xs mb-1">📝 Teacher Notes</p>
                                <p className="text-sm text-yellow-800">{work.teacher_notes}</p>
                              </div>
                            )}
                            
                            {/* Parent Explanation */}
                            {work.parent_explanation && (
                              <div className="bg-emerald-50 p-3 rounded-lg">
                                <p className="text-sm text-emerald-800">{work.parent_explanation}</p>
                              </div>
                            )}
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              {work.direct_aims?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🎯 Direct Aims</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.direct_aims.map((aim: string, i: number) => (
                                      <li key={i} className="text-xs">• {aim}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {work.indirect_aims?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🌱 Indirect Aims</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.indirect_aims.map((aim: string, i: number) => (
                                      <li key={i} className="text-xs">• {aim}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {work.readiness_indicators?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">✅ Readiness Signs</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.readiness_indicators.map((item: string, i: number) => (
                                      <li key={i} className="text-xs">• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {work.materials_needed?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🧰 Materials</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.materials_needed.map((item: string, i: number) => (
                                      <li key={i} className="text-xs">• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {work.why_it_matters && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="font-semibold text-blue-700 text-xs mb-1">💡 Why It Matters</p>
                                <p className="text-sm text-blue-800">{work.why_it_matters}</p>
                              </div>
                            )}
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {work.difficulty_level && (
                                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                                  {work.difficulty_level}
                                </span>
                              )}
                              {work.sub_area && (
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full capitalize">
                                  {work.sub_area.replace('_', ' ')}
                                </span>
                              )}
                              {work.primary_skills?.slice(0, 3).map((skill: string, i: number) => (
                                <span key={i} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                  {skill.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* EDIT MODAL */}
      {editingWork && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingWork(null)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Edit Work</h3>
                <button onClick={() => setEditingWork(null)} className="text-white/80 hover:text-white text-2xl">×</button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              
              {/* Chinese Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Name</label>
                <input type="text" value={editForm.name_chinese} onChange={e => setEditForm({...editForm, name_chinese: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              
              {/* Age Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
                <input type="text" value={editForm.age_range} onChange={e => setEditForm({...editForm, age_range: e.target.value})}
                  placeholder="e.g. 3-6" className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (for parents)</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>
              
              {/* Direct Aims */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Direct Aims (one per line)</label>
                <textarea value={editForm.direct_aims} onChange={e => setEditForm({...editForm, direct_aims: e.target.value})}
                  rows={3} placeholder="Control of movement&#10;Balance" 
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" />
              </div>
              
              {/* Indirect Aims */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🌱 Indirect Aims (one per line)</label>
                <textarea value={editForm.indirect_aims} onChange={e => setEditForm({...editForm, indirect_aims: e.target.value})}
                  rows={3} placeholder="Concentration&#10;Independence" 
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" />
              </div>
              
              {/* Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🧰 Materials (one per line)</label>
                <textarea value={editForm.materials} onChange={e => setEditForm({...editForm, materials: e.target.value})}
                  rows={3} placeholder="Pink Tower cubes&#10;Work mat" 
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" />
              </div>
              
              {/* Teacher Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📝 Teacher Notes (private)</label>
                <textarea value={editForm.teacher_notes} onChange={e => setEditForm({...editForm, teacher_notes: e.target.value})}
                  rows={3} placeholder="Notes for yourself about this work..."
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm bg-yellow-50" />
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setEditingWork(null)} 
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <button onClick={() => router.push('/montree/dashboard')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">🏠</span><span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center text-emerald-600">
            <span className="text-xl">📚</span><span className="text-xs font-medium">Curriculum</span>
          </button>
          <button onClick={() => router.push('/montree/dashboard/progress')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📊</span><span className="text-xs">Progress</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
