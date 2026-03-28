'use client';

import { useI18n } from '@/lib/montree/i18n';

interface EvidenceStrengthBadgeProps {
  photoCount: number;
  photoDays: number;
  masteryConfirmedAt?: string | null;
  masteryConfirmedBy?: string | null;
  /** Compact mode shows just the dot + label, no photo count detail */
  compact?: boolean;
}

const STRENGTH_CONFIG = {
  none: { dot: 'bg-gray-300', text: 'text-gray-400', bg: 'bg-gray-50' },
  weak: { dot: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' },
  moderate: { dot: 'bg-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' },
  strong: { dot: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' },
} as const;

function getEvidenceStrength(photoCount: number, photoDays: number): 'none' | 'weak' | 'moderate' | 'strong' {
  if (photoCount === 0) return 'none';
  if (photoCount >= 3 && photoDays >= 3) return 'strong';
  if (photoCount >= 2 || photoDays >= 2) return 'moderate';
  return 'weak';
}

export default function EvidenceStrengthBadge({
  photoCount,
  photoDays,
  masteryConfirmedAt,
  compact = false,
}: EvidenceStrengthBadgeProps) {
  const { t } = useI18n();
  const strength = getEvidenceStrength(photoCount, photoDays);
  const config = STRENGTH_CONFIG[strength];

  if (strength === 'none' && compact) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 ${compact ? '' : `px-2 py-0.5 rounded-full ${config.bg}`}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`text-[10px] font-medium ${config.text}`}>
        {t(`evidence.strength.${strength}`)}
      </span>
      {!compact && photoCount > 0 && (
        <span className="text-[10px] text-gray-400">
          ({t('evidence.photoCount')
            .replace('{count}', String(photoCount))
            .replace('{days}', String(photoDays))})
        </span>
      )}
      {masteryConfirmedAt && (
        <span className="text-[10px] text-emerald-500 ml-1">✓</span>
      )}
    </div>
  );
}

export { getEvidenceStrength, STRENGTH_CONFIG };
