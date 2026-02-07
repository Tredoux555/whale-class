// app/admin/montree/components/WorkDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Work, ChildProgress, WorkStatus, STATUS_COLORS } from '@/lib/montree/types';
import { getWorkById } from '@/lib/montree/curriculum-data';

interface Props {
  childId: string;
  areaId: string;
  categoryId: string;
  workId: string;
  currentProgress?: ChildProgress;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WorkDetailModal({
  childId, areaId, categoryId, workId, currentProgress, onClose, onUpdate,
}: Props) {
  const [work, setWork] = useState<Work | null>(null);
  const [status, setStatus] = useState<WorkStatus>(currentProgress?.status || 'not_started');
  const [currentLevel, setCurrentLevel] = useState(currentProgress?.currentLevel || 0);
  const [notes, setNotes] = useState(currentProgress?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const workData = getWorkById(workId);
    setWork(workData);
  }, [workId]);

  const handleStatusChange = (newStatus: WorkStatus) => {
    setStatus(newStatus);
    if (newStatus === 'in_progress' && currentLevel === 0) setCurrentLevel(1);
    else if (newStatus === 'completed' && work) setCurrentLevel(work.levels.length);
    else if (newStatus === 'not_started') setCurrentLevel(0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/montree/progress/${childId}/${workId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', status, currentLevel, notes }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Failed to save: ${res.statusText}`);
      }
      const data = await res.json();
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to save progress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save. Please try again.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (action: 'start' | 'complete' | 'reset') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/montree/progress/${childId}/${workId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          currentLevel: action === 'complete' ? work?.levels.length || 1 : undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Failed to save: ${res.statusText}`);
      }
      const data = await res.json();
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to perform action:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save. Please try again.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!work) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b" style={{ backgroundColor: statusColor.fill }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{work.name}</h2>
              {work.chineseName && <p className="text-slate-600">{work.chineseName}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-xl">✕</button>
          </div>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: statusColor.border, color: 'white' }}>
            {status === 'completed' && '✓ '}{status === 'in_progress' && '▶ '}{statusColor.label}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Description</h3>
            <p className="text-slate-600">{work.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Age Range</div>
              <div className="font-bold text-slate-800">{work.ageRange} years</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Levels</div>
              <div className="font-bold text-slate-800">{work.levels.length}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Current Level</div>
              <div className="font-bold text-slate-800">{currentLevel} / {work.levels.length}</div>
            </div>
          </div>

          {work.materials.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Materials Needed</h3>
              <ul className="list-disc list-inside text-slate-600">
                {work.materials.map((material, i) => <li key={i}>{material}</li>)}
              </ul>
            </div>
          )}

          {/* VIDEO LINK - NEW SECTION */}
          {(() => {
            // Extract all videoSearchTerms from levels (they're stored in levels, not on work directly)
            interface Level {
              videoSearchTerms?: string[];
            }
            const allVideoTerms: string[] = [];
            work.levels.forEach((level: Level) => {
              if (level.videoSearchTerms && Array.isArray(level.videoSearchTerms)) {
                allVideoTerms.push(...level.videoSearchTerms);
              }
            });
            // Also check if work has videoSearchTerms directly (for backward compatibility)
            if (work.videoSearchTerms && Array.isArray(work.videoSearchTerms)) {
              allVideoTerms.push(...work.videoSearchTerms);
            }
            // Remove duplicates
            const uniqueTerms = Array.from(new Set(allVideoTerms));
            
            if (uniqueTerms.length > 0) {
              return (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🎬</span>
                    Video Reference
                  </h3>
                  <div className="space-y-2">
                    {uniqueTerms.map((term, index) => (
                      <a
                        key={index}
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(term + ' montessori')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors group"
                      >
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-green-700 group-hover:text-green-800 truncate">
                            Watch: {term}
                          </p>
                          <p className="text-xs text-green-500">
                            Opens YouTube search
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-green-400 group-hover:text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Levels / Progressions</h3>
            <div className="space-y-2">
              {work.levels.map((level) => (
                <button
                  key={level.level}
                  onClick={() => {
                    setCurrentLevel(level.level);
                    if (status === 'not_started') setStatus('in_progress');
                  }}
                  className={`w-full p-3 rounded-lg text-left border-2 ${
                    level.level <= currentLevel ? 'bg-green-50 border-green-300'
                      : level.level === currentLevel + 1 ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      level.level <= currentLevel ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {level.level <= currentLevel ? '✓' : level.level}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{level.name}</div>
                      <div className="text-sm text-slate-500">{level.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Update Status</h3>
            <div className="flex gap-2">
              {(['not_started', 'in_progress', 'completed'] as WorkStatus[]).map((s) => {
                const color = STATUS_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex-1 p-3 rounded-lg font-medium border-2 ${status === s ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                    style={{ backgroundColor: color.fill, borderColor: color.border, color: color.text }}
                  >
                    {color.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this child's progress..."
              className="w-full p-3 border border-slate-200 rounded-lg resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex gap-3">
          {status === 'not_started' && (
            <button onClick={() => handleQuickAction('start')} disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50">
              ▶ Start This Work
            </button>
          )}
          {status === 'in_progress' && (
            <button onClick={() => handleQuickAction('complete')} disabled={saving}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50">
              ✓ Mark Complete
            </button>
          )}
          {status !== 'not_started' && (
            <button onClick={() => handleQuickAction('reset')} disabled={saving}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50">
              Reset
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

