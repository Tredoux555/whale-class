// components/montree/guru/ConcernCardsGrid.tsx
// 2-column grid of tappable concern cards for homeschool parents
// "I'm worried about..." entry points into personalized Guru guides
'use client';

import { useState } from 'react';
import { getAllConcerns } from '@/lib/montree/guru/concern-mappings';
import ConcernDetailModal from './ConcernDetailModal';
import { HOME_THEME } from '@/lib/montree/home-theme';
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
      <div className="mb-3">
        <h2 className={`text-lg font-bold ${HOME_THEME.headingText}`}>
          {t('guru.supportingAtHome').replace('{name}', childName)}
        </h2>
        <p className={`text-sm ${HOME_THEME.subtleText}`}>
          {t('guru.tapConcernForGuide')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {concerns.map((concern) => (
          <button
            key={concern.id}
            onClick={() => setSelectedConcernId(concern.id)}
            className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl p-4 text-left transition-all hover:shadow-md active:scale-[0.97] hover:border-[#0D3330]/25`}
          >
            <div className="text-2xl mb-2">{concern.icon}</div>
            <div className={`text-sm font-semibold ${HOME_THEME.headingText} leading-tight`}>
              {concern.title}
            </div>
            <div className={`text-xs ${HOME_THEME.subtleText} mt-1 leading-snug`}>
              {concern.shortDesc}
            </div>
          </button>
        ))}
      </div>

      {/* Concern Detail Modal */}
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
