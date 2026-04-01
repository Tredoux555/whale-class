// components/montree/home/WorkDetailSheet.tsx
// Bottom sheet showing full work details — materials, presentation steps, etc.
// Fetches from /api/montree/works/guide
'use client';

import { useState, useEffect } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

interface WorkDetailSheetProps {
  workName: string;
  area: string;
  classroomId?: string;
  onClose: () => void;
  onAskGuide: (message: string) => void;
}

interface WorkGuide {
  name: string;
  quick_guide: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
  materials: string[] | string | null;
  presentation_steps: Array<{ step?: number; title?: string; description?: string; tip?: string }> | string | null;
  control_of_error: string | null;
  video_search_term: string | null;
}

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border-b ${BIO.border.subtle}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${BIO.text.primary} hover:bg-white/5 transition-colors`}
      >
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <span className="text-base">{icon}</span>
          {title}
        </span>
        <svg
          className={`w-4 h-4 ${BIO.text.muted} transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className={`px-5 pb-4 text-sm ${BIO.text.secondary} leading-relaxed`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function WorkDetailSheet({
  workName,
  area,
  classroomId,
  onClose,
  onAskGuide,
}: WorkDetailSheetProps) {
  const { t } = useI18n();
  const [guide, setGuide] = useState<WorkGuide | null>(null);
  const [loading, setLoading] = useState(true);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchGuide = async () => {
      try {
        const params = new URLSearchParams({ name: workName });
        if (classroomId) params.set('classroom_id', classroomId);
        const res = await fetch(`/api/montree/works/guide?${params}`, {
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setGuide(data);
      } catch {
        // Guide fetch failed or aborted
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };
    fetchGuide();
    return () => abortController.abort();
  }, [workName, classroomId]);

  // Parse materials — could be string[] or string
  const materials: string[] = (() => {
    if (!guide?.materials) return [];
    if (Array.isArray(guide.materials)) return guide.materials;
    if (typeof guide.materials === 'string') {
      return guide.materials.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
    }
    return [];
  })();

  // Parse presentation steps
  const steps: Array<{ step?: number; title?: string; description?: string; tip?: string }> = (() => {
    if (!guide?.presentation_steps) return [];
    if (Array.isArray(guide.presentation_steps)) return guide.presentation_steps;
    if (typeof guide.presentation_steps === 'string') {
      try { return JSON.parse(guide.presentation_steps); } catch { return []; }
    }
    return [];
  })();

  const areaLabel = BIO.areaLabel[area] || area;
  const areaIcon = BIO.areaIcon[area] || '📦';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={`Details for ${workName}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className={`relative ${BIO.bg.surface} rounded-t-3xl max-h-[85vh] flex flex-col`}
        style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}
      >
        {/* Handle + Header */}
        <div className="px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

          {/* Work name */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${BIO.bg.mintSubtle} ${BIO.text.mint}`}>
                  {areaIcon} {areaLabel}
                </span>
              </div>
              <h2 className={`text-lg font-bold ${BIO.text.primary} leading-tight`}>
                {workName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${BIO.btn.ghost} ml-3`}
              aria-label={t('a11y.closeDetails' as TranslationKey)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-pulse text-2xl mb-2">📖</div>
                <p className={`text-sm ${BIO.text.secondary}`}>Loading guide...</p>
              </div>
            </div>
          ) : !guide ? (
            <div className="text-center py-12 px-6">
              <p className={`text-sm ${BIO.text.secondary}`}>
                Guide not available yet for this work.
              </p>
            </div>
          ) : (
            <>
              {/* What is this? */}
              {guide.parent_description && (
                <AccordionSection title="What is this?" icon="🌱" defaultOpen={true}>
                  <p>{guide.parent_description}</p>
                </AccordionSection>
              )}

              {/* Why it matters */}
              {guide.why_it_matters && (
                <AccordionSection title="Why it matters" icon="💡">
                  <p>{guide.why_it_matters}</p>
                </AccordionSection>
              )}

              {/* Materials */}
              {materials.length > 0 && (
                <AccordionSection title="What you need" icon="🧰">
                  <ul className="space-y-1.5">
                    {materials.map((m, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`${BIO.text.mint} mt-0.5`}>•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionSection>
              )}

              {/* How to present */}
              {steps.length > 0 && (
                <AccordionSection title="How to present" icon="👐">
                  <div className="space-y-4">
                    {steps.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={`w-6 h-6 rounded-full ${BIO.bg.mintSubtle} ${BIO.text.mint} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                          {s.step || i + 1}
                        </div>
                        <div className="flex-1">
                          {s.title && (
                            <p className={`font-medium ${BIO.text.primary} text-sm mb-0.5`}>{s.title}</p>
                          )}
                          {s.description && (
                            <p className="text-sm">{s.description}</p>
                          )}
                          {s.tip && (
                            <p className={`text-xs mt-1 ${BIO.text.amber} italic`}>💡 {s.tip}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionSection>
              )}

              {/* What to watch for */}
              {guide.control_of_error && (
                <AccordionSection title="What to watch for" icon="👀">
                  <p>{guide.control_of_error}</p>
                </AccordionSection>
              )}

              {/* Quick reference */}
              {guide.quick_guide && (
                <AccordionSection title="Quick reference" icon="📋">
                  <p className="whitespace-pre-wrap">{guide.quick_guide}</p>
                </AccordionSection>
              )}
            </>
          )}
        </div>

        {/* Footer — Ask Guru */}
        <div className={`px-5 py-4 border-t ${BIO.border.subtle} shrink-0`}>
          <button
            onClick={() => onAskGuide(`Tell me more about ${workName} — how can I help my child with this?`)}
            className={`w-full py-3 rounded-2xl ${BIO.btn.mint} text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}
          >
            <span>💬</span>
            Ask the Guru about this
          </button>
        </div>
      </div>
    </div>
  );
}
