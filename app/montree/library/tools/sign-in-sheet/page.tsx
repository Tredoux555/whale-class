// /montree/library/tools/sign-in-sheet/page.tsx
// Printable parent sign-in sheet — Whale Class brand style
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { Quicksand } from 'next/font/google';

type Student = {
  id: string;
  name: string;
  photo_url?: string;
};

const quicksand = Quicksand({ subsets: ['latin'], weight: ['600', '700'] });

const GUEST_ROW_OPTIONS = [0, 2, 4];

export default function SignInSheetPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [title, setTitle] = useState("Parents' Open Day");
  const [guestRows, setGuestRows] = useState(2);

  useEffect(() => {
    const init = async () => {
      const sess = await getSession();
      if (!sess?.classroom?.id) { router.push('/montree/login'); return; }
      setSchoolName(sess.school?.name || '');
      setClassroomName(sess.classroom?.name || '');

      try {
        const res = await fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`);
        const data = await res.json();
        const kids: Student[] = (data.children || []).sort((a: Student, b: Student) =>
          a.name.localeCompare(b.name)
        );
        setStudents(kids);
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">✍️</div>
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
            <span className="text-xl">✍️</span>
            <h1 className="font-bold text-white/95">{t('tools.sign_in_sheet')}</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm"
          >
            🖨️ {t('common.print')}
          </button>
        </div>

        <main className="relative p-4 max-w-3xl mx-auto space-y-6">
          {/* Settings */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2 block">
                {t('signin.event_title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 focus:outline-none focus:border-[#34d399]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2 block">
                {t('signin.guest_rows')}
              </label>
              <select
                value={guestRows}
                onChange={(e) => setGuestRows(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/90 focus:outline-none focus:border-[#34d399]"
              >
                {GUEST_ROW_OPTIONS.map((n) => (
                  <option key={n} value={n} className="bg-[#0a1a0f]">{n}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Preview */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">{t('labels.preview')}</h2>
            <div className="bg-white rounded-xl border border-[rgba(52,211,153,0.15)] p-6 shadow-sm overflow-x-auto">
              <div style={{ width: '210mm', margin: '0 auto' }}>
                <SignInSheet
                  title={title}
                  students={students}
                  guestRows={guestRows}
                  classroomName={classroomName}
                  schoolName={schoolName}
                  t={t}
                />
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block">
        <SignInSheet
          title={title}
          students={students}
          guestRows={guestRows}
          classroomName={classroomName}
          schoolName={schoolName}
          t={t}
        />
      </div>

      {/* Print styles — top-level, not inside a conditional (locked Turbopack rule). */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}

// Shared screen preview + print sheet component
function SignInSheet({
  title,
  students,
  guestRows,
  classroomName,
  schoolName,
  t,
}: {
  title: string;
  students: Student[];
  guestRows: number;
  classroomName: string;
  schoolName: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const guestRowIndexes = Array.from({ length: guestRows }, (_, i) => i);

  return (
    <div
      style={{
        background: '#FFFDF8',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '277mm',
        width: '100%',
      }}
    >
      {/* Header band */}
      <div
        style={{
          position: 'relative',
          flex: 'none',
          height: '40mm',
          background: 'linear-gradient(135deg,#14503A 0%,#1D6B48 45%,#2E9B6B 100%)',
          padding: '7mm 0 0 12mm',
          color: '#fff',
        }}
      >
        <div
          className={quicksand.className}
          style={{ fontWeight: 700, fontSize: '23pt', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1 }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '12.5pt',
            lineHeight: 1,
            marginTop: '2mm',
            opacity: 0.93,
          }}
        >
          {t('signin.subtitle')}
        </div>
        <div
          className={quicksand.className}
          style={{
            fontWeight: 600,
            fontSize: '10pt',
            letterSpacing: '0.08em',
            marginTop: '2.5mm',
          }}
        >
          {(classroomName || schoolName)} · {t('signin.date_label')}: ____________________
        </div>

        {/* Class emblem */}
        <div
          style={{
            position: 'absolute',
            top: '5.5mm',
            right: '11mm',
            width: '27mm',
            height: '27mm',
            background: '#fff',
            border: '1.2mm solid #fff',
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          <img
            src="/tools/labels/whale-class-emblem.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Wave carved into the bottom edge of the gradient band */}
        <svg
          preserveAspectRatio="none"
          viewBox="0 0 100 6"
          style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: '4mm' }}
        >
          <path d="M0 3 Q 12.5 0, 25 3 T 50 3 T 75 3 T 100 3 L100 6.2 L0 6.2 Z" fill="#FFFDF8" />
        </svg>
      </div>

      {/* Table */}
      <table
        style={{
          margin: '6mm 12mm 0',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          width: 'calc(100% - 24mm)',
        }}
      >
        <colgroup>
          <col style={{ width: '8mm' }} />
          <col style={{ width: '52mm' }} />
          <col style={{ width: '52mm' }} />
          <col style={{ width: '52mm' }} />
          <col style={{ width: '22mm' }} />
        </colgroup>
        <thead>
          <tr>
            <th
              className={quicksand.className}
              style={{ fontWeight: 700, fontSize: '9.5pt', color: '#14503A', textAlign: 'left', letterSpacing: '0.05em', padding: '0 0 2mm' }}
            >
              #
            </th>
            <th
              className={quicksand.className}
              style={{ fontWeight: 700, fontSize: '9.5pt', color: '#14503A', textAlign: 'left', letterSpacing: '0.05em', padding: '0 0 2mm' }}
            >
              {t('signin.col_child')}
            </th>
            <th
              className={quicksand.className}
              style={{ fontWeight: 700, fontSize: '9.5pt', color: '#14503A', textAlign: 'left', letterSpacing: '0.05em', padding: '0 0 2mm', borderLeft: '0.45mm solid #CBDCD1' }}
            >
              {t('signin.col_parent')}
            </th>
            <th
              className={quicksand.className}
              style={{ fontWeight: 700, fontSize: '9.5pt', color: '#14503A', textAlign: 'left', letterSpacing: '0.05em', padding: '0 0 2mm', borderLeft: '0.45mm solid #CBDCD1' }}
            >
              {t('signin.col_signature')}
            </th>
            <th
              className={quicksand.className}
              style={{ fontWeight: 700, fontSize: '9.5pt', color: '#14503A', textAlign: 'left', letterSpacing: '0.05em', padding: '0 0 2mm', borderLeft: '0.45mm solid #CBDCD1' }}
            >
              {t('signin.col_time')}
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => (
            <tr
              key={student.id}
              style={{
                height: '10.6mm',
                borderBottom: '0.45mm solid #DCE7DF',
                background: idx % 2 === 1 ? '#F4F9F4' : 'transparent',
                breakInside: 'avoid',
              }}
            >
              <td
                className={quicksand.className}
                style={{ fontWeight: 600, fontSize: '9pt', color: '#9FC7B0', textAlign: 'center' }}
              >
                {idx + 1}
              </td>
              <td
                className={quicksand.className}
                style={{ fontWeight: 700, fontSize: '12.5pt', color: '#123528', whiteSpace: 'nowrap' }}
              >
                {student.name}
              </td>
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
            </tr>
          ))}
          {guestRowIndexes.map((i) => (
            <tr
              key={`guest-${i}`}
              style={{
                height: '10.6mm',
                borderBottom: '0.45mm solid #DCE7DF',
                background: (students.length + i) % 2 === 1 ? '#F4F9F4' : 'transparent',
                breakInside: 'avoid',
              }}
            >
              <td
                className={quicksand.className}
                style={{ fontWeight: 600, fontSize: '9pt', color: '#9FC7B0', textAlign: 'center' }}
              >
                ☆
              </td>
              <td style={{ fontSize: '9.5pt', color: '#6B8F7C' }}>
                {t('signin.guest')}
              </td>
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
              <td style={{ borderLeft: '0.45mm solid #CBDCD1' }} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '5.5mm',
          gap: '1.6mm',
        }}
      >
        <svg width="70" height="7" viewBox="0 0 70 7">
          <path
            d="M1 4 Q 9.75 -1, 18.5 4 T 36 4 T 53.5 4 T 71 4"
            fill="none"
            stroke="#9FC7B0"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <div
          className={quicksand.className}
          style={{
            fontWeight: 700,
            fontSize: '7.5pt',
            letterSpacing: '0.3em',
            color: '#6B8F7C',
            textTransform: 'uppercase',
          }}
        >
          {classroomName} · Montree
        </div>
      </div>
    </div>
  );
}
