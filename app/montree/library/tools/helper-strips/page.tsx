// /montree/library/tools/helper-strips/page.tsx
// Printable cut-out name strips for the "Classroom Jobs" wall poster —
// one strip per child, photo + first name, sized to pop into the poster's
// ~242mm × 42mm job slots.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { isBrandKitActive, type BrandKit } from '@/lib/montree/brand-kit/types';
import { Quicksand } from 'next/font/google';

type Student = {
  id: string;
  name: string;
  photo_url?: string;
};

type StripSize = 'poster' | 'small';

const quicksand = Quicksand({ subsets: ['latin'], weight: ['600', '700'] });

/**
 * 🚨 THE COPY, AND WHY IT LIVES HERE. Montree's i18n hook is strict across
 * all twelve locales — a new key must exist in every locale file before it
 * may be committed, and this build is not adding locale keys. So this tool
 * ships its own English via `tx()` (see below): the moment these keys land
 * in the twelve locale files, every string here becomes translated with no
 * further code change, and until then a teacher on another locale reads
 * clean English instead of a raw `helperStrips.title` token.
 */
const COPY: Record<string, string> = {
  'helperStrips.title': 'Helper Name Strips',
  'helperStrips.subtitle':
    'Sized for the Classroom Jobs poster — print, cut, and pop one on each job.',
  'helperStrips.sizeLabel': 'Strip size',
  'helperStrips.sizePoster': 'Poster strips (180×34mm)',
  'helperStrips.sizeSmall': 'Small strips (120×22mm, photo 16mm)',
  'helperStrips.noChildren': 'No children in your class yet.',
  'helperStrips.selectToPreview': 'Select at least one child above to see the preview.',
};

/** Ocean navy/blue palette that matches the whale-theme Classroom Jobs
 *  poster. Used whenever the school has no active brand kit. */
const DEFAULT_NAME_COLOR = '#1e3a5f';
const DEFAULT_BORDER_COLOR = '#7ab8d9';

/** Cut-guide dashed line and the scissors hint are deliberately kept a
 *  neutral, un-branded grey — a die line is a printing convention, not a
 *  place for a school's colours. */
const CUT_GUIDE_COLOR = '#B9C4C9';

type SizeConfig = {
  width: number; // mm — the strip's exact footprint, i.e. the cut line
  height: number;
  photo: number; // mm — photo circle diameter
  nameFontPt: number;
  outerRadius: number; // mm — corner rounding of the dashed cut line
  cardRadius: number; // mm — corner rounding of the colored frame + its white inset (same value on both, matching the three-part card generator's technique)
  cardBorder: number; // mm — thickness of the solid-color frame. This IS the "border": a filled color panel with padding, not a stroke — same technique components/card-generator/print-utils.ts uses for three-part cards, so the color reaches every edge of the card and touches the dashed cut line directly (no floating gap).
  innerGap: number; // mm — gap between photo and name inside the card
  innerPadX: number; // mm — left/right padding inside the card
  scissorsOffset: number;
  scissorsSize: number;
};

const SIZE_CONFIG: Record<StripSize, SizeConfig> = {
  poster: {
    width: 180,
    height: 34,
    photo: 26,
    nameFontPt: 26,
    outerRadius: 2.4,
    cardRadius: 3,
    cardBorder: 2.2,
    innerGap: 4,
    innerPadX: 4,
    scissorsOffset: 2,
    scissorsSize: 3.4,
  },
  small: {
    width: 120,
    height: 22,
    photo: 16,
    nameFontPt: 15,
    outerRadius: 1.8,
    cardRadius: 2.2,
    cardBorder: 1.6,
    innerGap: 2.5,
    innerPadX: 3,
    scissorsOffset: 1.6,
    scissorsSize: 2.6,
  },
};

