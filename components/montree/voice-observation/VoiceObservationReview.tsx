// components/montree/voice-observation/VoiceObservationReview.tsx
// Review extracted observations — approve/reject/edit + batch actions + commit
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import ExtractionCard from './ExtractionCard';

interface Props {
  sessionId: string;
  onCommitted: (count: number) => void;
}

interface Extraction {
  id: string;
  child_id: string | null;
  child_name_spoken: string;
  work_name: string | null;
  work_key: string | null;
  area: string | null;
  work_match_confidence: number;
  observation_text: string;
  proposed_status: string | null;
  status_confidence: number;
  event_type: string;
  behavioral_notes: string | null;
  timestamp_seconds: number | null;
  review_status: string;
  teacher_final_status: string | null;
  teacher_final_notes: string | null;
}

interface SessionInfo {
  id: string;
  status: string;
  sessionDate: string;
  durationSeconds: number;
  wordCount: number;
  extractionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCostCents: number;
}

export default function VoiceObservationReview({ sessionId, onCommitted }: Props) {
  const { t } = useI18n();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [children, setChildren] = useState<Record<string, { id: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);

  // Load review data
  const loadReview = useCallback(async () => {
    try {
      const resp = await montreeApi(`/api/montree/voice-observation/${sessionId}/review`);
      const data = await resp.json();
      if (data.success) {
        setSessionInfo(data.session);
        setExtractions(data.extractions || []);
        setChildren(data.children || {});
      }
    } catch {
      toast.error('Failed to load review data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadReview(); }, [loadReview]);

  // Single extraction action
  const handleAction = useCallback(async (extractionId: string, action: string, extra?: any) => {
    try {
      const resp = await montreeApi(`/api/montree/voice-observation/extraction/${extractionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await resp.json();
      if (data.success) {
        await loadReview();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Action failed');
    }
  }, [loadReview]);

  // Batch approve high confidence
  const handleApproveHighConfidence = useCallback(async () => {
    try {
      // Use any extraction ID as the route param (it's ignored for batch)
      const firstExt = extractions[0];
      if (!firstExt) return;
      const resp = await montreeApi(`/api/montree/voice-observation/extraction/${firstExt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve_high_confidence', sessionId, minConfidence: 0.9 }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`${data.updated} high-confidence observations approved`);
        await loadReview();
      }
    } catch {
      toast.error('Batch approve failed');
    }
  }, [extractions, sessionId, loadReview]);

  // Batch approve all pending
  const handleApproveAll = useCallback(async () => {
    const pendingIds = extractions.filter(e => e.review_status === 'pending').map(e => e.id);
    if (pendingIds.length === 0) return;
    try {
      const firstExt = extractions[0];
      const resp = await montreeApi(`/api/montree/voice-observation/extraction/${firstExt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'batch_approve', extractionIds: pendingIds }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`${data.updated} observations approved`);
        await loadReview();
      }
    } catch {
      toast.error('Batch approve failed');
    }
  }, [extractions, loadReview]);

  // Commit
  const handleCommit = useCallback(async () => {
    const approvedCount = extractions.filter(e => ['approved', 'edited'].includes(e.review_status)).length;
    if (approvedCount === 0) {
      toast.error('No approved observations to commit');
      return;
    }
    setCommitting(true);
    try {
      const resp = await montreeApi(`/api/montree/voice-observation/${sessionId}/commit`, {
        method: 'POST',
      });
      const data = await resp.json();
      if (data.success) {
        onCommitted(data.committedCount);
      } else {
        toast.error(data.error || 'Commit failed');
      }
    } catch {
      toast.error('Failed to commit');
    } finally {
      setCommitting(false);
    }
  }, [extractions, sessionId, onCommitted]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Count stats
  const pending = extractions.filter(e => e.review_status === 'pending').length;
  const approved = extractions.filter(e => ['approved', 'edited'].includes(e.review_status)).length;
  const rejected = extractions.filter(e => e.review_status === 'rejected').length;
  const highConfidence = extractions.filter(e => e.review_status === 'pending' && e.status_confidence >= 0.9).length;
  const unmatched = extractions.filter(e => !e.child_id && ['approved', 'edited'].includes(e.review_status)).length;

  return (
    <div>
      {/* Session info */}
      {sessionInfo && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-900">
              {t('voiceObs.readyForReview') || 'Ready for Review'}
            </h2>
            <span className="text-xs text-gray-500">
              {sessionInfo.sessionDate} · {Math.round(sessionInfo.durationSeconds / 60)}min
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">{sessionInfo.wordCount?.toLocaleString()} words</span>
            <span className="text-gray-500">{extractions.length} observations</span>
            {sessionInfo.totalCostCents > 0 && (
              <span className="text-gray-400">${(sessionInfo.totalCostCents / 100).toFixed(2)}</span>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-2 mb-4 text-xs">
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">{pending} pending</span>
        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{approved} approved</span>
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">{rejected} rejected</span>
      </div>

      {/* Batch actions */}
      {pending > 0 && (
        <div className="flex gap-2 mb-4">
          {highConfidence > 0 && (
            <button
              onClick={handleApproveHighConfidence}
              className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
            >
              {t('voiceObs.approveHighConfidence') || `✓ Approve High Confidence (${highConfidence})`}
            </button>
          )}
          <button
            onClick={handleApproveAll}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
          >
            {t('voiceObs.approveAll') || `✓ Approve All (${pending})`}
          </button>
        </div>
      )}

      {/* No extractions */}
      {extractions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {t('voiceObs.noExtractions') || 'No observations were extracted from this recording.'}
        </div>
      )}

      {/* Extraction cards */}
      <div className="space-y-3 mb-6">
        {extractions.map(ext => (
          <ExtractionCard
            key={ext.id}
            extraction={ext}
            childName={ext.child_id ? children[ext.child_id]?.name : null}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Commit button */}
      {approved > 0 && (
        <div className="sticky bottom-4">
          {unmatched > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-2 mb-2">
              {unmatched} approved observation(s) have no student assigned — please assign before committing.
            </div>
          )}
          <button
            onClick={handleCommit}
            disabled={committing || unmatched > 0}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {committing
              ? (t('voiceObs.committing') || 'Committing...')
              : (t('voiceObs.commitApproved') || `Commit ${approved} Approved Observations`)
            }
          </button>
        </div>
      )}
    </div>
  );
}
