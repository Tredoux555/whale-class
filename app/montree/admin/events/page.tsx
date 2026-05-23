// app/montree/admin/events/page.tsx
//
// Admin event manager. Lists events the principal can see (school-wide
// + every classroom), supports creating new events + opening the per-
// event detail view with RSVP rollup.
//
// Principal-only for v1. Teachers can create classroom events via this
// same route — auth.role detection in the API enforces scope.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Users, MapPin, Trash2, X } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  red: '#fca5a5',
};

interface EventRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  created_by_role: 'teacher' | 'principal';
  created_by_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  capacity: number | null;
  is_published: boolean;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  rsvps: { yes: number; no: number; maybe: number };
}

interface Classroom {
  id: string;
  name: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [eventsRes, classroomsRes] = await Promise.all([
        fetch('/api/montree/admin/events', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/montree/admin/students?classroom=all', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!eventsRes.ok) {
        if (eventsRes.status === 401 || eventsRes.status === 403) {
          router.replace('/montree/login-select');
          return;
        }
        setError(t('events.errorLoad'));
        return;
      }
      const data = await eventsRes.json();
      if (data?.migration_pending) setMigrationPending(true);
      if (data?.feature_disabled) setFeatureDisabled(true);
      setEvents(data?.events || []);

      if (classroomsRes.ok) {
        const cdata = await classroomsRes.json();
        // The students endpoint returns { classrooms } alongside students.
        const list = Array.isArray(cdata?.classrooms) ? cdata.classrooms : [];
        type Cls = { id: string; name: string };
        setClassrooms(list.map((c: Cls) => ({ id: c.id, name: c.name })));
      }
    } catch {
      setError(t('events.errorNetwork'));
    }
  }, [router, t]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 60px', color: T.textPrimary, fontFamily: T.sans }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 500, letterSpacing: -0.3, margin: 0 }}>
          <Calendar size={26} strokeWidth={1.75} style={{ verticalAlign: 'text-bottom', marginRight: 10, color: T.emerald }} />
          {t('events.title')}
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 13, margin: '6px 0 0' }}>
          {t('events.subtitle')}
        </p>
      </div>

      {featureDisabled && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.40)', color: T.gold, fontSize: 13 }}>
          {t('events.featureDisabled')}
        </div>
      )}

      {migrationPending && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.40)', color: T.gold, fontSize: 13 }}>
          {t('events.migrationPending')}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!featureDisabled && !migrationPending && (
        <button
          onClick={() => setShowCompose(true)}
          style={{
            width: '100%', padding: '14px 18px', borderRadius: 12,
            background: T.emerald, border: 'none', color: '#0a1a0f',
            fontWeight: 600, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 18,
          }}
        >
          <Plus size={18} strokeWidth={1.75} /> {t('events.newEvent')}
        </button>
      )}

      {loading ? (
        <div style={{ color: T.textSecondary, fontSize: 14, padding: 20 }}>{t('common.loading')}</div>
      ) : events.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 14, textAlign: 'center' }}>
          {t('events.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((e) => (
            <EventCard key={e.id} event={e} classrooms={classrooms} onChanged={reload} />
          ))}
        </div>
      )}

      {showCompose && (
        <ComposeModal classrooms={classrooms} onClose={() => setShowCompose(false)} onCreated={async () => { setShowCompose(false); await reload(); }} />
      )}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────
