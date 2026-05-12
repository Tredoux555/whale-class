// components/montree/guru/ConcernCardsGrid.tsx
// 2-column grid of tappable concern cards for homeschool parents
// "I'm worried about..." entry points into personalized Guru guides
// Dark forest visual treatment — all wiring intact
'use client';

import { useState } from 'react';
import { getAllConcerns } from '@/lib/montree/guru/concern-mappings';
import ConcernDetailModal from './ConcernDetailModal';
import { useI18n } from '@/lib/montree/i18n';

interface ConcernCardsGridProps {
  childId: string;
  childName: string;
}

const concerns = getAllConcerns();

export default function ConcernCardsGrid({ childId, childName }: ConcernCardsGridProps) {
  const { t } = useI18n();
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);

  return (
    <>
      <div style={{ marginBottom: 12, fontFamily: '"Inter", sans-serif' }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize: 18,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: -0.2,
        }}>
          {t('guru.supportingAtHome').replace('{name}', childName)}
        </h2>
        <p style={{
          margin: '4px 0 0',
          fontSize: 13,
          color: 'rgba(255,255,255,0.45)',
        }}>
          {t('guru.tapConcernForGuide')}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {concerns.map((concern) => (
          <button
            key={concern.id}
            onClick={() => setSelectedConcernId(concern.id)}
            style={{
              padding: 16,
              textAlign: 'left',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(52,211,153,0.15)',
              borderRadius: 18,
              backdropFilter: 'blur(16px) saturate(140%)',
              WebkitBackdropFilter: 'blur(16px) saturate(140%)',
              cursor: 'pointer',
              transition: 'all 140ms ease',
              fontFamily: '"Inter", sans-serif',
              color: 'rgba(255,255,255,0.95)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(52,211,153,0.10)';
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.15)';
            }}
          >
            <div style={{
              fontSize: 22,
              marginBottom: 8,
              filter: 'saturate(0.85) brightness(1.05)',
            }}>
              {concern.icon}
            </div>
            <div style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1.3,
            }}>
              {concern.title}
            </div>
            <div style={{
              marginTop: 4,
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.4,
            }}>
              {concern.shortDesc}
            </div>
          </button>
        ))}
      </div>

      {selectedConcernId && (
        <ConcernDetailModal
          childId={childId}
          childName={childName}
          concernId={selectedConcernId}
          onClose={() => setSelectedConcernId(null)}
        />
      )}
    </>
  );
}
