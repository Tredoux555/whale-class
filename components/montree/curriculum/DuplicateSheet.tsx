// components/montree/curriculum/DuplicateSheet.tsx
// Bottom sheet showing detected duplicate works with merge controls.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';
import type { WorkCandidate, DuplicateGroup } from '@/lib/montree/curriculum/duplicate-detection';

interface Props {
  open: boolean;
  onClose: () => void;
  onConsolidated: () => void; // refresh curriculum after merge
}

export default function DuplicateSheet({ open, onClose, onConsolidated }: Props) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [totalWorks, setTotalWorks] = useState(0);
  const [selectedWinners, setSelectedWinners] = useState<Record<number, string>>({}); // groupIdx → winnerId
  const [merging, setMerging] = useState<number | null>(null); // groupIdx being merged
  const [mergedGroups, setMergedGroups] = useState<Set<number>>(new Set());

  const detect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await montreeApi('/api/montree/curriculum/duplicates');
      if (!res.ok) throw new Error('Detection failed');
      const data = await res.json();
      setGroups(data.groups || []);
      setTotalWorks(data.total_works || 0);
      // Pre-select the first (richest) work in each group as winner
      const defaults: Record<number, string> = {};
      (data.groups || []).forEach((g: DuplicateGroup, i: number) => {
        if (g.works.length > 0) defaults[i] = g.works[0].id;
      });
      setSelectedWinners(defaults);
    } catch (err) {
      toast.error('Failed to detect duplicates');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      detect();
      setMergedGroups(new Set());
    }
  }, [open, detect]);

  const handleMerge = async (groupIdx: number) => {
    const group = groups[groupIdx];
    const winnerId = selectedWinners[groupIdx];
    if (!winnerId) { toast.error('Select a winner first'); return; }

    const loserIds = group.works.filter(w => w.id !== winnerId).map(w => w.id);
    const winnerName = group.works.find(w => w.id === winnerId)?.name || '?';

    setMerging(groupIdx);
    try {
      const res = await montreeApi('/api/montree/curriculum/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winnerId, loser_ids: loserIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Merge failed');
      }
      const data = await res.json();
      toast.success(`Merged into "${winnerName}" — ${data.stats.media} photos, ${data.stats.progress} progress records moved`);
      setMergedGroups(prev => new Set([...prev, groupIdx]));
      onConsolidated();
    } catch (err: any) {
      toast.error(err.message || 'Merge failed');
    }
    setMerging(null);
  };

  const handleMergeAll = async () => {
    for (let i = 0; i < groups.length; i++) {
      if (mergedGroups.has(i)) continue;
      await handleMerge(i);
    }
  };

  if (!open) return null;

  const pendingGroups = groups.filter((_, i) => !mergedGroups.has(i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🔗 Find Duplicates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Scanning...' : `${totalWorks} works scanned`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {loading ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3 animate-pulse">🔍</div>
              <p className="text-gray-500 text-sm">Scanning {totalWorks || '...'} works for duplicates...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">✨</div>
              <p className="text-gray-700 font-medium">No duplicates found</p>
              <p className="text-gray-500 text-sm mt-1">All {totalWorks} works have unique names</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group, idx) => {
                const isMerged = mergedGroups.has(idx);
                const isMerging = merging === idx;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border ${isMerged ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'} overflow-hidden`}
                  >
                    {/* Group header */}
                    <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          group.score >= 95 ? 'bg-red-100 text-red-700' :
                          group.score >= 85 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {group.score}% match
                        </span>
                        <span className="text-xs text-gray-500">{group.reason}</span>
                      </div>
                      {isMerged && (
                        <span className="text-xs font-semibold text-green-600">✓ Merged</span>
                      )}
                    </div>

                    {/* Works in the group */}
                    <div className="p-3 space-y-2">
                      {group.works.map((work) => {
                        const isSelected = selectedWinners[idx] === work.id;
                        return (
                          <label
                            key={work.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isMerged ? 'opacity-60' :
                              isSelected ? 'bg-emerald-50 border border-emerald-300 shadow-sm' :
                              'bg-white border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`group-${idx}`}
                              checked={isSelected}
                              disabled={isMerged}
                              onChange={() => setSelectedWinners(prev => ({ ...prev, [idx]: work.id }))}
                              className="mt-1 accent-emerald-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 text-sm truncate">{work.name}</span>
                                {isSelected && !isMerged && (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">KEEP</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                                <span>📷 {work.media_count}</span>
                                <span>👤 {work.progress_count}</span>
                                {work.visual_memory_exists && <span>🧠 AI</span>}
                                {work.parent_description && <span>📝 desc</span>}
                                <span className="text-gray-400">
                                  {work.source === 'teacher_manual' ? 'manual' :
                                   work.source === 'photo_audit_resolve' ? 'photo audit' :
                                   work.source || 'unknown'}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Merge button per group */}
                    {!isMerged && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={() => handleMerge(idx)}
                          disabled={isMerging || !selectedWinners[idx]}
                          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors
                            bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                        >
                          {isMerging ? 'Merging...' : `Merge ${group.works.length} → 1`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && pendingGroups.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleMergeAll}
              disabled={merging !== null}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors
                bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {merging !== null ? 'Merging...' : `Merge All (${pendingGroups.length} group${pendingGroups.length === 1 ? '' : 's'})`}
            </button>
          </div>
        )}

        {groups.length > 0 && pendingGroups.length === 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-green-50 text-center">
            <p className="text-sm font-semibold text-green-700">All duplicates consolidated ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
