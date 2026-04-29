'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';

export default function TeachingToolsSection() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div style={{ flex: 1, height: 1, background: 'rgba(52,211,153,0.15)' }} />
        <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('curriculum.teachingTools')}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(52,211,153,0.15)' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Language Guide hidden — temporarily disabled */}
        <button onClick={() => router.push('/montree/dashboard/card-generator')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 14, padding: '16px', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 140ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(52,211,153,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(52,211,153,0.30)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(52,211,153,0.15)'; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(139,92,246,0.40), rgba(109,40,217,0.25))', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            🃏
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '0 0 2px' }}>{t('curriculum.threePartCards')}</p>
            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: 0 }}>{t('curriculum.nomenclatureCards')}</p>
          </div>
        </button>
        {/* Vocab Flashcards hidden — temporarily disabled */}
      </div>
    </div>
  );
}
