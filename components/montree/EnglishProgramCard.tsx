'use client';

// components/montree/EnglishProgramCard.tsx
//
// 🔤 English Program (58-Week Curriculum) dashboard card. Gated on the
// `english_program` feature flag by the dashboard (mirrors CurriculumGapCard).
//
// Shows the classroom's "current week" (the lowest week whose work isn't yet
// mastered classroom-wide), a small "X of 58 mastered" line, and a link into
// Curriculum Studio at that week. Read-only — never touches the shelf ladder.
//
// If the flag is on but no english works are seeded yet: principals get a
// one-line "run the seed" hint; teachers see nothing (graceful).

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  border: '1px solid rgba(232,201,106,0.30)',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.70)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface EnglishProgramState {
  success: boolean;
  seeded: boolean;
  total: number;
  mastered: number;
  current_week: number;
}

export default function EnglishProgramCard() {
  const { t } = useI18n();
  const [data, setData] = useState<EnglishProgramState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/dashboard/english-program', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return; // render nothing on error
        const json = await res.json();
        if (!cancelled && json?.success) setData(json as EnglishProgramState);
      } catch {
        // network error → render nothing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  const isPrincipal = getSession()?.teacher?.role === 'principal';

  // Flag on but not seeded: nudge principals, hide from teachers.
  if (!data.seeded) {
    if (!isPrincipal) return null;
    return (
      <div style={cardStyle()}>
        <Header title={t('englishProgram.title')} />
        <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6, lineHeight: 1.5 }}>
          {t('englishProgram.notSeeded')}
        </div>
      </div>
    );
  }

  const total = data.total || 58;
  const week = Math.min(Math.max(data.current_week || 1, 1), 58);
  const pct = total > 0 ? Math.round((data.mastered / total) * 100) : 0;

  return (
    <div style={cardStyle()}>
      <Header title={t('englishProgram.title')} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: T.serif, fontSize: 22, color: T.gold, letterSpacing: '-0.3px' }}>
          {t('englishProgram.weekLabel', { week })}
        </span>
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>
          {t('englishProgram.masteredLine', { count: data.mastered, total })}
        </span>
      </div>

      {/* Progress bar */}
      <div
        aria-hidden
        style={{
          marginTop: 8, height: 6, borderRadius: 999,
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: T.gold, borderRadius: 999, transition: 'width 240ms ease' }} />
      </div>

      <Link
        href={`/montree/library/curriculum-studio?week=${week}`}
        style={{
          display: 'inline-block', marginTop: 10, fontSize: 12.5, fontWeight: 600,
          color: T.gold, textDecoration: 'none',
        }}
      >
        {t('englishProgram.open')}
      </Link>
    </div>
  );
}

function cardStyle(): CSSProperties {
  return {
    background: T.cardBg,
    border: T.border,
    borderRadius: 16,
    padding: '14px 16px',
    marginBottom: 14,
    fontFamily: T.sans,
  };
}

function Header({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <BookOpen size={16} color={T.gold} strokeWidth={1.75} />
      <span style={{ fontFamily: T.serif, fontSize: 15, color: T.textPrimary, letterSpacing: '-0.2px', flex: 1 }}>
        {title}
      </span>
    </div>
  );
}
