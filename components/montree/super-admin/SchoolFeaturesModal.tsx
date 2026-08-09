'use client';

// components/montree/super-admin/SchoolFeaturesModal.tsx
// Feature Switchboard — super-admin surface. Click a school → every feature
// with an on/off toggle.
//
// Session update: now backed by /api/montree/super-admin/school-features.
//   • toggles also sync the matching menu item into/out of that school's
//     teachers' saved menus (settings.menu outranks the flag in DashboardHeader)
//   • Enable all / Disable all is ONE batch upsert (was N sequential POSTs)
//   • every write invalidates the server-side feature cache (the old
//     /api/montree/features POST did not — flips took up to 30s to land)
//   • "Give Control" master switch at the top unlocks the school-facing
//     version of this same switchboard (More menu → School Features).
// Super-admin surface: plain English, not i18n'd.
//
// DUAL MODE (Aug 2026): the SAME component is now also mounted by the classroom
// header's ⚙️ gear for schools that have Give Control. Pass
// apiBase='/api/montree/school-features', no sessionToken, showGiveControl=false
// and it runs on cookie auth against the school-facing route. Defaults keep the
// super-admin call site (SchoolsTab) byte-identical.

import { useState, useEffect, useCallback } from 'react';

interface Feature {
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
  enabled: boolean;
  overridden: boolean;
}

interface MenuSync {
  mapped: boolean;
  teachersUpdated: number;
  teachersSkipped: number;
  errors: string[];
}

interface SchoolFeaturesModalProps {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  /**
   * Super-admin session token. When PRESENT the modal talks to the super-admin
   * route (token header + explicit school_id). When ABSENT it runs in SCHOOL
   * mode: cookie auth (verifySchoolRequest), no token header, and no school_id
   * anywhere — the school-facing route derives the school from the JWT.
   */
  sessionToken?: string;
  /** Defaults to the super-admin route. Pass '/api/montree/school-features' for school mode. */
  apiBase?: string;
  /** Give Control is a Montree-only switch — hide it on the school-facing surface. */
  showGiveControl?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  assessment: '🌱 Assessment',
  dashboard: '📊 Dashboard',
  ai_tools: '🧠 AI Tools',
  management: '⚙️ Management',
  media: '📷 Photo & Media',
  reporting: '📝 Reports',
  learning: '📚 Library & Tools',
  reading: '📖 Reading',
  planning: '📋 Planning',
  communication: '💬 Communication',
  general: '🔧 General',
};

const API = '/api/montree/super-admin/school-features';

