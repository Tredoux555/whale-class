// components/montree/home/TodayCapture.tsx
// The camera-first Today surface — the app's front door (vision plan, Jul 2 2026).
// One gesture: show Ivy. Photo (shutter), voice (mic), or words (keyboard).
// Carries the Corner's soul as ONE quiet chip: the spotlight work Ivy has set.
//
// COPY RULE: parent-facing. No area names, no status words, no shelf language.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { compressImage } from '@/lib/montree/cache';
import VoiceNoteButton from '@/components/montree/guru/VoiceNoteButton';

interface SpotlightWork {
  work_name: string;
  area: string;
}

interface TodayCaptureProps {
  childId: string;
  childName: string;
  onPhoto: (file: File) => void;
  onWords: (text: string) => void;
  onKeyboard: () => void;
  onSpotlightTap: (work: SpotlightWork) => void;
  refreshTrigger?: number;
}

function Bracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: React.CSSProperties = { position: 'absolute', width: 26, height: 26 };
  const line = '2px solid rgba(74,222,128,0.55)';
  if (pos === 'tl') Object.assign(base, { top: 0, left: 0, borderTop: line, borderLeft: line, borderTopLeftRadius: 8 });
  if (pos === 'tr') Object.assign(base, { top: 0, right: 0, borderTop: line, borderRight: line, borderTopRightRadius: 8 });
  if (pos === 'bl') Object.assign(base, { bottom: 0, left: 0, borderBottom: line, borderLeft: line, borderBottomLeftRadius: 8 });
  if (pos === 'br') Object.assign(base, { bottom: 0, right: 0, borderBottom: line, borderRight: line, borderBottomRightRadius: 8 });
  return <div style={base} />;
}

export default function TodayCapture({
  childId,
  childName,
  onPhoto,
  onWords,
  onKeyboard,
  onSpotlightTap,
  refreshTrigger,
}: TodayCaptureProps) {
  const [spotlight, setSpotlight] = useState<SpotlightWork | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstName = childName.split(' ')[0] || 'your child';

  // The Corner's spotlight, compressed to a chip: the most-recently-set work
  // Ivy has out that the child hasn't yet made her own.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/montree/shelf?child_id=${childId}`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled || !Array.isArray(d.shelf)) return;
        const candidates = (d.shelf as Array<{ work_name: string; area: string; status: string; set_at: string }>)
          .filter((w) => w.work_name && w.status !== 'mastered')
          .sort((a, b) => new Date(b.set_at || 0).getTime() - new Date(a.set_at || 0).getTime());
        setSpotlight(candidates[0] ? { work_name: candidates[0].work_name, area: candidates[0].area } : null);
      } catch { /* the chip is optional — never block the camera */ }
    })();
    return () => { cancelled = true; };
  }, [childId, refreshTrigger]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose a photo.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('That photo is too large.'); return; }
    setPreparing(true);
    try {
      const compressed = await compressImage(file).catch(() => file);
      onPhoto(compressed);
    } finally {
      setPreparing(false);
    }
  }, [onPhoto]);

  return (
    <div className={`h-full flex flex-col ${BIO.bg.gradient}`}>
      {/* The frame — show me */}
      <div className="flex-1 px-4 pt-4 pb-3 min-h-0">
        <div className="h-full rounded-2xl relative flex items-center justify-center" style={{ background: 'rgba(4,12,7,0.55)' }}>
          <div className="absolute" style={{ inset: 14 }}>
            <Bracket pos="tl" /><Bracket pos="tr" /><Bracket pos="bl" /><Bracket pos="br" />
          </div>
          <div className="text-center px-8 relative z-10">
            <svg className="w-8 h-8 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#e8f2ec' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className={`mt-3 text-[15px] leading-relaxed ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              Show me what {firstName} is doing
            </p>
            <p className={`mt-1.5 text-xs ${BIO.text.muted}`}>or just tell me</p>
          </div>
        </div>
      </div>

      {/* Today's one thing — the spotlight chip */}
      <div className="text-center px-4 pb-3 shrink-0" style={{ minHeight: 34 }}>
        {spotlight && (
          <button
            onClick={() => onSpotlightTap(spotlight)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all active:scale-95"
            style={{ border: '1px solid rgba(74,222,128,0.35)', color: '#8fe6c3', background: 'rgba(74,222,128,0.06)' }}
          >
            <span>✨</span>
            <span>Today: {spotlight.work_name}</span>
            <span className="opacity-60">· how?</span>
          </button>
        )}
      </div>

      {/* Mic · shutter · keyboard */}
      <div className="flex items-center justify-center gap-8 pb-5 shrink-0">
        <VoiceNoteButton onTranscription={onWords} disabled={preparing} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={preparing}
          aria-label={`Take a photo of ${firstName}`}
          className="rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
          style={{ width: 68, height: 68, border: '3px solid #4ADE80', boxShadow: BIO.glow.medium }}
        >
          <span className="rounded-full" style={{ width: 50, height: 50, background: preparing ? 'rgba(74,222,128,0.4)' : '#4ADE80' }} />
        </button>
        <button
          onClick={onKeyboard}
          disabled={preparing}
          aria-label="Type to Ivy instead"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${BIO.btn.ghost}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="11" rx="2" strokeWidth={1.6} />
            <path strokeLinecap="round" strokeWidth={1.6} d="M7 11h.01M11 11h.01M15 11h.01M7 14.5h10" />
          </svg>
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,.jpg,.jpeg" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
