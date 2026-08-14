// app/montree/dashboard/class-documents/[doc]/page.tsx
// ============================================================================
// ONE DOCUMENT, PRINT-READY — the Montree side. CMS phase 6, the bridge.
// ============================================================================
// Deliberately thin, exactly like its CMS twin: fetch rows, hand them to a PURE
// generator, hand the model to a view. No business logic lives here — the
// sorting, the grouping, the "who may collect" filter and the severity ordering
// are all decided once in `lib/cms/engine/doc-generator`, where they are tested.
//
// 🚨 TWO BRANDS, ONE PAGE, AND THE LINE BETWEEN THEM IS THE PAPER'S EDGE.
// Above the sheet: Montree's dark-forest toolbar and Montree's twelve-locale
// i18n. On the sheet: the shared CMS paper, rendered with the CMS labels
// mechanism (`getT`), because those components' strings ARE CMS translation
// keys. CMS ships en/ru/ar complete; every other Montree locale prints English.
// The index page says so, in the teacher's language.
//
// Print: the shared ink (`components/cms/documents/print-css.ts`) is injected as
// a <style> tag by DocumentPaper — never globals.css, because `@page` cannot be
// scoped and a global A4 rule would hijack every print in the repo.
//
// 🚨 THE SCHOOL'S OWN BRAND IS A THIRD LAYER, AND IT IS THE PAPER'S. The kit
// comes down with the same read as the roster (`school.brandKit`), so a themed
// sheet renders in one pass and never flashes unbranded first. It is passed
// through untouched: this page decides nothing about the theme except which
// document is being printed, because that is the one thing the theme cannot
// know for itself.

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import DocumentPaper from '@/components/montree/class-documents/DocumentPaper';
import { DocumentBody } from '@/components/cms/documents/DocumentBody';
import { documentBySlug, paperLocaleFor } from '@/lib/montree/cms-bridge/catalogue';
import type { IntakeCoverage } from '@/lib/montree/cms-bridge/document-source';
import type { BrandKit } from '@/lib/montree/brand-kit/types';
import { generate, type DocumentSource } from '@/lib/cms/engine/doc-generator';
import { getT } from '@/lib/cms/i18n/t';

interface ClassDocumentsResponse {
  success: boolean;
  classroom: { id: string; name: string } | null;
  classrooms: { id: string; name: string }[];
  source: DocumentSource | null;
  coverage: IntakeCoverage | null;
  intakeAvailable: boolean;
  /** Added with the School Brand Kit. Optional on purpose: a cached response
   *  from before the feature — or a project whose school row could not be read
   *  — simply has no `school`, and the sheet prints plain. */
  school?: {
    id: string;
    name: string | null;
    logoUrl: string | null;
    brandKit: BrandKit | null;
  } | null;
}

/** "Tuesday 11 August 2026", in the PAPER's language — it is printed. */
function formatDate(isoDate: string, locale: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone,
    }).format(new Date(`${isoDate}T12:00:00Z`));
  } catch {
    return isoDate;
  }
}

export default function ClassDocumentPage() {
  const router = useRouter();
  const params = useParams<{ doc: string }>();
  const { t, locale } = useI18n();

  const slug = typeof params?.doc === 'string' ? params.doc : '';
  const entry = documentBySlug(slug);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassDocumentsResponse | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [printedByName, setPrintedByName] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/montree/login');
      return;
    }
    setPrintedByName(session.teacher?.name || null);
  }, [router]);

  const load = useCallback(
    async (classroomId: string) => {
      try {
        const qs = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : '';
        const res = await montreeApi(`/api/montree/class-documents${qs}`);
        if (!res.ok) throw new Error(`class-documents: ${res.status}`);
        const body = (await res.json()) as ClassDocumentsResponse;
        setData(body);
        if (body.classroom?.id) setRoomId(body.classroom.id);
      } catch (err) {
        console.error('[class-documents/doc] load failed:', err);
        toast.error(t('classDocs.loadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!entry) {
      setLoading(false);
      return;
    }
    void load('');
    // Deliberately once: the room switcher calls `load` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  // The paper's translator. CMS keys, CMS locales — see the header note.
  const paperLocale = paperLocaleFor(locale);
  const paperT = useMemo(() => getT(paperLocale), [paperLocale]);

  const source = data?.source ?? null;
  const brandKit = data?.school?.brandKit ?? null;

  const model = useMemo(() => {
    if (!entry || !source) return null;
    return generate(entry.kind, source, {
      locale: paperLocale,
      pageSize: 'A4',
      // A sheet of phone numbers should say whose copy it is without being
      // turned over. A footer line, never a watermark.
      printedByName,
      generatedAt: new Date().toISOString(),
    });
  }, [entry, source, paperLocale, printedByName]);

  const selectRoom = useCallback(
    (id: string) => {
      setRoomId(id);
      setLoading(true);
      void load(id);
    },
    [load]
  );

  if (!entry) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('classDocs.unknownDoc')}</h1>
          <button
            onClick={() => router.push('/montree/dashboard/class-documents')}
            className="btn btn-secondary btn-sm"
          >
            {t('classDocs.back')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!source || !model) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6">
        <Toaster position="top-center" />
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-white/95 mb-3">
            {t('classDocs.noClassroomTitle')}
          </h1>
          <p className="text-white/60 mb-6">{t('classDocs.noClassroomBody')}</p>
          <button
            onClick={() => router.push('/montree/dashboard/class-documents')}
            className="btn btn-secondary btn-sm"
          >
            {t('classDocs.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      {/* The title is ON the paper, so it speaks the paper's language, not
          Montree's: a German heading over English column headings would be a
          sheet in two languages. One language wins, and it is the sheet's. */}
      <DocumentPaper
        meta={model.meta}
        title={paperT(entry.titleKey)}
        dateLabel={formatDate(source.date, paperLocale, source.school.timezone)}
        t={paperT}
        generatedByLabel={t('classDocs.generatedBy')}
        backLabel={t('classDocs.back')}
        printLabel={t('classDocs.print')}
        roomsLabel={t('classDocs.rooms')}
        onBack={() => router.push('/montree/dashboard/class-documents')}
        rooms={data?.classrooms ?? []}
        activeRoomId={roomId}
        onSelectRoom={selectRoom}
        brandKit={brandKit}
        // 🚨 The one theme decision this page owns, because it is the only one
        // that depends on WHICH document is printing: a sheet of cut-out labels
        // gets no ghost behind it. See DocumentPaper's prop for the why.
        suppressWatermark={entry.kind === 'name_labels'}
      >
        <DocumentBody doc={model} t={paperT} />
      </DocumentPaper>
    </>
  );
}
