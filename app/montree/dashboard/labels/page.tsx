// /montree/dashboard/labels/page.tsx
// Printable student labels — locker tags, name tags, cubby/bed labels
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';

type Student = {
  id: string;
  name: string;
  photo_url?: string;
};

type Template = 'locker' | 'nametag' | 'cubby';

const TEMPLATES: { id: Template; name: string; nameKey: string; icon: string; descKey: string; cols: number }[] = [
  { id: 'locker', name: '', nameKey: 'labels.locker_labels', icon: '🚪', descKey: 'labels.locker_desc', cols: 2 },
  { id: 'nametag', name: '', nameKey: 'labels.name_tags', icon: '📛', descKey: 'labels.nametag_desc', cols: 3 },
  { id: 'cubby', name: '', nameKey: 'labels.cubby_bed_tags', icon: '🛏️', descKey: 'labels.cubby_desc', cols: 4 },
];

// Soft pastel backgrounds for fallback letter circles
const COLORS = [
  '#e0f2fe', '#fce7f3', '#dcfce7', '#fef9c3', '#ede9fe',
  '#ffedd5', '#f0fdf4', '#fdf2f8', '#ecfeff', '#fef3c7',
];

export default function LabelsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template>('locker');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [schoolName, setSchoolName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoDragging, setLogoDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    const init = async () => {
      const sess = await getSession();
      if (!sess?.classroom?.id) { router.push('/montree/login'); return; }
      setSchoolName(sess.school?.name || '');

      try {
        const res = await fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`);
        const data = await res.json();
        const kids: Student[] = (data.children || []).sort((a: Student, b: Student) =>
          a.name.localeCompare(b.name)
        );
        setStudents(kids);
        setSelected(new Set(kids.map((s: Student) => s.id)));
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(students.map(s => s.id)));
  const selectNone = () => setSelected(new Set());

  const selectedStudents = students.filter(s => selected.has(s.id));
  const currentTemplate = TEMPLATES.find(t => t.id === template)!;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🏷️</div>
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
            <button onClick={() => router.back()} className="text-white/50 hover:text-white/80 p-1">
              ←
            </button>
            <span className="text-xl">🏷️</span>
            <h1 className="font-bold text-white/95">{t('labels.label_generator')}</h1>
          </div>
          <button
            onClick={() => window.print()}
            disabled={selectedStudents.length === 0}
            className="px-4 py-1.5 bg-[#34d399] text-[#04150c] rounded-lg text-sm font-medium hover:bg-[#2bbd88] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🖨️ {t('common.print')}
          </button>
        </div>

        <main className="relative p-4 max-w-3xl mx-auto space-y-6">
          {/* Template Picker */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">{t('labels.template')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => setTemplate(tmpl.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    template === tmpl.id
                      ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                      : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06] hover:border-[rgba(52,211,153,0.3)]'
                  }`}
                >
                  <div className="text-2xl mb-1">{tmpl.icon}</div>
                  <div className="font-medium text-sm text-white/90">{t(tmpl.nameKey)}</div>
                  <div className="text-xs text-white/40 mt-0.5">{t(tmpl.descKey)}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Class Logo Upload */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">{t('labels.class_logo') || 'Class Logo'}</h2>
            {logoDataUrl ? (
              <div className="flex items-center gap-4 p-3 bg-white/[0.06] rounded-xl border border-[rgba(52,211,153,0.15)]">
                <img src={logoDataUrl} alt="Class logo" className="w-16 h-16 object-contain rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium">{t('labels.logo_applied') || 'Logo will appear on all labels'}</p>
                </div>
                <button
                  onClick={() => setLogoDataUrl(null)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 flex-shrink-0"
                >
                  {t('labels.remove') || 'Remove'}
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setLogoDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleLogoFile(file);
                }}
                onClick={() => logoInputRef.current?.click()}
                className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  logoDragging
                    ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                    : 'border-[rgba(52,211,153,0.25)] bg-white/[0.06] hover:border-[rgba(52,211,153,0.4)] hover:bg-white/[0.08]'
                }`}
              >
                <div className="text-3xl mb-2">🖼️</div>
                <p className="text-sm text-white/70 font-medium">{t('labels.drop_logo') || 'Drop an image here or click to browse'}</p>
                <p className="text-xs text-white/40 mt-1">{t('labels.logo_formats') || 'JPEG, PNG — appears on every label'}</p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </section>

          {/* Student Selector */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                {t('labels.students')} ({selected.size}/{students.length})
              </h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-[#34d399] hover:underline">{t('labels.select_all')}</button>
                <span className="text-white/20">|</span>
                <button onClick={selectNone} className="text-xs text-white/40 hover:underline">{t('labels.none')}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {students.map((student, idx) => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                    selected.has(student.id)
                      ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                      : 'border-[rgba(52,211,153,0.12)] bg-white/[0.04] opacity-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: student.photo_url ? undefined : COLORS[idx % COLORS.length] }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} className="w-full h-full object-cover rounded-full" alt="" />
                    ) : (
                      <span className="text-slate-600">{student.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white/80 truncate">{student.name}</span>
                  {selected.has(student.id) && (
                    <span className="ml-auto text-[#34d399] text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Preview */}
          {selectedStudents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">{t('labels.preview')}</h2>
              {/* Paper preview surface — stays white (renders the printable sheet) */}
              <div className="bg-white rounded-xl border border-[rgba(52,211,153,0.15)] p-6 shadow-sm">
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${currentTemplate.cols}, 1fr)` }}
                >
                  {selectedStudents.map((student, idx) => (
                    <LabelCard
                      key={student.id}
                      student={student}
                      template={template}
                      colorIdx={students.indexOf(student)}
                      schoolName={schoolName}
                      logoUrl={logoDataUrl}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {selectedStudents.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <p>{t('labels.select_to_preview')}</p>
            </div>
          )}
        </main>
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block">
        <div
          className="print-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${currentTemplate.cols}, 1fr)`,
            gap: template === 'locker' ? '24px' : template === 'nametag' ? '16px' : '12px',
            padding: '20px',
          }}
        >
          {selectedStudents.map((student, idx) => (
            <LabelCard
              key={student.id}
              student={student}
              template={template}
              colorIdx={students.indexOf(student)}
              schoolName={schoolName}
              logoUrl={logoDataUrl}
              print
            />
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-grid {
            page-break-inside: auto;
          }
        }
      `}</style>
    </>
  );
}

// Individual label card
function LabelCard({
  student,
  template,
  colorIdx,
  schoolName,
  logoUrl,
  print = false,
}: {
  student: Student;
  template: Template;
  colorIdx: number;
  schoolName: string;
  logoUrl?: string | null;
  print?: boolean;
}) {
  const color = COLORS[colorIdx % COLORS.length];

  // Size configs per template
  const config = {
    locker: { photoSize: 'w-24 h-24', nameSize: 'text-xl', padding: 'p-6', border: 'border-2', logoSize: 'w-14 h-14' },
    nametag: { photoSize: 'w-16 h-16', nameSize: 'text-base', padding: 'p-4', border: 'border', logoSize: 'w-10 h-10' },
    cubby: { photoSize: 'w-12 h-12', nameSize: 'text-sm', padding: 'p-3', border: 'border', logoSize: 'w-8 h-8' },
  }[template];

  return (
    <div
      className={`rounded-2xl ${config.border} border-slate-300 ${config.padding} flex flex-col items-center text-center bg-white relative`}
      style={{ breakInside: 'avoid' }}
    >
      {/* Class logo — top-right corner */}
      {logoUrl && (
        <div className="absolute top-2 right-2">
          <img
            src={logoUrl}
            alt=""
            className={`${config.logoSize} object-contain`}
          />
        </div>
      )}

      {/* Photo / Letter circle */}
      <div
        className={`${config.photoSize} rounded-full flex items-center justify-center overflow-hidden mb-2 flex-shrink-0`}
        style={{ backgroundColor: student.photo_url ? undefined : color, border: '3px solid #e2e8f0' }}
      >
        {student.photo_url ? (
          <img src={student.photo_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className={`font-bold text-slate-600 ${template === 'locker' ? 'text-3xl' : template === 'nametag' ? 'text-2xl' : 'text-lg'}`}>
            {student.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <p className={`font-bold text-slate-800 ${config.nameSize} leading-tight`}>
        {student.name}
      </p>

      {/* School name (locker and nametag only) */}
      {template !== 'cubby' && schoolName && (
        <p className="text-xs text-slate-400 mt-1 truncate max-w-full">{schoolName}</p>
      )}
    </div>
  );
}