function EventCard({ event, classrooms, onChanged }: { event: EventRow; classrooms: Classroom[]; onChanged: () => Promise<void> }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const classroom = event.classroom_id ? classrooms.find((c) => c.id === event.classroom_id) : null;
  const isPast = new Date(event.start_at) < new Date();
  const isCancelled = !!event.cancelled_at;

  const handleCancel = async () => {
    if (!confirm(t('events.confirmCancel'))) return;
    const res = await fetch(`/api/montree/admin/events/${event.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel: { reason: '' } }),
    });
    if (res.ok) await onChanged();
  };
  const handleDelete = async () => {
    if (!confirm(t('events.confirmDelete'))) return;
    const res = await fetch(`/api/montree/admin/events/${event.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) await onChanged();
  };

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, background: T.cardBg, border: T.cardBorder,
      opacity: isCancelled ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500, color: T.textPrimary }}>
          {event.title}
          {isCancelled && <span style={{ color: T.red, fontSize: 11, marginLeft: 8 }}>{t('events.tagCancelled')}</span>}
          {isPast && !isCancelled && <span style={{ color: T.textMuted, fontSize: 11, marginLeft: 8 }}>{t('events.tagPast')}</span>}
        </div>
        <button onClick={() => setExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 11 }}>
          {expanded ? t('events.less') : t('events.more')}
        </button>
      </div>

      <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 6 }}>
        {fmtDateTime(event.start_at)}
        {event.end_at && <> – {fmtDateTime(event.end_at)}</>}
      </div>

      {event.location && (
        <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={12} strokeWidth={1.75} /> {event.location}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.textMuted, marginTop: 8 }}>
        <Users size={12} strokeWidth={1.75} style={{ alignSelf: 'center' }} />
        <span style={{ color: T.emerald }}>{t('events.rsvpYes', { count: event.rsvps.yes })}</span>
        <span>{t('events.rsvpMaybe', { count: event.rsvps.maybe })}</span>
        <span>{t('events.rsvpNo', { count: event.rsvps.no })}</span>
        {event.capacity != null && (
          <span style={{ color: T.gold }}>{t('events.capacityTag', { count: event.capacity })}</span>
        )}
        {classroom && (
          <span style={{ marginLeft: 'auto', color: T.textSecondary }}>· {classroom.name}</span>
        )}
        {!classroom && event.classroom_id === null && (
          <span style={{ marginLeft: 'auto', color: T.textSecondary }}>{t('events.tagSchoolWide')}</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {event.description && (
            <div style={{ fontSize: 13, color: T.textPrimary, whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 10 }}>
              {event.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {!isCancelled && !isPast && (
              <button onClick={handleCancel} style={btnGhost()}>{t('events.cancelEvent')}</button>
            )}
            <button onClick={handleDelete} style={{ ...btnGhost(), color: T.red, border: '1px solid rgba(239,68,68,0.45)' }}>
              <Trash2 size={14} strokeWidth={1.75} /> {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compose modal ─────────────────────────────────────────────────────
function ComposeModal({ classrooms, onClose, onCreated }: { classrooms: Classroom[]; onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [classroomId, setClassroomId] = useState<string>('');
  const [capacity, setCapacity] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !startAt) {
      setError(t('events.errorRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/admin/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          start_at: new Date(startAt).toISOString(),
          end_at: endAt ? new Date(endAt).toISOString() : null,
          location: location.trim() || null,
          classroom_id: classroomId || null,
          capacity: capacity ? parseInt(capacity, 10) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || t('events.errorCreate'));
        return;
      }
      onCreated();
    } catch {
      setError(t('events.errorNetwork'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: '#0a1a0f',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: T.cardBorder, padding: '24px 20px 32px',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, margin: 0 }}>{t('events.newEvent')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('events.fieldTitle')}><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} style={inputStyle()} /></Field>
          <Field label={t('events.fieldDescription')}><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} style={{ ...inputStyle(), resize: 'vertical', minHeight: 70 }} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('events.fieldStart')}><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={inputStyle()} /></Field>
            <Field label={t('events.fieldEnd')}><input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={inputStyle()} /></Field>
          </div>
          <Field label={t('events.fieldLocation')}><input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} style={inputStyle()} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('events.fieldScope')}>
              <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} style={inputStyle()}>
                <option value="">{t('events.scopeSchoolWide')}</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('events.fieldCapacity')}>
              <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} style={inputStyle()} />
            </Field>
          </div>

          {error && (
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={btnGhost()}>{t('common.cancel')}</button>
            <button onClick={submit} disabled={saving} style={{ ...btnPrimary(), flex: 1, opacity: saving ? 0.5 : 1 }}>
              {saving ? t('events.creating') : t('events.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.gold, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: T.inputBg, border: T.inputBorder,
    color: T.textPrimary, fontSize: 16, fontFamily: T.sans, outline: 'none',
  };
}
function btnPrimary(): React.CSSProperties {
  return {
    padding: '12px 18px', borderRadius: 12,
    background: T.emerald, border: 'none', color: '#0a1a0f',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  };
}
function btnGhost(): React.CSSProperties {
  return {
    padding: '10px 14px', borderRadius: 10, background: T.cardBg, border: T.cardBorder,
    color: T.textPrimary, fontSize: 13, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}
