'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getClassroomId } from '@/lib/montree/auth';

const AREAS = [
  { key: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#4CAF50' },
  { key: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#2196F3' },
  { key: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#FF9800' },
  { key: 'language', name: 'Language', icon: '📖', color: '#E91E63' },
  { key: 'cultural', name: 'Cultural', icon: '🌍', color: '#9C27B0' },
];

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  work_key?: string;
  parent_description?: string;
  why_it_matters?: string;
  description?: string;
  sequence?: number;
  area_id?: string;
}

export default function DescriptionReviewPage() {
  const [selectedArea, setSelectedArea] = useState(AREAS[0]);
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedWhyItMatters, setEditedWhyItMatters] = useState('');
  const [saving, setSaving] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const selectedWork = works[selectedIndex];
  const isCustomWork = selectedWork?.work_key?.startsWith('custom_');

  // Load works for selected area
  useEffect(() => {
    async function loadWorks() {
      setLoading(true);
      try {
        const classroomId = getClassroomId();
        if (!classroomId) return;

        const res = await fetch(`/api/montree/curriculum?classroom_id=${classroomId}`);
        const data = await res.json();

        // Filter works by area
        const areaWorks = (data.byArea?.[selectedArea.key] || [])
          .sort((a: Work, b: Work) => (a.sequence || 0) - (b.sequence || 0));

        setWorks(areaWorks);
        setSelectedIndex(0);

        // Scroll to top
        if (wheelRef.current) {
          wheelRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch (err) {
        console.error('Failed to load works:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorks();
  }, [selectedArea]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (wheelRef.current && works.length > 0) {
      const itemHeight = 64;
      const scrollTop = wheelRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, works.length - 1));

      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
        setEditMode(false);
        if (navigator.vibrate) navigator.vibrate(5);
      }
    }
  }, [selectedIndex, works.length]);

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (wheelRef.current) {
      const itemHeight = 64;
      wheelRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  // Generate description for custom work
  const handleGenerate = async () => {
    if (!selectedWork) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/montree/curriculum/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_name: selectedWork.name,
          area: selectedArea.key,
        }),
      });
      const data = await res.json();

      if (data.description) {
        setEditedDescription(data.description);
        setEditedWhyItMatters(data.why_it_matters || '');
        setEditMode(true);
      }
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Save edited description
  const handleSave = async () => {
    if (!selectedWork) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: selectedWork.id,
          parent_description: editedDescription,
          why_it_matters: editedWhyItMatters,
        }),
      });

      if (res.ok) {
        // Update local state
        setWorks(prev => prev.map(w =>
          w.id === selectedWork.id
            ? { ...w, parent_description: editedDescription, why_it_matters: editedWhyItMatters }
            : w
        ));
        setEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const handleStartEdit = () => {
    if (selectedWork) {
      setEditedDescription(selectedWork.parent_description || selectedWork.description || '');
      setEditedWhyItMatters(selectedWork.why_it_matters || '');
      setEditMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-slate-600">
              ← Back
            </Link>
            <h1 className="text-lg font-semibold">Work Description Review</h1>
          </div>
          <div className="text-sm text-slate-500">
            {works.length} works in {selectedArea.name}
          </div>
        </div>

        {/* Area Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          {AREAS.map(area => (
            <button
              key={area.key}
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedArea.key === area.key
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={selectedArea.key === area.key ? { backgroundColor: area.color } : {}}
            >
              {area.icon} {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-140px)]">
          {/* Left: Work Wheel */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
              <span className="font-medium" style={{ color: selectedArea.color }}>
                {selectedArea.icon} {selectedArea.name} Works
              </span>
              <span className="text-sm text-slate-400">
                {selectedIndex + 1} / {works.length}
              </span>
            </div>

            {/* Wheel Container */}
            <div className="relative flex-1 overflow-hidden">
              {/* Selection highlight */}
              <div
                className="absolute left-0 right-0 h-16 pointer-events-none z-10 border-y-2"
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderColor: selectedArea.color,
                  backgroundColor: `${selectedArea.color}10`
                }}
              />

              {/* Gradient overlays */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

              {/* Scrollable wheel */}
              <div
                ref={wheelRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory"
                style={{
                  scrollSnapType: 'y mandatory',
                  paddingTop: 'calc(50% - 32px)',
                  paddingBottom: 'calc(50% - 32px)',
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                  </div>
                ) : works.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">No works in this area</div>
                ) : (
                  works.map((work, idx) => {
                    const distance = Math.abs(idx - selectedIndex);
                    const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
                    const scale = distance === 0 ? 1 : 0.95;
                    const isCustom = work.work_key?.startsWith('custom_');
                    const hasDescription = !!(work.parent_description || work.description);

                    return (
                      <div
                        key={work.id}
                        onClick={() => scrollToIndex(idx)}
                        className="h-16 flex items-center px-4 cursor-pointer snap-center transition-all"
                        style={{ opacity, transform: `scale(${scale})` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">{idx + 1}.</span>
                            <span className={`font-medium truncate ${!hasDescription ? 'text-amber-600' : ''}`}>
                              {work.name}
                            </span>
                            {isCustom && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          {work.name_chinese && (
                            <div className="text-xs text-slate-400 truncate">{work.name_chinese}</div>
                          )}
                        </div>
                        {hasDescription ? (
                          <span className="text-green-500 text-lg">✓</span>
                        ) : (
                          <span className="text-amber-400 text-lg">○</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Description Panel */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
              <span className="font-medium">Description</span>
              {selectedWork && !editMode && (
                <button
                  onClick={handleStartEdit}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedWork ? (
                <div className="text-center text-slate-400 py-8">Select a work to view its description</div>
              ) : editMode ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Parent Description
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe what the child is learning..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Why It Matters
                    </label>
                    <textarea
                      value={editedWhyItMatters}
                      onChange={(e) => setEditedWhyItMatters(e.target.value)}
                      rows={3}
                      className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explain why this work is important..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '✓ Save Description'}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{selectedWork.name}</h3>
                    {selectedWork.name_chinese && (
                      <p className="text-sm text-slate-500">{selectedWork.name_chinese}</p>
                    )}
                    {isCustomWork && (
                      <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                        Custom Work
                      </span>
                    )}
                  </div>

                  {selectedWork.parent_description || selectedWork.description ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">What Parents See</h4>
                        <p className="text-slate-700 leading-relaxed">
                          {selectedWork.parent_description || selectedWork.description}
                        </p>
                      </div>

                      {selectedWork.why_it_matters && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-amber-700 mb-1">💡 Why It Matters</h4>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            {selectedWork.why_it_matters}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <div className="text-amber-600 text-3xl mb-2">⚠️</div>
                      <p className="text-amber-800 font-medium mb-1">No Description</p>
                      <p className="text-sm text-amber-700 mb-3">
                        This work doesn't have a parent-friendly description yet.
                      </p>
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                      >
                        {generating ? 'Generating...' : '✨ Generate Description'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
