// components/montree/home/FamilyPlan.tsx
// The family's rhythm at a glance — upcoming calendar items + gentle routines.
// Read-only: everything here is created by talking to Ivy. Tapping "Ask Ivy"
// drops the parent back into the conversation.
'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

interface HomeEvent {
  id: string;
  title: string;
  detail: string | null;
  start_at: string;
  all_day: boolean;
  kind: string;
  audience: string;
}
interface Routine {
  id: string;
  title: string;
  time_of_day: string | null;
  days_of_week: number[];
  audience: string;
}
interface WeeklyWork {
  title: string;
  the_idea: string;
  what_it_builds: string;
  materials: string[];
  make_it: string[];
  how_to_present: string[];
  variation: string | null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KIND_ICON: Record<string, string> = {
  appointment: '📅', activity: '🌿', reminder: '🔔', wellbeing: '💛', routine: '🔁',
};

function dayKey(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}
function timeLabel(iso: string, allDay: boolean): string {
  if (allDay) return 'All day';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  catch { return ''; }
}

// A collapsible DIY-work card — used for the free weekly work and any extras.
function WorkCard({ work, badge, footer }: { work: WeeklyWork; badge: string; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} overflow-hidden`} style={{ boxShadow: BIO.glow.soft }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${BIO.bg.amberSubtle} ${BIO.text.amber}`}>{badge}</span>
          <span className={`ml-auto ${BIO.text.muted} text-xs`}>{open ? '▾' : '▸'}</span>
        </div>
        <h3 className={`mt-1.5 text-base font-semibold ${BIO.text.primary}`}>{work.title}</h3>
        <p className={`mt-1 text-[13px] leading-relaxed ${BIO.text.secondary}`}>{work.the_idea}</p>
      </button>
      {open && (
        <div className={`px-4 pb-4 border-t ${BIO.border.subtle} pt-3 space-y-3`}>
          {work.what_it_builds && (
            <p className={`text-[13px] leading-relaxed ${BIO.text.secondary}`}><span className={BIO.text.mint}>Why it matters: </span>{work.what_it_builds}</p>
          )}
          {work.materials.length > 0 && (
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${BIO.text.secondary}`}>🧺 What you&apos;ll need</div>
              <ul className="mt-1.5 space-y-1">{work.materials.map((m, i) => <li key={i} className={`text-[13px] ${BIO.text.primary} flex gap-2`}><span className="opacity-60">•</span>{m}</li>)}</ul>
            </div>
          )}
          {work.make_it.length > 0 && (
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${BIO.text.secondary}`}>🌿 Make it</div>
              <ol className="mt-1.5 space-y-1">{work.make_it.map((s, i) => <li key={i} className={`text-[13px] ${BIO.text.primary}`}>{i + 1}. {s}</li>)}</ol>
            </div>
          )}
          {work.how_to_present.length > 0 && (
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${BIO.text.secondary}`}>👐 Show it</div>
              <ol className="mt-1.5 space-y-1">{work.how_to_present.map((s, i) => <li key={i} className={`text-[13px] ${BIO.text.primary}`}>{i + 1}. {s}</li>)}</ol>
            </div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}

export default function FamilyPlan({
  childId,
  refreshTrigger,
  onAskIvy,
}: {
  childId: string;
  refreshTrigger?: number;
  onAskIvy: (message: string) => void;
}) {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [weekly, setWeekly] = useState<WeeklyWork | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [diyPlan, setDiyPlan] = useState(false);
  const [extras, setExtras] = useState<WeeklyWork[]>([]);
  const [generatingExtra, setGeneratingExtra] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/montree/companion/schedule?child_id=${childId}&days=30`);
      if (r.ok) {
        const d = await r.json();
        setEvents(Array.isArray(d.events) ? d.events : []);
        setRoutines(Array.isArray(d.routines) ? d.routines : []);
      }
    } catch { /* leave empty */ }
    finally { setLoading(false); }
  }, [childId]);

  // Weekly DIY work loads independently (it can take a moment to generate).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/montree/companion/weekly-work?child_id=${childId}`);
        if (r.ok) { const d = await r.json(); if (!cancelled) { if (d.work) setWeekly(d.work as WeeklyWork); setDiyPlan(!!d.diy_plan); } }
      } catch { /* optional */ }
      finally { if (!cancelled) setWeeklyLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  // The $1 DIY plan: make an extra work beyond this week's free one.
  const makeAnother = useCallback(async () => {
    if (generatingExtra) return;
    setGeneratingExtra(true);
    try {
      const r = await fetch('/api/montree/companion/weekly-work', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ child_id: childId }),
      });
      if (r.ok) { const d = await r.json(); if (d.work) setExtras((prev) => [...prev, d.work as WeeklyWork]); }
      else if (r.status === 402) { setDiyPlan(false); } // entitlement lapsed → show the upsell
    } catch { /* ignore */ }
    finally { setGeneratingExtra(false); }
  }, [childId, generatingExtra]);

  // Group events by day.
  const groups: Array<{ day: string; items: HomeEvent[] }> = [];
  for (const e of events) {
    const day = dayKey(e.start_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="animate-pulse text-4xl">🗓️</div>
      </div>
    );
  }

  const empty = events.length === 0 && routines.length === 0;

  return (
    <div className={`h-full overflow-y-auto px-4 py-5 ${BIO.bg.gradient}`}>
      <h2 className={`text-lg font-semibold ${BIO.text.primary}`}>Your week</h2>
      <p className={`text-xs mt-0.5 ${BIO.text.muted}`}>Ask Ivy to add anything — appointments, activities, your own reminders.</p>

      {/* This week's free make-it-at-home DIY work, any extras, and the DIY plan */}
      {!weekly && weeklyLoading && (
        <div className={`mt-4 rounded-2xl border ${BIO.border.subtle} ${BIO.bg.cardSolid} px-4 py-4 flex items-center gap-3`}>
          <span className="animate-pulse text-xl">🛠️</span>
          <p className={`text-[13px] ${BIO.text.secondary}`}>Ivy is preparing this week&apos;s make-it activity…</p>
        </div>
      )}
      {weekly && (
        <div className="mt-4 space-y-3">
          <WorkCard
            work={weekly}
            badge="🛠️ Make it this week"
            footer={<button onClick={() => onAskIvy(`Walk me through this week's work to make: "${weekly.title}".`)} className={`w-full py-2.5 rounded-full text-sm ${BIO.btn.mint}`}>Make it with Ivy</button>}
          />
          {extras.map((w, i) => (
            <WorkCard
              key={i}
              work={w}
              badge="✨ Extra work"
              footer={<button onClick={() => onAskIvy(`Walk me through making: "${w.title}".`)} className={`w-full py-2.5 rounded-full text-sm ${BIO.btn.mint}`}>Make it with Ivy</button>}
            />
          ))}
          {diyPlan ? (
            <button
              onClick={makeAnother}
              disabled={generatingExtra}
              className={`w-full py-2.5 rounded-full text-sm ${BIO.btn.outline} disabled:opacity-50`}
            >
              {generatingExtra ? 'Making another…' : '✨ Make another'}
            </button>
          ) : (
            <div className={`rounded-2xl border ${BIO.border.subtle} ${BIO.bg.cardSolid} px-4 py-3.5`}>
              <p className={`text-[13px] leading-relaxed ${BIO.text.secondary}`}>
                One make-it work is free every week. Want a fresh activity whenever you like?
              </p>
              <a href="/montree/admin/billing" className={`mt-2.5 inline-block px-4 py-2 rounded-full text-sm ${BIO.btn.mint}`}>
                Unlock the DIY plan · $1
              </a>
            </div>
          )}
        </div>
      )}

      {empty && (
        <div className={`mt-6 rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} px-5 py-6 text-center`} style={{ boxShadow: BIO.glow.soft }}>
          <div className="text-3xl mb-2">🗓️</div>
          <p className={`text-sm ${BIO.text.secondary}`}>Nothing on the calendar yet.</p>
          <button
            onClick={() => onAskIvy('Help me plan our week.')}
            className={`mt-4 inline-block px-4 py-2 rounded-full text-sm ${BIO.btn.outline}`}
          >
            Plan with Ivy
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.day} className="mt-5">
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${BIO.text.mint}`}>{g.day}</div>
          <div className="mt-2 space-y-2">
            {g.items.map((e) => (
              <div key={e.id} className={`rounded-xl border ${BIO.border.subtle} ${BIO.bg.cardSolid} px-3.5 py-2.5 flex items-start gap-3`}>
                <span className="text-base mt-0.5">{KIND_ICON[e.kind] || '🌿'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${BIO.text.primary} truncate`}>{e.title}</p>
                    {e.audience === 'parent' && <span className={`text-[9px] uppercase tracking-wider ${BIO.text.amber}`}>for you</span>}
                  </div>
                  {e.detail && <p className={`text-xs ${BIO.text.secondary} mt-0.5`}>{e.detail}</p>}
                </div>
                <span className={`text-[11px] ${BIO.text.muted} shrink-0`}>{timeLabel(e.start_at, e.all_day)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {routines.length > 0 && (
        <div className="mt-6">
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${BIO.text.secondary}`}>Daily rhythm</div>
          <div className="mt-2 space-y-2">
            {routines.map((r) => {
              const when = r.days_of_week?.length && r.days_of_week.length < 7
                ? r.days_of_week.map((d) => DAY_NAMES[d]).join(' · ')
                : 'every day';
              return (
                <div key={r.id} className={`rounded-xl border ${BIO.border.subtle} ${BIO.bg.cardSolid} px-3.5 py-2.5 flex items-center gap-3`}>
                  <span className="text-base">🔁</span>
                  <p className={`text-sm font-medium ${BIO.text.primary} flex-1 truncate`}>{r.title}</p>
                  <span className={`text-[11px] ${BIO.text.muted}`}>{r.time_of_day ? `${r.time_of_day} · ` : ''}{when}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!empty && (
        <button
          onClick={() => onAskIvy('What should we focus on this week?')}
          className={`mt-7 w-full py-2.5 rounded-full text-sm ${BIO.btn.outline}`}
        >
          Ask Ivy about the week
        </button>
      )}
    </div>
  );
}