export default function SchoolFeaturesModal({
  schoolId,
  schoolName,
  onClose,
  sessionToken,
  apiBase = API,
  showGiveControl = true,
}: SchoolFeaturesModalProps) {
  // No super-admin token ⇒ the school is looking at its own switchboard.
  const schoolMode = !sessionToken;
  const [features, setFeatures] = useState<Feature[]>([]);
  const [menuSyncedKeys, setMenuSyncedKeys] = useState<string[]>([]);
  const [selfServe, setSelfServe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const loadFeatures = useCallback(async () => {
    try {
      // Super-admin reads are token-gated, same as before. School reads ride the
      // montree-auth cookie and carry no school_id — the route derives it.
      const res = schoolMode
        ? await fetch(apiBase, { credentials: 'include' })
        : await fetch(`${apiBase}?school_id=${schoolId}`, {
            headers: { 'x-super-admin-token': sessionToken as string },
          });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeatures(data.features || []);
      setSelfServe(!!data.self_serve_enabled);
      setMenuSyncedKeys(data.menu_synced_keys || []);
    } catch (err) {
      console.error('Failed to load features:', err);
      setStatus({ tone: 'error', text: 'Could not load features.' });
    } finally {
      setLoading(false);
    }
  }, [schoolId, sessionToken, apiBase, schoolMode]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Shared POST helper — one action per call.
  //
  // The two routes speak slightly different dialects and both are kept exactly
  // as they were: the super-admin route takes { school_id, action:{…} }; the
  // school route takes the flat { feature_key, enabled } it has always taken
  // (plus { action:'set_all', enabled } for the bulk sweep). Both answer with
  // the same { menuSync, updated } shape, so nothing below has to branch.
  const postAction = useCallback(
    async (action: Record<string, unknown>) => {
      const body = schoolMode
        ? action.type === 'set_all'
          ? { action: 'set_all', enabled: action.enabled }
          : { feature_key: action.feature_key, enabled: action.enabled }
        : { school_id: schoolId, action };

      const res = await fetch(apiBase, {
        method: 'POST',
        credentials: schoolMode ? 'include' : 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(schoolMode ? {} : { 'x-super-admin-token': sessionToken as string }),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Request failed');
      }
      return data as { menuSync?: MenuSync; updated?: number };
    },
    [schoolId, sessionToken, apiBase, schoolMode]
  );

  // "… menus updated for N teachers" — the whole point of the sync.
  const menuNote = (sync?: MenuSync): string => {
    if (!sync || !sync.mapped) return '';
    const n = sync.teachersUpdated;
    const plural = n === 1 ? '' : 's';
    if (sync.errors.length > 0) {
      return ` — menus updated for ${n} teacher${plural}, ${sync.errors.length} failed`;
    }
    if (n === 0) return ' — no saved teacher menus to update';
    return ` — menus updated for ${n} teacher${plural}`;
  };

  const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    if (toggling || bulkBusy) return;
    setToggling(featureKey);
    setStatus(null);
    const next = !currentEnabled;
    try {
      const data = await postAction({ type: 'toggle', feature_key: featureKey, enabled: next });
      setFeatures(prev =>
        prev.map(f => (f.feature_key === featureKey ? { ...f, enabled: next, overridden: true } : f))
      );
      setStatus({
        tone: 'ok',
        text: `${next ? 'Enabled' : 'Disabled'} ${featureKey}${menuNote(data.menuSync)}`,
      });
    } catch (err) {
      console.error('Toggle error:', err);
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Toggle failed' });
    } finally {
      setToggling(null);
    }
  };

  // ONE batch upsert server-side (Give Control is never included).
  const setAll = async (enabled: boolean) => {
    if (bulkBusy || toggling) return;
    setBulkBusy(true);
    setStatus(null);
    try {
      const data = await postAction({ type: 'set_all', enabled });
      setFeatures(prev => prev.map(f => ({ ...f, enabled, overridden: true })));
      setStatus({
        tone: 'ok',
        text: `${enabled ? 'Enabled' : 'Disabled'} ${data.updated ?? features.length} features${menuNote(data.menuSync)}`,
      });
    } catch (err) {
      console.error('Bulk toggle error:', err);
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Bulk update failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleGiveControl = async () => {
    if (bulkBusy || toggling) return;
    const next = !selfServe;
    setToggling('__give_control__');
    setStatus(null);
    try {
      await postAction({ type: 'give_control', enabled: next });
      setSelfServe(next);
      setStatus({
        tone: 'ok',
        text: next
          ? 'Give Control ON — this school can now manage its own features.'
          : 'Give Control OFF — only Montree can change this school’s features.',
      });
    } catch (err) {
      console.error('Give Control error:', err);
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Could not update Give Control' });
    } finally {
      setToggling(null);
    }
  };

  // Group by category
  const grouped = features.reduce<Record<string, Feature[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  // Sort categories: assessment (Montree Milestones) first, then dashboard,
  // then ai_tools, then the rest.
  const categoryOrder = ['assessment', 'dashboard', 'ai_tools', 'management', 'media', 'reporting', 'learning', 'reading', 'planning', 'communication', 'general'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const enabledCount = features.filter(f => f.enabled).length;
  const busy = bulkBusy || toggling !== null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1f2e] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">{schoolName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {enabledCount}/{features.length} features enabled
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Give Control — master switch, deliberately styled apart from the list.
            Montree-only: never rendered on the school-facing surface. */}
        {showGiveControl && (
        <div className="px-6 pt-4 pb-3 border-b border-slate-700/50 bg-slate-900/40">
          <button
            onClick={toggleGiveControl}
            disabled={busy}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left ${
              selfServe
                ? 'bg-indigo-500/15 border-indigo-400/40 hover:bg-indigo-500/20'
                : 'bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/60'
            } disabled:opacity-60`}
          >
            <span className="text-lg flex-shrink-0">🎛️</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${selfServe ? 'text-indigo-200' : 'text-slate-200'}`}>
                Give Control
              </div>
              <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Let this school manage its own features from their dashboard
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
              selfServe ? 'bg-indigo-400 justify-end' : 'bg-slate-600 justify-start'
            }`}>
              <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
            </div>
          </button>
          <p className="text-[10px] text-slate-500 mt-2 pl-1">
            Never included in Enable all / Disable all.
          </p>
        </div>
        )}

        {/* Bulk actions — one batch request, not N toggles */}
        <div className="px-6 py-3 flex gap-2 items-center border-b border-slate-700/50 bg-slate-900/30">
          <button
            onClick={() => setAll(true)}
            disabled={busy}
            className="px-3 py-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            {bulkBusy ? 'Working…' : 'Enable all'}
          </button>
          <button
            onClick={() => setAll(false)}
            disabled={busy}
            className="px-3 py-1.5 bg-red-500/15 text-red-300 hover:bg-red-500/25 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            {bulkBusy ? 'Working…' : 'Disable all'}
          </button>
          <span className="ml-auto text-[10px] text-slate-500">
            ⇄ = also syncs teachers’ menus
          </span>
        </div>

        {/* Status line — carries the menu-sync teacher count after every action */}
        {status && (
          <div
            className={`px-6 py-2 text-[11px] border-b border-slate-700/50 ${
              status.tone === 'ok' ? 'text-emerald-300 bg-emerald-500/5' : 'text-red-300 bg-red-500/5'
            }`}
          >
            {status.text}
          </div>
        )}

        {/* Feature list */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading features...</div>
          ) : (
            <div className="space-y-7">
              {sortedCategories.map(cat => (
                <div key={cat}>
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3 pl-1">
                    {CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <div className="space-y-1.5">
                    {grouped[cat].map(f => (
                      <button
                        key={f.feature_key}
                        onClick={() => toggleFeature(f.feature_key, f.enabled)}
                        disabled={busy}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors text-left ${
                          f.enabled
                            ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15'
                            : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/60'
                        } disabled:opacity-60`}
                      >
                        <span className="text-base flex-shrink-0">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${f.enabled ? 'text-emerald-200' : 'text-slate-200'}`}>
                              {f.name}
                            </span>
                            {f.is_premium && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold tracking-wide">
                                PRO
                              </span>
                            )}
                            {menuSyncedKeys.includes(f.feature_key) && (
                              <span
                                className="px-1.5 py-0.5 bg-sky-500/15 text-sky-300 rounded text-[10px] font-semibold tracking-wide"
                                title="Toggling this also shows/hides the matching item in teachers' saved menus"
                              >
                                ⇄ MENU
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
                          f.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-600 justify-start'
                        }`}>
                          <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
