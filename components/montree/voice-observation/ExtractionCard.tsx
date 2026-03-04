// components/montree/voice-observation/ExtractionCard.tsx
// Single extraction card — shows observation, confidence, event type, approve/reject/edit
'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';

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

interface Props {
  extraction: Extraction;
  childName: string | null;
  onAction: (id: string, action: string, extra?: any) => void;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  mastery: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐ Mastery' },
  presentation: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📋 Presentation' },
  practice: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🔄 Practice' },
  behavioral: { bg: 'bg-purple-100', text: 'text-purple-700', label: '👁 Behavioral' },
  other: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Other' },
};

const AREA_COLORS: Record<string, string> = {
  practical_life: '#4CAF50',
  sensorial: '#FF9800',
  mathematics: '#3F51B5',
  language: '#E91E63',
  cultural: '#9C27B0',
};

const STATUS_OPTIONS = ['presented', 'practicing', 'mastered'];

export default function ExtractionCard({ extraction, childName, onAction }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(extraction.proposed_status || '');
  const [editNotes, setEditNotes] = useState(extraction.teacher_final_notes || '');

  const ext = extraction;
  const eventStyle = EVENT_TYPE_COLORS[ext.event_type] || EVENT_TYPE_COLORS.other;
  const isReviewed = ext.review_status !== 'pending';
  const confidence = Math.round(ext.status_confidence * 100);
  const confidenceColor = confidence >= 90 ? 'text-emerald-600' : confidence >= 70 ? 'text-amber-600' : 'text-red-600';

  const formatTimestamp = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `~${m}:${String(s).padStart(2, '0')}`;
  };

  const handleSaveEdit = () => {
    onAction(ext.id, 'edit', {
      finalStatus: editStatus || undefined,
      finalNotes: editNotes || undefined,
    });
    setEditing(false);
  };

  return (
    <div className={`bg-white rounded-lg border p-4 transition ${
      ext.review_status === 'approved' || ext.review_status === 'edited' ? 'border-emerald-300 bg-emerald-50/30' :
      ext.review_status === 'rejected' ? 'border-red-200 bg-red-50/30 opacity-60' :
      'border-gray-200'
    }`}>
      {/* Header: name + event type + timestamp */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {ext.area && (
            <span
              className="w-5 h-5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: AREA_COLORS[ext.area] || '#999' }}
              title={ext.area}
            />
          )}
          <span className="font-semibold text-gray-900">
            {childName || ext.child_name_spoken}
          </span>
          {!ext.child_id && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              {t('voiceObs.unmatchedChild') || 'unmatched'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ext.timestamp_seconds !== null && (
            <span className="text-xs text-gray-400">
              {t('voiceObs.atTimestamp') || 'at'} {formatTimestamp(ext.timestamp_seconds)}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${eventStyle.bg} ${eventStyle.text}`}>
            {eventStyle.label}
          </span>
        </div>
      </div>

      {/* Work name */}
      {ext.work_name && (
        <div className="text-sm text-gray-700 mb-1">
          📚 {ext.work_name}
          {ext.work_match_confidence > 0 && ext.work_match_confidence < 0.7 && (
            <span className="text-xs text-red-500 ml-1">
              ({t('voiceObs.lowConfidence') || 'low match'})
            </span>
          )}
        </div>
      )}

      {/* Observation text */}
      <p className="text-sm text-gray-600 mb-2">{ext.observation_text}</p>

      {/* Behavioral notes */}
      {ext.behavioral_notes && (
        <p className="text-xs text-purple-600 italic mb-2">💭 {ext.behavioral_notes}</p>
      )}

      {/* Status + Confidence */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        {ext.proposed_status && (
          <span className={`px-2 py-0.5 rounded ${
            ext.proposed_status === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
            ext.proposed_status === 'practicing' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {ext.teacher_final_status || ext.proposed_status}
          </span>
        )}
        <span className={confidenceColor}>{confidence}% confidence</span>
      </div>

      {/* Review status indicator */}
      {isReviewed && (
        <div className={`text-xs font-medium mb-2 ${
          ext.review_status === 'rejected' ? 'text-red-600' : 'text-emerald-600'
        }`}>
          {ext.review_status === 'approved' ? '✓ Approved' :
           ext.review_status === 'edited' ? '✏️ Edited & Approved' :
           ext.review_status === 'rejected' ? '✗ Rejected' : ext.review_status}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="bg-gray-50 rounded p-3 mb-3 space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status override</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setEditStatus(s)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    editStatus === s ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full text-sm border rounded p-2 h-16"
              placeholder="Add teacher notes..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="text-xs px-3 py-1 bg-emerald-500 text-white rounded">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 bg-gray-200 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isReviewed && !editing && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(ext.id, 'approve')}
            className="flex-1 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition"
          >
            ✓ {t('voiceObs.approved') || 'Approve'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="py-1.5 px-3 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition"
          >
            ✏️
          </button>
          <button
            onClick={() => onAction(ext.id, 'reject')}
            className="py-1.5 px-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition"
          >
            ✗
          </button>
        </div>
      )}
    </div>
  );
}
