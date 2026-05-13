'use client';

// AgentApplicationAlert
//
// Phase 3 of agent system fix plan — super-admin banner at top of the
// dashboard that surfaces pending agent applications from the public
// /montree/become-an-agent form.
//
// Mirrors the DemoRequestAlert pattern (inline in super-admin/page.tsx)
// but lifted into its own component file for clarity. Both banners
// stack in the super-admin header.
//
// Per-row actions:
//   ✓ Accept (issue code) — links to Referrals tab with prefill query
//     params, so the existing 🔑 Issue Agent Login modal opens with the
//     applicant's name + email already in. Tredoux finishes the issue
//     manually (sets the share %) then this row flips to 'sent'.
//   ✗ Decline — sets status='declined'.
//   ✉ Reply — opens mailto with a warm short reply.

import { useCallback, useEffect, useState } from 'react';

interface AgentApplication {
  id: string;
  org_name: string;          // affiliation
  contact_person: string | null; // applicant name
  email: string;
  country: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  application_details?: {
    current_role?: string | null;
    why_good_fit?: string | null;
  } | null;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function escapeForMailto(s: string): string {
  return encodeURIComponent(s);
}

export default function AgentApplicationAlert({ saToken }: { saToken: string }) {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!saToken) return;
    fetch('/api/montree/super-admin/agent-applications?status=agent_applied', {
      headers: { 'x-super-admin-token': saToken },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.applications) {
          setApplications(d.applications as AgentApplication[]);
        }
      })
      .catch((err) => console.error('[AgentApplicationAlert] load failed:', err));
  }, [saToken]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: 'sent' | 'contacted' | 'declined' | 'dead') => {
    setBusy(id);
    try {
      await fetch('/api/montree/super-admin/agent-applications', {
        method: 'PATCH',
        headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      // Drop from local list — alert is "pending only"
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('[AgentApplicationAlert] status update failed:', err);
    } finally {
      setBusy(null);
    }
  };

  /** Accept = issue a code. We don't auto-issue from here — we link to the
   *  Referrals tab with prefill params so the existing manual workflow
   *  applies (Tredoux still picks the share %). Marking 'sent' would be
   *  premature until the code is actually issued. Instead we mark
   *  'contacted' on this click and let the Referrals tab handle the final
   *  status flip (it already does for new agents). */
  const accept = (app: AgentApplication) => {
    const params = new URLSearchParams({
      prefill_name: app.contact_person || '',
      prefill_email: app.email,
      from_application: app.id,
    });
    // Note: ReferralsTab is a tab on the same super-admin page. Linking with
    // a hash + query is the simplest way to surface the prefill. ReferralsTab
    // reads these params on mount.
    window.location.href = `/montree/super-admin?tab=agents&${params.toString()}`;
  };

  /** Open mail client with a warm short reply (no commitment). Useful when
   *  Tredoux wants to ask a clarifying question before deciding. Marks
   *  'contacted' so the row drops out of the pending banner. */
  const replyWithMessage = (app: AgentApplication) => {
    const firstName = (app.contact_person || '').split(/\s+/)[0] || 'there';
    const subject = `Re: Montree — your agent application`;
    const body =
      `Hi ${firstName},\n\n` +
      `Thanks for applying to be a Montree agent. Quick question before I move forward:\n\n` +
      `[Your question here]\n\n` +
      `Kind regards,\nTredoux\nmontree.xyz`;
    const mailto = `mailto:${escapeForMailto(app.email)}?subject=${escapeForMailto(subject)}&body=${escapeForMailto(body)}`;
    const w = window.open(mailto, '_blank');
    if (w) setTimeout(() => { try { w.close(); } catch { /* */ } }, 500);
    setStatus(app.id, 'contacted');
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (applications.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-amber-500/15 border border-amber-500/40 rounded-xl">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-amber-400 text-lg">🌱</span>
        <span className="text-amber-200 font-semibold text-sm">
          {applications.length} new agent application{applications.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {applications.map((app) => {
          const age = daysSince(app.created_at);
          const ageLabel = age === 0 ? 'today' : age === 1 ? '1 day ago' : `${age} days ago`;
          const isExpanded = expanded.has(app.id);
          const pitch = app.application_details?.why_good_fit || app.notes || '';
          const role = app.application_details?.current_role || '';

          return (
            <div
              key={app.id}
              className="rounded-lg px-3 py-2 bg-black/20 border border-amber-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {app.contact_person || '(no name)'}
                    </span>
                    {app.org_name && app.org_name !== 'Independent' && (
                      <span className="text-amber-200/70 text-xs">— {app.org_name}</span>
                    )}
                    {app.country && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600">
                        {app.country}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600">
                      {ageLabel}
                    </span>
                  </div>
                  <a
                    href={`mailto:${app.email}`}
                    className="text-amber-300 text-xs hover:text-amber-200 underline mt-1 inline-block"
                  >
                    {app.email}
                  </a>
                  {(pitch || role) && (
                    <button
                      onClick={() => toggleExpanded(app.id)}
                      className="block mt-1 text-xs text-amber-300/80 hover:text-amber-200 underline"
                    >
                      {isExpanded ? 'Hide pitch' : 'Read pitch'}
                    </button>
                  )}
                  {isExpanded && (
                    <div className="mt-2 px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-xs text-amber-100/90 whitespace-pre-wrap">
                      {role && (
                        <div className="mb-2">
                          <span className="text-amber-300/70 font-medium">Current role: </span>
                          <span>{role}</span>
                        </div>
                      )}
                      {pitch && (
                        <div>
                          <span className="text-amber-300/70 font-medium">Why a good fit: </span>
                          <span>{pitch}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => accept(app)}
                    disabled={busy === app.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/50 transition-colors disabled:opacity-50 font-medium"
                    title="Open Referrals tab with this applicant's details pre-filled to issue an agent code"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => replyWithMessage(app)}
                    disabled={busy === app.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 transition-colors disabled:opacity-50"
                    title="Open mail client with a short reply asking for more info. Marks as contacted."
                  >
                    ✉ Reply
                  </button>
                  <button
                    onClick={() => setStatus(app.id, 'declined')}
                    disabled={busy === app.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-600/30 hover:bg-slate-600/50 text-slate-300 border border-slate-600/50 transition-colors disabled:opacity-50"
                    title="Mark as declined. No email sent — handle that manually if needed."
                  >
                    ✗ Decline
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
