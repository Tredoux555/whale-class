// /montree/dashboard/menu-setup/page.tsx
// Manage Menu — per-teacher customizable dashboard menu.
// Reorder items (up/down) and show/hide them. Saved to settings.menu on the
// teacher (via /api/montree/teacher/menu). The header reads this config and
// renders the menu from it. Teachers with no config yet start from the full
// list (all visible) and trim; new signups arrive pre-seeded with the minimal
// default. Does not touch school-level feature flags.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import {
  ChevronLeft, ChevronUp, ChevronDown, Eye, EyeOff, Check,
} from 'lucide-react';
import { MENU_REGISTRY, MENU_REGISTRY_ORDER } from '@/lib/montree/menu/registry';
import { MENU_CONFIG_VERSION, type MenuConfig, type MenuConfigItem } from '@/lib/montree/menu/config';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "var(--font-lora), Georgia, serif";

export default function MenuSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<MenuConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/teacher/menu');
        const data = res.ok ? await res.json() : null;
        const cfg: MenuConfig | null = data?.menu ?? null;
        if (cancelled) return;
        if (cfg && Array.isArray(cfg.items) && cfg.items.length > 0) {
          setItems(cfg.items);
        } else {
          // No saved config → start from the full list, all visible. The
          // teacher trims from here; saving switches them to a custom menu.
          setItems(MENU_REGISTRY_ORDER.map((id) => ({ id, visible: true })));
        }
      } catch {
        if (!cancelled) setItems(MENU_REGISTRY_ORDER.map((id) => ({ id, visible: true })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }, []);

  const toggle = useCallback((index: number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, visible: !it.visible } : it)));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await montreeApi('/api/montree/teacher/menu', {
        method: 'PATCH',
        body: JSON.stringify({ menu: { v: MENU_CONFIG_VERSION, items } }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Save failed');
      }
      setDirty(false);
      toast.success('Menu saved', { duration: 1400 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save menu');
    } finally {
      setSaving(false);
    }
  }, [saving, items]);

  const labelFor = (id: MenuConfigItem['id']) => {
    const def = MENU_REGISTRY[id];
    if (!def) return id;
    return def.labelKey ? t(def.labelKey) : def.label;
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 120px', fontFamily: SANS }}>
      <Toaster position="top-center" richColors />

      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
          border: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
          padding: '8px 0', marginBottom: 8, fontFamily: SANS,
        }}
      >
        <ChevronLeft size={16} strokeWidth={1.75} /> Back
      </button>

      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 6px' }}>
        Manage Menu
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.5 }}>
        Reorder your menu and show or hide tools. Drag the arrows to move items up or down; tap the eye to show or hide. Your changes are personal to you.
      </p>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          Loading your menu…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, index) => {
            const def = MENU_REGISTRY[it.id];
            if (!def) return null;
            const Icon = def.icon;
            const visible = it.visible;
            return (
              <div
                key={it.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: visible ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${visible ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {/* Reorder arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" style={arrowBtn(index === 0)}>
                    <ChevronUp size={15} strokeWidth={2} />
                  </button>
                  <button onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down" style={arrowBtn(index === items.length - 1)}>
                    <ChevronDown size={15} strokeWidth={2} />
                  </button>
                </div>

                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: visible ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
                }}>
                  <Icon size={17} strokeWidth={1.75} color={visible ? '#34d399' : 'rgba(255,255,255,0.35)'} />
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500,
                  color: visible ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)' }}>
                  {labelFor(it.id)}
                </div>

                {/* Show / hide */}
                <button
                  onClick={() => toggle(index)}
                  aria-label={visible ? 'Hide' : 'Show'}
                  style={{
                    width: 40, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: visible ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
                    border: 0, cursor: 'pointer',
                    color: visible ? '#34d399' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {visible ? <Eye size={17} strokeWidth={1.75} /> : <EyeOff size={17} strokeWidth={1.75} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
        Camera, language, and Logout are always available. Manage Menu lives at the bottom of your menu.
      </p>

      {/* Sticky save bar */}
      {!loading && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          padding: `12px 16px calc(12px + env(safe-area-inset-bottom))`,
          background: 'linear-gradient(to top, rgba(6,20,14,0.98), rgba(6,20,14,0.0))',
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <button
            onClick={save}
            disabled={saving || !dirty}
            style={{
              pointerEvents: 'auto',
              maxWidth: 560, width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: 12, border: 0,
              background: dirty ? 'linear-gradient(135deg, #34d399, #14b8a6)' : 'rgba(255,255,255,0.08)',
              color: dirty ? '#06140e' : 'rgba(255,255,255,0.4)',
              fontSize: 15, fontWeight: 700, fontFamily: SANS,
              cursor: saving || !dirty ? 'default' : 'pointer',
              boxShadow: 'none',
            }}
          >
            <Check size={18} strokeWidth={2.2} />
            {saving ? 'Saving…' : dirty ? 'Save menu' : 'Saved'}
          </button>
        </div>
      )}
    </div>
  );
}

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 22, borderRadius: 6, border: 0,
    background: disabled ? 'transparent' : 'rgba(255,255,255,0.06)',
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
    cursor: disabled ? 'default' : 'pointer',
  };
}