export default function HelperNameStripsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [size, setSize] = useState<StripSize>('poster');

  /** `t()` with an English fallback. Montree's translator returns the raw
   *  key when it has no entry, so `value === key` is exactly "not
   *  translated yet" — see the COPY note above. */
  const tx = useCallback(
    (key: string, fallback?: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return fallback ?? COPY[key] ?? key;
      return value;
    },
    [t]
  );

  useEffect(() => {
    const init = async () => {
      const sess = await getSession();
      if (!sess?.classroom?.id) { router.push('/montree/login'); return; }

      try {
        const [childrenRes, brandRes] = await Promise.all([
          fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`),
          montreeApi('/api/montree/brand-kit').catch(() => null),
        ]);

        const childrenData = await childrenRes.json();
        const kids: Student[] = (childrenData.children || []).sort((a: Student, b: Student) =>
          a.name.localeCompare(b.name)
        );
        setStudents(kids);
        setSelected(new Set(kids.map((s: Student) => s.id)));

        if (brandRes && brandRes.ok) {
          const brandData = (await brandRes.json()) as { brandKit: BrandKit | null };
          setBrandKit(brandData.brandKit ?? null);
        }
      } catch {
        // Failed to load — students/brandKit stay at their empty defaults.
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(students.map((s) => s.id)));
  const selectNone = () => setSelected(new Set());

  const selectedStudents = students.filter((s) => selected.has(s.id));

  const activeKit = isBrandKitActive(brandKit) ? brandKit : null;
  const nameColor = activeKit ? activeKit.tokens.accent : DEFAULT_NAME_COLOR;
  const borderColor = activeKit ? activeKit.tokens.border : DEFAULT_BORDER_COLOR;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">✂️</div>
          <p className="text-white/40">{t('labels.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Screen UI — hidden when printing */}
      <div className="min-h-screen bg-[#0a1a0f] print:hidden relative">
        {/* Dark-register: one fixed radial emerald glow */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
        />
        {/* Header */}
        <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/montree/library/tools')} className="btn btn-ghost btn-icon btn-sm">
              ←
            </button>
            <span className="text-xl">✂️</span>
            <h1 className="font-bold text-white/95">{tx('helperStrips.title')}</h1>
          </div>
          <button
            onClick={() => window.print()}
            disabled={selectedStudents.length === 0}
            className="btn btn-primary btn-sm"
          >
            🖨️ {t('common.print')}
          </button>
        </div>

        <main className="relative p-4 max-w-3xl mx-auto space-y-6">
          <p className="text-sm text-white/60">{tx('helperStrips.subtitle')}</p>

          {/* Size toggle */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {tx('helperStrips.sizeLabel')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['poster', 'small'] as StripSize[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSize(opt)}
                  className={`p-3 rounded-xl border-2 text-left transition-all text-sm font-medium ${
                    size === opt
                      ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)] text-white/95'
                      : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06] text-white/70 hover:border-[rgba(52,211,153,0.3)]'
                  }`}
                >
                  {opt === 'poster' ? tx('helperStrips.sizePoster') : tx('helperStrips.sizeSmall')}
                </button>
              ))}
            </div>
          </section>

          {/* Student Selector — checkbox list, all checked by default */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                {t('labels.students')} ({selected.size}/{students.length})
              </h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="btn btn-ghost btn-sm">{t('labels.select_all')}</button>
                <span className="text-white/20">|</span>
                <button onClick={selectNone} className="btn btn-ghost btn-sm">{t('labels.none')}</button>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>{tx('helperStrips.noChildren')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-left ${
                      selected.has(student.id)
                        ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                        : 'border-[rgba(52,211,153,0.12)] bg-white/[0.04] opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4 shrink-0 accent-[#34d399]"
                    />
                    <PhotoOrInitials
                      photoUrl={student.photo_url}
                      name={student.name}
                      size="2rem"
                      bgColor="#e0f2fe"
                      textColor="#334155"
                    />
                    <span className="text-sm font-medium text-white/80 truncate">{student.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Preview */}
          {selectedStudents.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
                {t('labels.preview')}
              </h2>
              <div className="bg-white rounded-xl border border-[rgba(52,211,153,0.15)] p-6 shadow-sm overflow-x-auto">
                <div style={{ width: '210mm', margin: '0 auto' }}>
                  <StripsColumn
                    students={selectedStudents}
                    size={size}
                    nameColor={nameColor}
                    borderColor={borderColor}
                  />
                </div>
              </div>
            </section>
          ) : (
            <div className="text-center py-8 text-white/40">
              <p>{tx('helperStrips.selectToPreview')}</p>
            </div>
          )}
        </main>
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block">
        <StripsColumn
          students={selectedStudents}
          size={size}
          nameColor={nameColor}
          borderColor={borderColor}
        />
      </div>

      {/* Print styles — top-level, not inside a conditional (locked Turbopack rule). */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .helper-strips-column {
            page-break-inside: auto;
          }
        }
      `}</style>
    </>
  );
}

