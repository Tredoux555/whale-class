'use client';

// components/montree/ShelfAutopilotCard.tsx
// Dashboard card for Shelf Autopilot — AI-powered shelf management
// Generates next-work proposals per child using pure sequencer engine (zero AI cost)
// Teacher reviews per-child proposals and applies selectively

import { useState, useCallback, useRef, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

// ---- Types ----

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

interface ShelfProposal {
  area: string;
  current_work: string | null;
  current_work_status: string | null;
  proposed_work: string;
  proposed_work_key: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  prerequisites_met: string[];
  category: string;
}

interface ChildResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];
  areas_stable: string[];
  summary: string;
  error?: string;
}

type CardState = 'idle' | 'generating' | 'results' | 'applying';

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Science & Culture',
};

const AREA_COLORS: Record<string, string> = {
  practical_life: '#10B981', // emerald
  sensorial: '#F59E0B',     // amber
  mathematics: '#3B82F6',   // blue
  language: '#EC4899',      // pink
  cultural: '#8B5CF6',      // violet
};

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'High' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
};

// ---- Component ----

export default function ShelfAutopilotCard({ classroomId, children }: Props) {
  const { t } = useI18n();

  const [state, setState] = useState<CardState>('idle');
  const [results, setResults] = useState<ChildResult[]>([]);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [appliedProposals, setAppliedProposals] = useState<Set<string>>(new Set());
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [stats, setStats] = useState({ withProposals: 0, stable: 0, errored: 0, totalProposals: 0 });
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ---- Generate Proposals ----

  const handleGenerate = useCallback(async () => {
    if (children.length === 0) return;

    setState('generating');
    setResults([]);
    setAppliedProposals(new Set());
    setExpandedChild(null);

    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
        }),
        signal: abortRef.current?.signal,
        timeout: 60000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.generateError'));
        setState('idle');
        return;
      }

      const childResults: ChildResult[] = data.results || [];
      setResults(childResults);
      setStats({
        withProposals: data.children_with_proposals || 0,
        stable: data.children_stable || 0,
        errored: data.children_errored || 0,
        totalProposals: data.total_proposals || 0,
      });

      // Auto-expand first child with proposals
      const firstWithProposals = childResults.find(r => r.proposals.length > 0 && !r.error);
      if (firstWithProposals) {
        setExpandedChild(firstWithProposals.child_id);
      }

      setState('results');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Generate error:', err);
      toast.error(t('shelfAutopilot.generateError'));
      setState('idle');
    }
  }, [children, classroomId, t]);

  // ---- Apply Single Proposal ----

  const handleApplyProposal = useCallback(async (childId: string, proposal: ShelfProposal) => {
    const key = `${childId}:${proposal.area}`;
    if (appliedProposals.has(key) || applyingKey === key) return;

    // Optimistic: mark as applying immediately to prevent double-click
    setApplyingKey(key);

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'apply',
          applications: [{
            child_id: childId,
            area: proposal.area,
            work_name: proposal.proposed_work,
          }],
        }),
        signal: abortRef.current?.signal,
        timeout: 30000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.applyError'));
        setApplyingKey(null);
        return;
      }

      if (data.applied > 0) {
        setAppliedProposals(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        toast.success(t('shelfAutopilot.applied'));
      } else {
        toast.error(t('shelfAutopilot.applyError'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Apply error:', err);
      toast.error(t('shelfAutopilot.applyError'));
    } finally {
      setApplyingKey(null);
    }
  }, [appliedProposals, applyingKey, t]);

  // ---- Apply All Proposals for One Child ----

  const handleApplyAllForChild = useCallback(async (childResult: ChildResult) => {
    const unapplied = childResult.proposals.filter(
      p => !appliedProposals.has(`${childResult.child_id}:${p.area}`)
    );
    if (unapplied.length === 0) return;

    const childKey = `applying_all:${childResult.child_id}`;
    if (applyingKey === childKey) return; // Prevent double-click
    setApplyingKey(childKey);

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'apply',
          applications: unapplied.map(p => ({
            child_id: childResult.child_id,
            area: p.area,
            work_name: p.proposed_work,
          })),
        }),
        signal: abortRef.current?.signal,
        timeout: 30000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.applyError'));
        setApplyingKey(null);
        return;
      }

      if (data.applied > 0) {
        setAppliedProposals(prev => {
          const next = new Set(prev);
          for (const p of unapplied) {
            next.add(`${childResult.child_id}:${p.area}`);
          }
          return next;
        });
        toast.success(`${data.applied} ${t('shelfAutopilot.movesApplied')}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Apply all error:', err);
      toast.error(t('shelfAutopilot.applyError'));
    } finally {
      setApplyingKey(null);
    }
  }, [appliedProposals, applyingKey, t]);

  // ---- Render: Idle ----

  if (state === 'idle') {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <span className="text-lg">🚀</span>
            {t('shelfAutopilot.title')}
          </h3>
        </div>
        <p className="text-xs text-indigo-600 mb-3">
          {t('shelfAutopilot.description')}
        </p>
        <button
          onClick={handleGenerate}
          disabled={children.length === 0}
          className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('shelfAutopilot.generate')}
        </button>
      </div>
    );
  }

  // ---- Render: Generating ----

  if (state === 'generating') {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🚀</span>
          <h3 className="text-sm font-semibold text-indigo-900">{t('shelfAutopilot.title')}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-indigo-100 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
          <span className="text-xs text-indigo-600 whitespace-nowrap">
            {t('shelfAutopilot.analyzing')}
          </span>
        </div>
      </div>
    );
  }

  // ---- Render: Results ----

  const childrenWithProposals = results.filter(r => r.proposals.length > 0 && !r.error);
  const childrenStable = results.filter(r => r.proposals.length === 0 && !r.error);
  const childrenErrored = results.filter(r => r.error);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <span className="text-lg">🚀</span>
            {t('shelfAutopilot.title')}
          </h3>
          <button
            onClick={() => { setState('idle'); setResults([]); setAppliedProposals(new Set()); }}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
          >
            {t('shelfAutopilot.redo')}
          </button>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2 mb-3">
          {stats.withProposals > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">
              📋 {stats.withProposals} {t('shelfAutopilot.readyForMoves')}
            </span>
          )}
          {stats.stable > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
              ✓ {stats.stable} {t('shelfAutopilot.shelvesGood')}
            </span>
          )}
          {stats.errored > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
              ⚠ {stats.errored} {t('shelfAutopilot.errors')}
            </span>
          )}
        </div>
      </div>

      {/* Children with proposals */}
      {childrenWithProposals.length > 0 && (
        <div className="border-t border-indigo-100">
          {childrenWithProposals.map(child => {
            const isExpanded = expandedChild === child.child_id;
            const allApplied = child.proposals.every(
              p => appliedProposals.has(`${child.child_id}:${p.area}`)
            );
            const unappliedCount = child.proposals.filter(
              p => !appliedProposals.has(`${child.child_id}:${p.area}`)
            ).length;

            return (
              <div key={child.child_id} className="border-b border-indigo-50 last:border-b-0">
                {/* Child header — tap to expand */}
                <button
                  onClick={() => setExpandedChild(isExpanded ? null : child.child_id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    <span className="text-sm font-medium text-gray-800">{child.child_name}</span>
                    <span className="text-xs text-indigo-500">
                      {child.proposals.length} {child.proposals.length === 1 ? t('shelfAutopilot.move') : t('shelfAutopilot.moves')}
                    </span>
                  </div>
                  {allApplied ? (
                    <span className="text-xs text-emerald-600 font-medium">✓ {t('shelfAutopilot.allApplied')}</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyAllForChild(child);
                      }}
                      disabled={applyingKey === `applying_all:${child.child_id}`}
                      className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {applyingKey === `applying_all:${child.child_id}`
                        ? t('shelfAutopilot.applying')
                        : `${t('shelfAutopilot.applyAll')} (${unappliedCount})`}
                    </button>
                  )}
                </button>

                {/* Expanded proposals */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    {child.proposals.map(proposal => {
                      const key = `${child.child_id}:${proposal.area}`;
                      const isApplied = appliedProposals.has(key);
                      const isApplying = applyingKey === key;
                      const confidence = CONFIDENCE_STYLES[proposal.confidence] || CONFIDENCE_STYLES.low;
                      const areaColor = AREA_COLORS[proposal.area] || '#6B7280';

                      return (
                        <div key={key} className={`bg-white rounded-lg p-3 border ${isApplied ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                          {/* Area badge + confidence */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: areaColor }}
                              />
                              <span className="text-xs font-medium text-gray-500">
                                {AREA_LABELS[proposal.area] || proposal.area}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${confidence.bg} ${confidence.text}`}>
                              {confidence.label}
                            </span>
                          </div>

                          {/* Current → Proposed */}
                          <div className="flex items-center gap-2 mb-1.5">
                            {proposal.current_work ? (
                              <>
                                <span className="text-xs text-gray-400 line-through truncate max-w-[120px]">
                                  {proposal.current_work}
                                </span>
                                <span className="text-xs text-gray-400">→</span>
                              </>
                            ) : null}
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {proposal.proposed_work}
                            </span>
                          </div>

                          {/* Reason */}
                          <p className="text-xs text-gray-500 mb-2">{proposal.reason}</p>

                          {/* Apply button */}
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              ✓ {t('shelfAutopilot.applied')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplyProposal(child.child_id, proposal)}
                              disabled={isApplying}
                              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {isApplying ? t('shelfAutopilot.applying') : t('shelfAutopilot.applyMove')}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Stable areas */}
                    {child.areas_stable.length > 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        ✓ {t('shelfAutopilot.stableAreas')}: {child.areas_stable.map(a => AREA_LABELS[a] || a).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Children stable — collapsed summary */}
      {childrenStable.length > 0 && (
        <div className="px-4 py-2 border-t border-indigo-100">
          <p className="text-xs text-emerald-600">
            ✓ {childrenStable.map(c => c.child_name).join(', ')} — {t('shelfAutopilot.shelvesLookGood')}
          </p>
        </div>
      )}

      {/* Children with errors */}
      {childrenErrored.length > 0 && (
        <div className="px-4 py-2 border-t border-indigo-100">
          {childrenErrored.map(child => (
            <div key={child.child_id} className="flex items-center justify-between text-xs py-1">
              <span className="text-red-600">⚠ {child.child_name}: {child.error}</span>
              <button
                onClick={() => {
                  // Retry single child — generate just for this child
                  // For now, just re-run the whole batch
                  handleGenerate();
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {t('shelfAutopilot.retry')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
