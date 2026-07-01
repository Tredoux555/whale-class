// components/montree/home/JourneyView.tsx
// Marina's journey — moments, not statuses (vision plan, Jul 2 2026).
// A timeline of photos, quiet notes, and gold milestone markers, opened by
// Ivy's one-line insight. "The map" is the tucked reveal for the curious —
// v1 routes it to Ivy, who narrates the path (no visual map surface yet).
//
// COPY RULE: parent-facing. No area names, no status words, no shelf language.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

interface JourneyEvent {
  type: 'moment' | 'milestone' | 'note';
  date: string;
  text: string;
  photo_url?: string;
}

interface JourneyViewProps {
  childId: string;
  childName?: string;
  onAskIvy: (message: string) => void;
  refreshTrigger?: number;
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JourneyView({ childId, childName, onAskIvy, refreshTrigger }: JourneyViewProps) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [name, setName] = useState(childName?.split(' ')[0] || '');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/montree/companion/journey?child_id=${childId}`, { cache: 'no-store' });
      if (!r.ok) { setLoading(false); return; }
      const d = await r.json();
      setEvents(Array.isArray(d.events) ? d.events : []);
      setInsight(typeof d.insight === 'string' && d.insight ? d.insight : null);
      if (d.child_name) setName(d.child_name);
    } catch { /* soft-fail to empty state */ }
    finally { setLoading(false); }
  }, [childId]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const firstName = name || childName?.split(' ')[0] || 'your child';

  return (
    <div className={`h-full overflow-y-auto px-4 py-5 ${BIO.bg.gradient}`}>
      <h2 className={`text-xl ${BIO.text.primary}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>
        {firstName}&rsquo;s journey
      </h2>

      {insight && (
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#8fe6c3', fontFamily: 'var(--font-lora), Georgia, serif' }}>
          {insight}
        </p>
      )}

      {loading ? (
        <div className="mt-10 text-center">
          <div className="animate-pulse text-3xl mb-2">🌿</div>
          <p className={`text-sm ${BIO.text.secondary}`}>Gathering the moments…</p>
        </div>
      ) : events.length === 0 ? (
        <div className={`mt-8 rounded-2xl border ${BIO.border.glow} ${BIO.bg.card} px-5 py-8 text-center`} style={{ boxShadow: BIO.glow.soft }}>
          <div className="text-3xl mb-2">🌱</div>
          <p className={`text-sm leading-relaxed ${BIO.text.secondary}`}>
            {firstName}&rsquo;s journey starts with your first photo. Point the camera at whatever they&rsquo;re doing — Ivy will take it from there.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3.5" style={{ borderLeft: '2px solid rgba(74,222,128,0.25)', paddingLeft: 14 }}>
          {events.map((ev, i) =>
            ev.type === 'milestone' ? (
              <div key={i} className="rounded-xl px-3.5 py-2.5" style={{ border: '1px solid rgba(232,201,106,0.4)', background: 'rgba(232,201,106,0.05)' }}>
                <p className="text-[13px] leading-snug m-0" style={{ color: '#E8C96A' }}>⭐ {ev.text}</p>
                <p className={`text-[11px] mt-0.5 m-0 ${BIO.text.muted}`}>{relativeDay(ev.date)}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5 items-center">
                {ev.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- proxied storage thumb
                  <img src={ev.photo_url} alt="" loading="lazy" className="rounded-lg object-cover shrink-0" style={{ width: 46, height: 46, background: 'rgba(18,39,26,0.9)' }} />
                ) : (
                  <div className="rounded-lg shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, background: 'rgba(18,39,26,0.9)' }}>
                    <span className="text-sm opacity-60">📝</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-[13px] leading-snug m-0 ${BIO.text.primary}`}>
                    {ev.text || (ev.type === 'moment' ? 'A moment, captured' : '')}
                  </p>
                  <p className={`text-[11px] mt-0.5 m-0 ${BIO.text.muted}`}>{relativeDay(ev.date)}</p>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {!loading && (
        <div className="mt-5 pb-4 text-right">
          <button
            onClick={() => onAskIvy(`Where is ${firstName} on the path right now? Walk me through the map.`)}
            className={`text-xs ${BIO.text.muted} hover:text-white/60 transition-colors`}
          >
            the map ›
          </button>
        </div>
      )}
    </div>
  );
}
