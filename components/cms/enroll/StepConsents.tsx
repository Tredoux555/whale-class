'use client';

// components/cms/enroll/StepConsents.tsx
// WIZARD STEP 7 — writes `cms_consents`, one row per kind.
//
// 🚨 EVERY CONSENT IS A SEPARATE ANSWER, AND A BLANK IS A REFUSAL. There is no
// "select all", no pre-ticked box, and no bundle. `lib/cms/engine/photo-filter.ts`
// treats a MISSING row as refusal and the migration says in as many words never
// to backfill this table with granted = true; this screen is the other half of
// that contract, and a convenience that ticks six boxes at once would break it.
//
// `photography` and `media` are deliberately two questions (migration 330): a
// family happy with a picture on the classroom wall is often not happy with one
// on a public page, and one checkbox for both forces them to refuse both.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { CONSENT_KINDS, type ConsentsStepValues } from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { FieldError, inputClass } from './RowCard';

const CONSENT_COPY: Record<string, { label: TranslationKey; desc: TranslationKey }> = {
  photography: { label: 'consent.photography', desc: 'consent.photography.desc' },
  media: { label: 'consent.media', desc: 'consent.media.desc' },
  outings: { label: 'consent.outings', desc: 'consent.outings.desc' },
  emergency_medical: {
    label: 'consent.emergency_medical',
    desc: 'consent.emergency_medical.desc',
  },
  sunscreen: { label: 'consent.sunscreen', desc: 'consent.sunscreen.desc' },
  data_processing: { label: 'consent.data_processing', desc: 'consent.data_processing.desc' },
};

export interface StepConsentsProps {
  value: ConsentsStepValues;
  onChange: (next: ConsentsStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepConsents({ value, onChange, errors = {} }: StepConsentsProps) {
  const t = useT();

  function toggle(kind: string, granted: boolean) {
    onChange({ ...value, consents: { ...value.consents, [kind]: granted } });
  }

  return (
    <StepScaffold titleKey="enrol.step.consents" descKey="enrol.step.consents.desc">
      <p className="text-[12.5px] text-harbor-muted mt-0 mb-4 leading-relaxed max-w-[58ch]">
        {t('enrol.consents.body')}
      </p>

      <ul className="list-none m-0 p-0 grid gap-2.5">
        {CONSENT_KINDS.map((kind) => {
          const granted = value.consents?.[kind] === true;
          return (
            <li key={kind}>
              <label
                className={`flex items-start gap-3 p-4 rounded-[12px] border cursor-pointer transition-colors ${
                  granted
                    ? 'border-harbor-accent/35 bg-harbor-accent/[0.06]'
                    : 'border-harbor-border bg-harbor-sunk'
                }`}
              >
                <input
                  type="checkbox"
                  checked={granted}
                  onChange={(e) => toggle(kind, e.target.checked)}
                  className="mt-0.5 w-[18px] h-[18px] accent-harbor-accent shrink-0 cursor-pointer"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-harbor-text leading-snug">
                    {t(CONSENT_COPY[kind].label)}
                  </span>
                  <span className="block text-[12px] text-harbor-muted mt-1 leading-relaxed">
                    {t(CONSENT_COPY[kind].desc)}
                  </span>
                </span>
                <span
                  className={`cms-tag shrink-0 ms-auto ${granted ? 'cms-tone-success' : 'cms-tone-quiet'}`}
                >
                  {granted ? t('common.yes') : t('common.no')}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 max-w-[420px]">
        <Field label={t('enrol.consents.sign')} help={t('enrol.consents.sign.help')} required>
          <input
            className={inputClass(Boolean(errors.signedName))}
            dir="auto"
            autoComplete="name"
            value={value.signedName}
            aria-invalid={Boolean(errors.signedName)}
            onChange={(e) => onChange({ ...value, signedName: e.target.value })}
          />
          <FieldError messageKey={errors.signedName} />
        </Field>
      </div>
    </StepScaffold>
  );
}
