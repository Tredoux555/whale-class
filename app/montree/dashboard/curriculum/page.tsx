'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import AddWorkModal from '@/components/montree/AddWorkModal';
import EditWorkModal from '@/components/montree/curriculum/EditWorkModal';
import TeachingToolsSection from '@/components/montree/curriculum/TeachingToolsSection';
import CurriculumWorkList from '@/components/montree/curriculum/CurriculumWorkList';
import { Work, AREA_ICONS, AREA_COLORS } from '@/components/montree/curriculum/types';
import { useCurriculumDragDrop } from '@/hooks/useCurriculumDragDrop';

export default function CurriculumPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [byArea, setByArea] = useState<Record<string, Work[]>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  // Edit modal state
  const [editingWork, setEditingWork] = useState<Work | null>(null);

  // Add work modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Drag-drop hook
  const {
    draggedWork,
    dragOverId,
    reordering,
    scrollContainerRef,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    startAutoScroll,
    stopAutoScroll,
  } = useCurriculumDragDrop({
    selectedArea,
    byArea,
    setByArea,
    session,
    fetchCurriculum,
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
    if (!confirm('This will import the master Montessori curriculum (268 works). Your classroom will have its own copy to customize. Continue?')) return;
    
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


  // Delete work from curriculum
  const deleteWork = async (work: Work) => {
    if (!confirm(`Delete "${work.name}" from curriculum?\n\nThis cannot be undone.`)) return;

    try {
      const res = await fetch('/api/montree/curriculum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: work.id,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Work deleted');
        fetchCurriculum();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete');
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
            {curriculum.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
              >
                <span className="text-lg">➕</span>
                <span className="hidden sm:inline">Add Work</span>
              </button>
            )}
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

            {/* Teaching Tools Section */}
            <TeachingToolsSection />

            {/* Selected Area Works */}
            {selectedArea && byArea[selectedArea] && (
              <CurriculumWorkList
                selectedArea={selectedArea}
                works={byArea[selectedArea]}
                expandedWork={expandedWork}
                setExpandedWork={setExpandedWork}
                onEditWork={setEditingWork}
                onDeleteWork={deleteWork}
                reordering={reordering}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                draggedWork={draggedWork}
                dragOverId={dragOverId}
                scrollContainerRef={scrollContainerRef}
                startAutoScroll={startAutoScroll}
                stopAutoScroll={stopAutoScroll}
              />
            )}
          </>
        )}
      </main>

      {/* EDIT MODAL */}
      <EditWorkModal
        editingWork={editingWork}
        onClose={() => setEditingWork(null)}
        onSaved={fetchCurriculum}
        selectedArea={selectedArea || undefined}
      />

      {/* ADD WORK MODAL */}
      {session?.classroom?.id && (
        <AddWorkModal
          classroomId={session.classroom.id}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchCurriculum}
          defaultArea={selectedArea || undefined}
        />
      )}

      {/* Floating Add Button (mobile) */}
      {curriculum.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-2xl z-30 sm:hidden active:scale-95"
        >
          ➕
        </button>
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
