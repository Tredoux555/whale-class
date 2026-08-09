// /montree/dashboard/school-features/page.tsx
// School Features — the self-serve half of the Feature Switchboard.
// Same switchboard the super admin sees, minus the things a school must not
// change (Give Control itself, the AI billing tier, encryption infrastructure).
// Only reachable when Montree has flipped 'feature_self_serve' ON for the
// school: the More-menu row is gated on it, and the API 403s with
// 'self_serve_disabled' otherwise — rendered here as a friendly locked state.
//
// Toggles are school-wide, and a feature that owns a menu item also shows/hides
// that item in every teacher's saved menu (lib/montree/features/menu-sync.ts).
// Feature names + descriptions come from the definitions table (English) and
// are rendered as-is; only the chrome is translated.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { ChevronLeft, Lock } from 'lucide-react';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "var(--font-lora), Georgia, serif";

interface SchoolFeature {
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

// Section order — kept in step with the super-admin switchboard
// (components/montree/super-admin/SchoolFeaturesModal.tsx). Assessment
// (Montree Milestones) leads; anything unlisted falls to the bottom.
const CATEGORY_ORDER = [
  'assessment', 'dashboard', 'ai_tools', 'management', 'media',
  'reporting', 'learning', 'reading', 'planning', 'communication', 'general',
];

// Category names come from the DB — shown capitalized, never translated.
function categoryLabel(category: string): string {
  const cleaned = (category || 'general').replace(/_/g, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function SchoolFeaturesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [menuSyncedKeys, setMenuSyncedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  // Persistent confirmation line — mirrors the super-admin switchboard's
  // status banner (components/montree/super-admin/SchoolFeaturesModal.tsx).
  // The toast fades after 1.8s; this stays until the next toggle replaces it,
  // so a school owner can always see that the change actually saved.
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/school-features');
        if (res.status === 403) {
          const d = await res.json().catch(() => ({}));
          if (!cancelled && d?.error === 'self_serve_disabled') setLocked(true);
          return;
        }
        if (!res.ok) throw new Error('load failed');
        const data = await res.json();
        if (cancelled) return;
        setFeatures(data.features || []);
        setMenuSyncedKeys(data.menu_synced_keys || []);
      } catch {
        if (!cancelled) toast.error(t('schoolFeatures.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // t is stable per locale; the load runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    async (feature: SchoolFeature) => {
      if (saving) return;
      const next = !feature.enabled;
      setSaving(feature.feature_key);
      // Optimistic — reverted below if the write fails.
      setFeatures((prev) =>
        prev.map((f) => (f.feature_key === feature.feature_key ? { ...f, enabled: next, overridden: true } : f))
      );
      try {
        const res = await montreeApi('/api/montree/school-features', {
          method: 'POST',
          body: JSON.stringify({ feature_key: feature.feature_key, enabled: next }),
        });
        if (res.status === 403) {
          setLocked(true);
          throw new Error('locked');
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) throw new Error(data?.error || 'save failed');

        const sync: MenuSync | undefined = data.menuSync;
        const base = (next ? t('schoolFeatures.enabledToast') : t('schoolFeatures.disabledToast'))
          .replace('{name}', feature.name);
        const menuNote =
          sync?.mapped && sync.teachersUpdated > 0
            ? ` ${t('schoolFeatures.menuUpdated').replace('{count}', String(sync.teachersUpdated))}`
            : '';
        toast.success(`${base}${menuNote}`, { duration: 1800 });
        setStatus({ tone: 'ok', text: `${base}${menuNote}` });
      } catch {
        setFeatures((prev) =>
          prev.map((f) => (f.feature_key === feature.feature_key ? { ...f, enabled: !next } : f))
        );
        toast.error(t('schoolFeatures.toggleFailed'));
        setStatus({ tone: 'error', text: t('schoolFeatures.toggleFailed') });
      } finally {
        setSaving(null);
      }
    },
    [saving, t]
  );

  // Group by category, then sort the sections into CATEGORY_ORDER (the API
  // returns them alphabetically by category, which buried Assessment).
  const categories: string[] = [];
  const grouped: Record<string, SchoolFeature[]> = {};
  for (const f of features) {
    const cat = f.category || 'general';
    if (!grouped[cat]) {
      grouped[cat] = [];
      categories.push(cat);
    }
    grouped[cat].push(f);
  }
  categories.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="min-h-screen bg-[#0a1a0f]" style={{ fontFamily: SANS }}>
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 60px' }}>
      <Toaster position="top-center" richColors />

      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
          padding: '8px 0', marginBottom: 8, fontFamily: SANS,
        }}
      >
        <ChevronLeft size={16} strokeWidth={1.75} /> {t('common.back')}
      </button>

      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 6px' }}>
        {t('schoolFeatures.title')}
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', lineHeight: 1.5 }}>
        {t('schoolFeatures.subtitle')}
      </p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', lineHeight: 1.5 }}>
        {t('schoolFeatures.appliesToAll')}
      </p>
      {/* Auto-save is the interaction model — say so, so nobody hunts for a Save button. */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 20px', lineHeight: 1.5 }}>
        {t('schoolFeatures.savesInstantly')}
      </p>

      {/* Persistent result of the last toggle — does not auto-dismiss. */}
      {status && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 20, fontSize: 13, lineHeight: 1.45,
          background: status.tone === 'ok' ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
          border: `1px solid ${status.tone === 'ok' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
          color: status.tone === 'ok' ? '#34d399' : '#fbbf24',
        }}>
          {status.tone === 'ok' ? '✓ ' : '⚠ '}{status.text}
        </div>
      )}

      {locked ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          textAlign: 'center', padding: '48px 24px', borderRadius: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)',
          }}>
            <Lock size={20} strokeWidth={1.75} color="rgba(255,255,255,0.4)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            {t('schoolFeatures.lockedTitle')}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, maxWidth: 360 }}>
            {t('schoolFeatures.lockedBody')}
          </div>
        </div>
      ) : loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {t('schoolFeatures.loading')}
        </div>
      ) : features.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {t('schoolFeatures.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {categories.map((cat) => (
            <div key={cat}>
              <h2 style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', margin: '0 0 10px 2px', fontFamily: SANS,
              }}>
                {categoryLabel(cat)}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped[cat].map((f) => {
                  const on = f.enabled;
                  const busy = saving === f.feature_key;
                  return (
                    <button
                      key={f.feature_key}
                      onClick={() => toggle(f)}
                      disabled={!!saving}
                      aria-pressed={on}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '11px 12px', borderRadius: 12, textAlign: 'left',
                        background: on ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${on ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        cursor: saving ? 'default' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                        fontFamily: SANS,
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0, fontSize: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
                      }}>
                        {f.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                          fontSize: 14, fontWeight: 500,
                          color: on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                        }}>
                          <span>{f.name}</span>
                          {f.is_premium && (
                            <span style={badge('rgba(251,191,36,0.15)', '#fbbf24')}>
                              {t('schoolFeatures.premiumBadge')}
                            </span>
                          )}
                          {menuSyncedKeys.includes(f.feature_key) && (
                            <span style={badge('rgba(56,189,248,0.12)', '#7dd3fc')}>
                              {t('schoolFeatures.menuBadge')}
                            </span>
                          )}
                        </div>
                        {f.description && (
                          <div style={{
                            fontSize: 12, lineHeight: 1.45, marginTop: 2,
                            color: 'rgba(255,255,255,0.35)',
                          }}>
                            {f.description}
                          </div>
                        )}
                      </div>

                      {/* Switch */}
                      <div style={{
                        width: 38, height: 22, borderRadius: 11, flexShrink: 0, padding: 2,
                        display: 'flex', alignItems: 'center',
                        justifyContent: on ? 'flex-end' : 'flex-start',
                        background: on ? '#34d399' : 'rgba(255,255,255,0.14)',
                        transition: 'background 140ms ease',
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function badge(background: string, color: string): React.CSSProperties {
  return {
    padding: '1px 6px', borderRadius: 5, background, color,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
  };
}