// Shared screen preview + print column — one strip per child, stacked in a
// zero-gap grid so each strip's colored frame touches the next one's
// directly (same technique the 3-part card generator's label grid uses:
// gap: 0 + no per-cell margin means adjacent colored edges meet exactly,
// with nothing floating between them).
function StripsColumn({
  students,
  size,
  nameColor,
  borderColor,
}: {
  students: Student[];
  size: StripSize;
  nameColor: string;
  borderColor: string;
}) {
  const cfg = SIZE_CONFIG[size];

  return (
    <div
      className="helper-strips-column"
      style={{
        display: 'grid',
        gridTemplateColumns: `${cfg.width}mm`,
        gap: 0,
        width: `${cfg.width}mm`,
        margin: '0 auto',
      }}
    >
      {students.map((student) => (
        <NameStrip
          key={student.id}
          student={student}
          size={size}
          nameColor={nameColor}
          borderColor={borderColor}
        />
      ))}
    </div>
  );
}

// A single cut-out strip: dashed die line + scissors hint on the outside,
// a solid rounded-rect card (photo circle + first name) on the inside.
function NameStrip({
  student,
  size,
  nameColor,
  borderColor,
}: {
  student: Student;
  size: StripSize;
  nameColor: string;
  borderColor: string;
}) {
  const cfg = SIZE_CONFIG[size];
  const firstName = student.name.trim().split(/\s+/)[0] || student.name;

  return (
    <div
      style={{
        position: 'relative',
        width: `${cfg.width}mm`,
        height: `${cfg.height}mm`,
        boxSizing: 'border-box',
        border: `0.35mm dashed ${CUT_GUIDE_COLOR}`,
        borderRadius: `${cfg.outerRadius}mm`,
        margin: 0,
        breakInside: 'avoid',
      }}
    >
      {/* Scissors cut hint — sits on the dashed line's top-left corner */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: `-${cfg.scissorsOffset}mm`,
          left: `-${cfg.scissorsOffset}mm`,
          fontSize: `${cfg.scissorsSize}mm`,
          lineHeight: 1,
          background: '#fff',
          padding: '0 0.3mm',
        }}
      >
        ✂️
      </span>

      {/* Colored frame — the "border," built the same way the three-part
         card generator builds its border: the color IS the background of
         this box, and the box is padded (not stroked) so it reads as a
         thick solid band. No outer padding sits between this and the
         dashed cut line above, so the color fills the strip edge-to-edge
         and touches the cut line directly instead of floating inside it. */}
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          background: borderColor,
          borderRadius: `${cfg.cardRadius}mm`,
          padding: `${cfg.cardBorder}mm`,
        }}
      >
        {/* White inset — the actual card content, sitting inside the
           colored frame exactly like print-utils.ts's .image-area /
           .label-area sit inside .card. */}
        <div
          className={quicksand.className}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: `${cfg.innerGap}mm`,
            padding: `0 ${cfg.innerPadX}mm`,
            background: '#fff',
            borderRadius: `${cfg.cardRadius}mm`,
          }}
        >
          <PhotoOrInitials
            photoUrl={student.photo_url}
            name={firstName}
            size={`${cfg.photo}mm`}
            borderColor={borderColor}
            bgColor={`${borderColor}26`}
            textColor={nameColor}
            fontSize={`${cfg.photo * 0.42}mm`}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: `${cfg.nameFontPt}pt`,
              color: nameColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1,
            }}
          >
            {firstName}
          </span>
        </div>
      </div>
    </div>
  );
}

// Photo circle with a graceful initials fallback — used in both the
// checkbox selector (small, screen-only) and the printed strip (mm-sized).
// A 404'd or missing photo silently falls back to the child's initial.
function PhotoOrInitials({
  photoUrl,
  name,
  size,
  borderColor,
  bgColor,
  textColor,
  fontSize,
}: {
  photoUrl?: string;
  name: string;
  size: string;
  borderColor?: string;
  bgColor?: string;
  textColor?: string;
  fontSize?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const showPhoto = !!photoUrl && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: borderColor ? `0.4mm solid ${borderColor}` : undefined,
        background: showPhoto ? undefined : (bgColor || '#e2e8f0'),
      }}
    >
      {showPhoto ? (
        <img
          src={getProxyUrl(photoUrl as string)}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontWeight: 700, color: textColor || '#475569', fontSize: fontSize || '1rem' }}>
          {initial}
        </span>
      )}
    </div>
  );
}
