// components/montree/voice-observation/ExtractionCard.tsx
// Single extraction card — shows observation, confidence, event type, approve/reject/edit
// Dark forest visual treatment — all wiring intact
'use client';

import { useState } from 'react';
import {
  Star, ClipboardList, RotateCw, Eye, BookOpen, Sparkles,
  Check, X, Pencil, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';

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

const T = {
  cardBg: 'rgba(255,255,255,0.06)',
  cardBgApproved: 'rgba(52,211,153,0.10)',
  cardBgRejected: 'rgba(239,68,68,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  cardBorderApproved: 'rgba(52,211,153,0.40)',
  cardBorderRejected: 'rgba(239,68,68,0.30)',
  cardRadius: 12,
  blur: 'blur(14px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  blue: '#60a5fa',
  blueStrong: 'rgba(96,165,250,0.18)',
  violet: '#c4b5fd',
  violetStrong: 'rgba(139,92,246,0.18)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redStrong: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.18)',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const EVENT_TYPE_CONFIG: Record<string, {
  bg: string; border: string; color: string; Icon: typeof Star;
  labels: Record<string, string>;
}> = {
  mastery: {
    bg: T.emeraldStrong, border: 'rgba(52,211,153,0.40)', color: T.emerald, Icon: Star,
    labels: { en: 'Mastery', zh: '掌握', es: 'Dominio' },
  },
  presentation: {
    bg: T.blueStrong, border: 'rgba(96,165,250,0.40)', color: T.blue, Icon: ClipboardList,
    labels: { en: 'Presentation', zh: '展示', es: 'Presentación' },
  },
  practice: {
    bg: T.amberStrong, border: T.amberBorder, color: T.amber, Icon: RotateCw,
    labels: { en: 'Practice', zh: '练习', es: 'Práctica' },
  },
  behavioral: {
    bg: T.violetStrong, border: 'rgba(139,92,246,0.40)', color: T.violet, Icon: Eye,
    labels: { en: 'Behavioral', zh: '行为', es: 'Conductual' },
  },
  other: {
    bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.16)', color: T.textSecondary, Icon: ClipboardList,
    labels: { en: 'Other', zh: '其他', es: 'Otro' },
  },
};

const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',
  sensorial: '20, 184, 166',
  mathematics: '168, 85, 247',
  language: '74, 222, 128',
  cultural: '249, 115, 22',
};

const STATUS_OPTIONS = ['presented', 'practicing', 'mastered'];

