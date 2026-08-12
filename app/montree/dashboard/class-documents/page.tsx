// app/montree/dashboard/class-documents/page.tsx
// ============================================================================
// CLASS DOCUMENTS — the index. CMS phase 6, the bridge.
// ============================================================================
// Six sheets, generated from the children who are ALREADY in Montree. No second
// login, no second database, nothing retyped: the classroom roster the teacher
// has been using all year is the class list, and a committed parent intake fills
// in the allergies, the contacts and the people allowed to collect.
//
// The counts under each card are LIVE and honest in both directions: what is on
// file (`countDocumentData`, the pure engine) and what is missing
// (`summariseIntakeCoverage`, the bridge). On day one of this feature a real
// room has twenty children and zero intakes — the class list and the labels are
// perfect, the health sheets are empty, and the card says so and points at the
// intake flow instead of pretending.
//
// Montree dark-forest register throughout (this is Montree's screen). The PAPER
// is the shared CMS document; see the [doc] page.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { FileText } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n/en';
import {
  DOCUMENTS,
  MONTREE_DOCUMENT_LABELS,
  paperMatchesScreen,
} from '@/lib/montree/cms-bridge/catalogue';
import type { IntakeCoverage } from '@/lib/montree/cms-bridge/document-source';
import {
  countDocumentData,
  hasData,
  type DocumentCounts,
  type DocumentKind,
  type DocumentSource,
} from '@/lib/cms/engine/doc-generator';

interface ClassDocumentsResponse {
  success: boolean;
  classroom: { id: string; name: string } | null;
  classrooms: { id: string; name: string }[];
  source: DocumentSource | null;
  coverage: IntakeCoverage | null;
  intakeAvailable: boolean;
}

/** One count line per card, in Montree's own words. Mirrors the CMS catalogue's
 *  `chipsFor`, but keyed to montree i18n — the screen is Montree's. */
function chipsFor(
  kind: DocumentKind,
  counts: DocumentCounts
): { key: TranslationKey; count: number }[] {
  switch (kind) {
    case 'class_list':
      return [
        { key: 'classDocs.count.children', count: counts.children },
        { key: 'classDocs.count.allergies', count: counts.allergies },
        { key: 'classDocs.count.dietary', count: counts.dietaryRequirements },
      ];
    case 'pickup_sheet':
      return [
        { key: 'classDocs.count.collectors', count: counts.collectors },
        { key: 'classDocs.count.missingCollector', count: counts.childrenWithoutCollector },
      ];
    case 'allergy_poster':
      return [
        { key: 'classDocs.count.allergies', count: counts.posterAllergies },
        { key: 'classDocs.count.epipen', count: counts.epipens },
      ];
    case 'dietary_sheet':
      return [{ key: 'classDocs.count.dietary', count: counts.dietaryRequirements }];
    case 'emergency_contacts':
      return [{ key: 'classDocs.count.contacts', count: counts.contacts }];
    case 'name_labels':
      return [{ key: 'classDocs.count.children', count: counts.children }];
  }
}

export default function ClassDocumentsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassDocumentsResponse | null>(null);

  useEffect(() => {
    if (!getSession()) router.push('/montree/login');
  }, [router]);

  const load = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/class-documents');
      if (!res.ok) throw new Error(`class-documents: ${res.status}`);
      const body = (await res.json()) as ClassDocumentsResponse;
      setData(body);
    } catch (err) {
      console.error('[class-documents] load failed:', err);
      toast.error(t('classDocs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)',
      }}
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const source = data?.source ?? null;
  const coverage = data?.coverage ?? null;
  const counts = source ? countDocumentData(source) : null;

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/montree/dashboard')}
          className="btn btn-ghost btn-md"
          aria-label={t('common.back')}
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          {t('classDocs.title')}
        </h1>
      </div>

      <div className="relative max-w-3xl mx-auto p-4 pb-28">
        <p className="text-sm text-white/60 mb-1">{t('classDocs.subtitle')}</p>
        {data?.classroom?.name ? (
          <p className="text-[13px] text-emerald-300/80 mb-4">{data.classroom.name}</p>
        ) : (
          <div className="mt-4 rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center">
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {t('classDocs.noClassroomTitle')}
            </h2>
            <p className="text-sm text-white/60">{t('classDocs.noClassroomBody')}</p>
          </div>
        )}

        {/* Roster empty — everything downstream is empty too, say it once, loudly. */}
        {source && source.children.length === 0 && (
          <div className="rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center mb-5">
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {t('classDocs.emptyRosterTitle')}
            </h2>
            <p className="text-sm text-white/60 mb-4">{t('classDocs.emptyRosterBody')}</p>
            <Link href="/montree/dashboard/students" className="btn btn-primary btn-sm">
              {t('classDocs.openStudents')}
            </Link>
          </div>
        )}

        {/* Intake coverage — the honest half of the empty state. */}
        {coverage && coverage.children > 0 && coverage.withoutCommittedIntake > 0 && (
          <div className="rounded-2xl border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.06)] p-4 mb-5">
            <p className="text-[13px] text-amber-200/90 font-medium mb-1">
              {t('classDocs.count.noIntake', { n: coverage.withoutCommittedIntake })}
            </p>
            <p className="text-[12.5px] text-white/55 mb-3">{t('classDocs.needIntakeBody')}</p>
            <Link href="/montree/dashboard/child-onboarding" className="btn btn-secondary btn-sm">
              {t('classDocs.openChildOnboarding')}
            </Link>
          </div>
        )}

        {/* Cards */}
        {source && counts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCUMENTS.map((entry) => {
              const labels = MONTREE_DOCUMENT_LABELS[entry.kind];
              const ready = hasData(entry.kind, counts);
              return (
                <Link
                  key={entry.kind}
                  href={`/montree/dashboard/class-documents/${entry.slug}`}
                  className="block rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4 hover:bg-white/[0.1] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15px] font-semibold text-white/95">
                      {t(labels.titleKey)}
                    </h2>
                    <span
                      className={
                        ready
                          ? 'text-[10.5px] uppercase tracking-wide text-emerald-300/90 shrink-0 mt-0.5'
                          : 'text-[10.5px] uppercase tracking-wide text-white/35 shrink-0 mt-0.5'
                      }
                    >
                      {ready ? t('classDocs.ready') : t('classDocs.emptyBadge')}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/55 mt-1.5 leading-relaxed">
                    {t(labels.descKey)}
                  </p>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                    {chipsFor(entry.kind, counts).map((chip) => (
                      <span key={chip.key} className="text-[11.5px] text-white/50">
                        {t(chip.key, { n: chip.count })}
                      </span>
                    ))}
                  </div>

                  {!ready && (
                    <p className="text-[11.5px] text-amber-200/70 mt-2.5">{t(labels.needKey)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* The paper does not speak every Montree language yet — say so, once. */}
        {source && !paperMatchesScreen(locale) && (
          <p className="text-[11.5px] text-white/35 mt-6 leading-relaxed">
            {t('classDocs.paperLocaleNote')}
          </p>
        )}

        {/* Intake table missing (migration pending) — a different, quieter truth. */}
        {data && data.intakeAvailable === false && (
          <p className="text-[11.5px] text-white/35 mt-3 leading-relaxed">
            {t('classDocs.intakeUnavailable')}
          </p>
        )}
      </div>
    </div>
  );
}
