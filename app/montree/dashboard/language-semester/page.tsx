// app/montree/dashboard/language-semester/page.tsx
// "Language Semester Report" — select children, mark graduating vs returning,
// Sonnet writes the official school PPTX report for each one.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { useI18n } from '@/lib/montree/i18n/context';

interface Child {
  id: string;
  name: string;
  photo_url: string | null;
}

interface WorkRow {
  name: string;
  status: string; // 'P' | 'Pr' | 'MD'
}

interface ChildTextResult {
  name: string;
  works: WorkRow[];
  // 1M fields
  paragraph?: string;
  // 6M fields
  opening?: string;
  circle?: string;
  closing?: string;
}

interface TextResponse {
  children: ChildTextResult[];
  errors: Array<{ child_id: string; name: string; error: string }>;
}

// ── CopyBlock ──────────────────────────────────────────────────────────────
function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: select all in textarea
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <button
          onClick={copy}
          className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
        {text}
      </div>
    </div>
  );
}

// Default graduating names — pre-checked on page load, teacher can toggle before generating.
const DEFAULT_GRADUATING = new Set([
  'Amy', 'Austin', 'Eric', 'Gengerlyn', 'Hayden', 'Henry',
  'Joey', 'Kayla', 'Kevin', 'Lucky', 'Rachel', 'Stella',
]);

