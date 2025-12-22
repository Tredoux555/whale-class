// app/admin/montree/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Child, ChildOverallProgress, STATUS_COLORS } from '@/lib/montree/types';
import ChildSelector from './components/ChildSelector';
import ProgressSummary from './components/ProgressSummary';
import CurriculumTree from './components/CurriculumTree';
import AddChildModal from './components/AddChildModal';

export default function MontreePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<ChildOverallProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchProgress(selectedChild.id);
    } else {
      setProgress(null);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/montree/children');
      const data = await res.json();
      const childrenArray = Array.isArray(data) ? data : [];
      setChildren(childrenArray);
      if (childrenArray.length > 0 && !selectedChild) {
        setSelectedChild(childrenArray[0]);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/progress/${childId}?summary=true`);
      if (!res.ok) {
        throw new Error(`Failed to fetch progress: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setProgress(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      setProgress(null);
    }
  };

  const handleChildAdded = (child: Child) => {
    setChildren(prev => [...prev, child]);
    setSelectedChild(child);
    setShowAddChild(false);
  };

  const handleProgressUpdate = () => {
    if (selectedChild) {
      fetchProgress(selectedChild.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading Montree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/montree/students"
              className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-3"
            >
              <div className="text-3xl">👶</div>
              <div>
                <div className="text-lg font-bold text-slate-800">All Students</div>
                <div className="text-xs text-slate-500">Quick view of all enrolled students</div>
              </div>
            </Link>
            <div className="border-l border-slate-300 h-12 mx-4"></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">🌳 Montree</h1>
              <p className="text-slate-500 text-sm">Montessori Progress Tracker</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ChildSelector
              children={children}
              selectedChild={selectedChild}
              onSelect={setSelectedChild}
            />
            <button
              onClick={() => setShowAddChild(true)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
            >
              + Add Child
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {!selectedChild ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Children Added Yet</h2>
            <p className="text-slate-600 mb-6">Add a child to start tracking their Montessori progress</p>
            <button
              onClick={() => setShowAddChild(true)}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-bold hover:bg-indigo-600"
            >
              + Add Your First Child
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <ProgressSummary 
                progress={progress} 
                childName={selectedChild.name}
              />
            </div>
            <div className="col-span-9">
              <CurriculumTree
                childId={selectedChild.id}
                progress={progress}
                onProgressUpdate={handleProgressUpdate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Progress Status</h4>
        <div className="space-y-2">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded"
                style={{ backgroundColor: colors.fill, border: `2px solid ${colors.border}` }}
              />
              <span className="text-sm" style={{ color: colors.text }}>{colors.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showAddChild && (
        <AddChildModal
          onClose={() => setShowAddChild(false)}
          onChildAdded={handleChildAdded}
        />
      )}
    </div>
  );
}
