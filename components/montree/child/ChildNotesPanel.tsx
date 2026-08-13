// components/montree/child/ChildNotesPanel.tsx
// Read-only "Notes" panel for a single child, shown on the child page.
// Answers "what have I written about this child?" — writing stays on the
// classroom Notes page (/montree/dashboard/notes) and the page's own mic.
// Dark forest card vocabulary — matches TeacherNotes and the weekly admin
// collapsible that sit either side of it.
'use client';

import { useState, useEffect } from 'react';
import { NotebookPen } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface ChildNote {
  id: string;
  content: string;
  created_at: string;
}

interface ChildNotesPanelProps {
  classroomId: string;
  childId: string;
  // Bump to force a refetch — the child page uses it after its own mic saves a
  // note tagged to this child, so the panel doesn't sit one note behind.
  refreshKey?: number;
}

// How many notes are visible before "Show all".
const PREVIEW_COUNT = 5;

// Dark forest tokens — same values TeacherNotes uses, so the two surfaces read
// as one feature.
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function ChildNotesPanel({ classroomId, childId, refreshKey = 0 }: ChildNotesPanelProps) {
  const { t, locale } = useI18n();
  const [notes, setNotes] = useState<ChildNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Nothing to scope a query to — stay in the loading state, which renders
    // nothing. (The parent already gates on a classroom id.)
    if (!classroomId || !childId) return;
    const controller = new AbortController();

    // 🚨 cache:'no-store' — the GET route sends Cache-Control
    // (private, max-age=30, stale-while-revalidate=60), so without this a note
    // written a moment ago on the Notes page reads back stale here.
    montreeApi(
      `/api/montree/teacher-notes?classroom_id=${classroomId}&child_id=${childId}&limit=20`,
      { cache: 'no-store', signal: controller.signal }
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.notes) setNotes(data.notes);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [classroomId, childId, refreshKey]);

  // Stay invisible until we know what there is to show — no skeleton flash on
  // a page that is already loading several sections.
  if (loading) return null;

  const shown = expanded ? notes : notes.slice(0, PREVIEW_COUNT);
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(getIntlLocale(locale));
  };

  return (
    <div style={{
      background: T.card,
      border: T.cardBorder,
      borderRadius: T.cardRadius,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      overflow: 'hidden',
      fontFamily: T.sans,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: T.cardBorder,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <NotebookPen size={16} strokeWidth={1.75} color={T.emerald} />
        <span style={{
          fontFamily: T.serif,
          fontSize: 15,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.1,
          flex: 1,
        }}>
          {t('nav.notes')}
        </span>
        {notes.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: 999,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.30)',
            color: T.emerald,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}>
            {notes.length}
          </span>
        )}
      </div>

      {notes.length === 0 ? (
        <p style={{
          margin: 0,
          padding: '16px',
          fontSize: 13,
          color: T.textMuted,
          textAlign: 'center',
        }}>
          {t('teacherNotes.empty')}
        </p>
      ) : (
        <div style={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {shown.map(note => (
            <div
              key={note.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: T.textPrimary,
                whiteSpace: 'pre-wrap',
              }}>
                {note.content}
              </p>
              <div style={{
                marginTop: 8,
                fontSize: 11,
                color: T.textMuted,
              }}>
                {formatDate(note.created_at)}
              </div>
            </div>
          ))}

          {!expanded && notes.length > PREVIEW_COUNT && (
            <button
              onClick={() => setExpanded(true)}
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
            >
              {t('teacherNotes.showAll', { count: notes.length })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