export default function LanguageSemesterPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Track which children are marked as graduating — keyed by child ID
  const [graduating, setGraduating] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [gettingText, setGettingText] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<TextResponse | null>(null);
  const [months, setMonths] = useState<1 | 6>(6);
  const textResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (!sess) {
        router.push('/montree/login');
        return;
      }
      setSession(sess);
    })();
  }, [router]);

  const loadChildren = useCallback(async () => {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/children?classroom_id=${session.classroom.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load children');
      const data = await res.json();
      const kids: Child[] = data.children || [];
      setChildren(kids);
      // Pre-fill graduating set from defaults (match by name)
      const gradIds = new Set<string>();
      for (const c of kids) {
        if (DEFAULT_GRADUATING.has(c.name)) gradIds.add(c.id);
      }
      setGraduating(gradIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) loadChildren();
  }, [session, loadChildren]);

  const toggleAll = () => {
    if (selected.size === children.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(children.map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleGraduating = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't toggle the checkbox
    const next = new Set(graduating);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGraduating(next);
  };

  const handleGenerate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    setProgress(t('languageSemester.generatingProgress', { count: selected.size }));
    try {
      const res = await fetch('/api/montree/reports/language-semester/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_ids: Array.from(selected),
          graduating_ids: Array.from(graduating),
          months,
        }),
      });
      if (!res.ok) {
        let msg = `Generation failed (${res.status})`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename =
        match?.[1] ||
        (selected.size === 1
          ? 'Language_Semester_Report.pptx'
          : `Language_Semester_Reports_${new Date().toISOString().slice(0, 10)}.zip`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const errCount = parseInt(res.headers.get('X-Report-Errors') || '0', 10);
      setProgress(
        errCount > 0
          ? t('languageSemester.completeWithErrors', { count: errCount })
          : t('languageSemester.completeSuccess')
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleGetText = async () => {
    if (selected.size === 0) return;
    setGettingText(true);
    setError(null);
    setTextResult(null);
    setProgress('Generating text… this takes about 30s per child.');
    try {
      const res = await fetch('/api/montree/reports/language-semester/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_ids: Array.from(selected),
          graduating_ids: Array.from(graduating),
          format: 'text',
          months,
        }),
      });
      if (!res.ok) {
        let msg = `Generation failed (${res.status})`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const data: TextResponse = await res.json();
      setTextResult(data);
      setProgress('');
      // Scroll to results
      setTimeout(() => textResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress('');
    } finally {
      setGettingText(false);
    }
  };

  const gradCount = children.filter(c => graduating.has(c.id)).length;
  const retCount = children.length - gradCount;

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-6 pt-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {t('languageSemester.pageTitle')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('languageSemester.pageDescription')}
          </p>
        </div>

        {/* Time period selector */}
        <div className="flex gap-2 mb-5">
          {([
            { m: 1, label: '1M', sub: 'Monthly Academic' },
            { m: 6, label: '6M', sub: 'Parent Semester Report' },
          ] as const).map(({ m, label, sub }) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors text-left ${
                months === m
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
              }`}
            >
              <span className="block text-base">{label}</span>
              <span className={`block text-xs font-normal mt-0.5 ${months === m ? 'text-violet-200' : 'text-gray-400'}`}>{sub}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 mb-1">
              <span className="text-sm text-gray-700">
                {selected.size > 0
                  ? t('languageSemester.selectionCount', { selected: selected.size, total: children.length })
                  : t('languageSemester.selectChildren')}
              </span>
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {selected.size === children.length
                  ? t('languageSemester.deselectAll')
                  : t('languageSemester.selectAll')}
              </button>
            </div>

            {/* Graduating / Returning legend — only shown for 6M (1M is academic, no grad distinction) */}
            {months === 6 && (
              <div className="flex items-center gap-4 px-4 py-2 mb-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                  {t('languageSemester.graduatingLabel', { count: gradCount })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400" />
                  {t('languageSemester.returningLabel', { count: retCount })}
                </span>
                <span className="text-gray-400 ml-auto">
                  {t('languageSemester.toggleHint')}
                </span>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 mb-4">
              {children.map((c) => {
                const checked = selected.has(c.id);
                const isGrad = graduating.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      checked ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                      }`}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {/* Avatar */}
                    {c.photo_url ? (
                      <img
                        src={getProxyUrl(c.photo_url)}
                        alt={c.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Name */}
                    <span className="text-sm font-medium text-gray-900 flex-1">{c.name}</span>
                    {/* Graduating / Returning badge — only relevant for 6M parent report */}
                    {months === 6 && (
                      <span
                        onClick={(e) => toggleGraduating(c.id, e)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors flex-shrink-0 ${
                          isGrad
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                        }`}
                      >
                        {isGrad
                          ? t('languageSemester.graduatingBadge')
                          : t('languageSemester.returningBadge')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {progress && !error && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
                {progress}
              </div>
            )}

            {/* Action buttons — 1M: text only; 6M: text + PPTX */}
            <div className="flex gap-3">
              <button
                onClick={handleGetText}
                disabled={selected.size === 0 || generating || gettingText}
                className={`py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${months === 1 ? 'flex-1' : 'flex-1'}`}
              >
                {gettingText ? 'Getting text…' : `Get Text (${selected.size})`}
              </button>
              {months === 6 && (
                <button
                  onClick={handleGenerate}
                  disabled={selected.size === 0 || generating || gettingText}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating
                    ? t('languageSemester.generatingWait')
                    : t('languageSemester.generateDownload', { count: selected.size })}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t('languageSemester.timeEstimate')}
            </p>

            {/* Text results panel */}
            {textResult && (
              <div ref={textResultRef} className="mt-6 space-y-6">
                {textResult.errors.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg">
                    {textResult.errors.length} child{textResult.errors.length > 1 ? 'ren' : ''} failed:{' '}
                    {textResult.errors.map(e => e.name).join(', ')}
                  </div>
                )}
                {textResult.children.map((child) => (
                  <div key={child.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Child header */}
                    <div className="bg-violet-50 border-b border-violet-100 px-4 py-3">
                      <h2 className="font-bold text-violet-900 text-lg">{child.name}</h2>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Works table */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language Works</p>
                        <div className="rounded-lg border border-gray-100 overflow-hidden">
                          {child.works.length === 0 ? (
                            <p className="text-sm text-gray-400 px-3 py-2 italic">No language works recorded</p>
                          ) : (
                            child.works.map((w, i) => (
                              <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                <span className="text-gray-800">{w.name}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  w.status === 'MD' ? 'bg-emerald-100 text-emerald-700' :
                                  w.status === 'Pr' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {w.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Report text — branched by period */}
                      {months === 1 ? (
                        /* 1M: single paragraph academic report */
                        <CopyBlock label="Monthly Academic Report" text={child.paragraph ?? ''} />
                      ) : (
                        /* 6M: three-part parent letter */
                        <>
                          <CopyBlock label="Opening" text={child.opening ?? ''} />
                          <CopyBlock label="Circle (3 points)" text={child.circle ?? ''} />
                          <CopyBlock label="Closing" text={child.closing ?? ''} />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