export default function ExtractionCard({ extraction, childName, onAction }: Props) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(extraction.proposed_status || '');
  const [editNotes, setEditNotes] = useState(extraction.teacher_final_notes || '');

  const ext = extraction;
  const eventCfg = EVENT_TYPE_CONFIG[ext.event_type] || EVENT_TYPE_CONFIG.other;
  const isReviewed = ext.review_status !== 'pending';
  const confidence = Math.round(ext.status_confidence * 100);
  const confidenceColor = confidence >= 90 ? T.emerald : confidence >= 70 ? T.amber : T.red;

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

  // Card visual state
  let cardBg = T.cardBg;
  let cardBorder = T.cardBorder;
  let cardOpacity = 1;
  if (ext.review_status === 'approved' || ext.review_status === 'edited') {
    cardBg = T.cardBgApproved;
    cardBorder = T.cardBorderApproved;
  } else if (ext.review_status === 'rejected') {
    cardBg = T.cardBgRejected;
    cardBorder = T.cardBorderRejected;
    cardOpacity = 0.6;
  }

  // Status pill
  const statusPillStyle = (status: string) => {
    if (status === 'mastered') {
      return { bg: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.85)' };
    }
    if (status === 'practicing') {
      return { bg: T.emeraldStrong, border: 'rgba(52,211,153,0.35)', color: T.emerald };
    }
    return { bg: T.amberStrong, border: T.amberBorder, color: T.amber };
  };

  const EventIcon = eventCfg.Icon;

  return (
    <div style={{
      padding: 16,
      borderRadius: T.cardRadius,
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      opacity: cardOpacity,
      transition: 'all 200ms ease',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          {ext.area && (
            <span
              title={getAreaLabel(ext.area, locale)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: `rgba(${AREA_DOT_RGB[ext.area] || '255,255,255'}, 0.30)`,
                border: `1px solid rgba(${AREA_DOT_RGB[ext.area] || '255,255,255'}, 0.55)`,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
          )}
          <span style={{
            fontFamily: T.sans,
            fontSize: 14,
            fontWeight: 600,
            color: T.textPrimary,
          }}>
            {childName || ext.child_name_spoken}
          </span>
          {!ext.child_id && (
            <span style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: T.amberStrong,
              border: `1px solid ${T.amberBorder}`,
              color: T.amber,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}>
              {t('voiceObs.unmatchedChild') || 'unmatched'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {ext.timestamp_seconds !== null && (
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.sans }}>
              {t('voiceObs.atTimestamp') || 'at'} {formatTimestamp(ext.timestamp_seconds)}
            </span>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 9px',
            borderRadius: 999,
            background: eventCfg.bg,
            border: `1px solid ${eventCfg.border}`,
            color: eventCfg.color,
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}>
            <EventIcon size={10} strokeWidth={1.75} />
            {eventCfg.labels[locale || 'en'] || eventCfg.labels.en}
          </span>
        </div>
      </div>

      {/* Work name */}
      {ext.work_name && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 5,
          fontFamily: T.sans,
          fontSize: 13,
          color: T.textPrimary,
        }}>
          <BookOpen size={12} strokeWidth={1.75} color={T.emerald} />
          <span>{ext.work_name}</span>
          {ext.work_match_confidence > 0 && ext.work_match_confidence < 0.7 && (
            <span style={{
              fontSize: 10,
              color: T.red,
              marginLeft: 4,
            }}>
              ({t('voiceObs.lowConfidence') || 'low match'})
            </span>
          )}
        </div>
      )}

      {/* Observation text */}
      <p style={{
        margin: '0 0 8px',
        fontFamily: T.sans,
        fontSize: 13,
        lineHeight: 1.55,
        color: T.textSecondary,
      }}>
        {ext.observation_text}
      </p>

      {/* Behavioral notes */}
      {ext.behavioral_notes && (
        <p style={{
          margin: '0 0 8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 5,
          fontFamily: T.sans,
          fontSize: 12,
          fontStyle: 'italic',
          color: T.violet,
        }}>
          <Sparkles size={11} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
          {ext.behavioral_notes}
        </p>
      )}

      {/* Status + Confidence */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        fontSize: 11,
      }}>
        {ext.proposed_status && (() => {
          const finalStatus = ext.teacher_final_status || ext.proposed_status;
          const sp = statusPillStyle(finalStatus);
          return (
            <span style={{
              padding: '3px 10px',
              borderRadius: 999,
              background: sp.bg,
              border: `1px solid ${sp.border}`,
              color: sp.color,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              {finalStatus}
            </span>
          );
        })()}
        <span style={{ color: confidenceColor, fontWeight: 600 }}>
          {confidence}% confidence
        </span>
      </div>

      {/* Review status */}
      {isReviewed && (
        <div style={{
          marginBottom: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: T.sans,
          fontSize: 11,
          fontWeight: 600,
          color: ext.review_status === 'rejected' ? T.red : T.emerald,
        }}>
          {ext.review_status === 'approved' ? <><Check size={11} strokeWidth={2.5} /> Approved</>
            : ext.review_status === 'edited' ? <><Pencil size={11} strokeWidth={1.75} /> Edited & Approved</>
              : ext.review_status === 'rejected' ? <><X size={11} strokeWidth={2.5} /> Rejected</>
                : ext.review_status}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 5,
              fontFamily: T.sans,
              fontSize: 10,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}>
              Status override
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setEditStatus(s)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    background: editStatus === s ? T.emeraldStrong : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${editStatus === s ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.10)'}`,
                    color: editStatus === s ? T.emerald : T.textSecondary,
                    fontFamily: T.sans,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 5,
              fontFamily: T.sans,
              fontSize: 10,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}>
              Notes
            </label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Add teacher notes..."
              style={{
                width: '100%',
                height: 64,
                padding: '8px 10px',
                borderRadius: 8,
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 12,
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 14px',
                borderRadius: 8,
                background: 'linear-gradient(180deg, #34d399, #10b981)',
                border: '1px solid rgba(52,211,153,0.55)',
                color: '#06281a',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Check size={11} strokeWidth={2.5} />
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: T.textSecondary,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isReviewed && !editing && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onAction(ext.id, 'approve')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '6px',
              borderRadius: 8,
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              color: T.emerald,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            <Check size={11} strokeWidth={2.5} />
            {t('voiceObs.approved') || 'Approve'}
          </button>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textSecondary,
              fontFamily: T.sans,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onAction(ext.id, 'reject')}
            aria-label="Reject"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: T.redSoft,
              border: `1px solid ${T.redBorder}`,
              color: T.red,
              fontFamily: T.sans,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
