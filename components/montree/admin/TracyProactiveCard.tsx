'use client';

// components/montree/admin/TracyProactiveCard.tsx
// Surfaces actionable school signals on principal Today page.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface ClassroomSignal {
  classroom_id: string;
  classroom_name: string | null;
  active_students: number;
  photos_7d: number;
  signal: 'active' | 'quiet' | 'stale';
}

interface TeacherSignal {
  teacher_id: string;
  teacher_name: string | null;
  days_since_login: number | null;
  signal: 'active' | 'quiet' | 'idle';
}

interface SnapshotData {
  classrooms: ClassroomSignal[];
  teachers: TeacherSignal[];
  pending_photos_7d: number;
  suggestions: string[];
}

export default function TracyProactiveCard() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/admin/snapshot', { credentials: 'include' });
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || dismissed || !data) return null;
  if (data.suggestions.length === 0) return null;

  const staleClassrooms = data.classrooms.filter((c) => c.signal === 'stale');
  const idleTeachers = data.teachers.filter((t) => t.signal === 'idle');

  return (
    <div
      style={{
        margin: '12px 0',
        padding: 14,
        borderRadius: 14,
        background: 'rgba(245,217,122,0.08)',
        border: '1px solid rgba(245,217,122,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#f5d97a', fontWeight: 600 }}>
            Tracy noticed
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
            {data.suggestions.join(' · ')}.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ×
        </button>
      </div>

      {staleClassrooms.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            Classrooms without photos this week:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {staleClassrooms.map((c) => (
              <Link
                key={c.classroom_id}
                href={`/montree/admin/classrooms/${c.classroom_id}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                {c.classroom_name || 'Unnamed'} ({c.active_students})
              </Link>
            ))}
          </div>
        </div>
      )}

      {idleTeachers.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            Teachers idle:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {idleTeachers.map((t) => (
              <span
                key={t.teacher_id}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#fbbf24',
                  fontSize: 12,
                }}
              >
                {t.teacher_name || 'Teacher'} ·{' '}
                {t.days_since_login === null ? 'never' : `${t.days_since_login}d`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
