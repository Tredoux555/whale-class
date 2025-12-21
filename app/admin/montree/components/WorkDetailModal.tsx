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
      if (!res.ok) throw new Error('Failed to save');
      onUpdate();
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert('Failed to save. Please try again.');
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
      if (!res.ok) throw new Error('Failed to save');
      onUpdate();
    } catch (error) {
      console.error('Failed to perform action:', error);
      alert('Failed to save. Please try again.');
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

