// /montree/dashboard/menu-setup/page.tsx
// Manage Menu — per-teacher customizable dashboard menu.
// Drag-to-reorder (@dnd-kit) with up/down arrows kept as a keyboard/AT fallback,
// plus eye show/hide. Everything auto-saves (600ms debounce) to settings.menu on
// the teacher via /api/montree/teacher/menu — there is no explicit Save button.
// The header reads this config and renders the menu from it. Teachers with no
// config yet start from the full list (all visible) and trim; new signups arrive
// pre-seeded with the minimal default. Does not touch school-level feature flags.
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { montreeApi } from '@/lib/montree/api';
import { useFeaturesContext } from '@/lib/montree/features';
import { FEATURE_MENU_MAP } from '@/lib/montree/features/menu-sync';
import type { FeatureKey } from '@/lib/montree/features/types';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n';
import {
  ChevronLeft, ChevronUp, ChevronDown, Eye, EyeOff, Check, RotateCcw, Loader2,
} from 'lucide-react';
import { MENU_REGISTRY, MENU_REGISTRY_ORDER } from '@/lib/montree/menu/registry';
import {
  MENU_CONFIG_VERSION,
  MENU_ITEM_IDS,
  MINIMAL_DEFAULT_MENU,
  type MenuConfig,
  type MenuConfigItem,
  type MenuItemId,
} from '@/lib/montree/menu/config';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "var(--font-lora), Georgia, serif";

const MUTED = 'rgba(255,255,255,0.62)';
const GLASS_BG = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = '1px solid rgba(255,255,255,0.10)';
const EMERALD = '#34d399';

type SaveState = 'idle' | 'saving' | 'saved' | 'retrying';

/** Visible rows first, hidden rows after — both keeping their relative order. */
function normalise(list: MenuConfigItem[]): MenuConfigItem[] {
  const vis = list.filter((it) => it.visible);
  const hid = list.filter((it) => !it.visible);
  return [...vis, ...hid];
}

function sameConfig(a: MenuConfigItem[], b: MenuConfigItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((it, i) => it.id === b[i].id && it.visible === b[i].visible);
}

// menu item id → every feature key that owns it. A row with NO key is ungated.
// DashboardHeader renders a saved menu without flag-filtering, so reset must not
// re-show a row whose school has the owning feature switched off.
const MENU_ID_FEATURE_KEYS: Partial<Record<MenuItemId, FeatureKey[]>> = (() => {
  const map: Partial<Record<MenuItemId, FeatureKey[]>> = {};
  for (const [key, id] of Object.entries(FEATURE_MENU_MAP) as [FeatureKey, MenuItemId][]) {
    (map[id] ||= []).push(key);
  }
  return map;
})();

/** MENU_ITEM_IDS order, with the seeded default's visibility for each id. */
function defaultItems(isEnabled: (key: FeatureKey) => boolean): MenuConfigItem[] {
  const vis = new Map<MenuItemId, boolean>(
    MINIMAL_DEFAULT_MENU.items.map((it) => [it.id, it.visible])
  );
  return normalise(
    MENU_ITEM_IDS.map((id) => {
      const keys = MENU_ID_FEATURE_KEYS[id];
      // Gated row: visible only if at least one owning feature is on for this school.
      const allowed = !keys || keys.some((k) => isEnabled(k));
      return { id, visible: allowed && (vis.get(id) ?? false) };
    })
  );
}

function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
      {[5, 10, 15].map((cy) =>
        [4, 10].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" />)
      )}
    </svg>
  );
}

interface RowProps {
  item: MenuConfigItem;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: MenuItemId, dir: -1 | 1) => void;
  onToggle: (id: MenuItemId) => void;
}

function SortableRow({ item, label, isFirst, isLast, onMove, onToggle }: RowProps) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id });

  const def = MENU_REGISTRY[item.id];
  if (!def) return null;
  const Icon = def.icon;
  const visible = item.visible;

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 52,
        padding: '6px 8px 6px 4px',
        borderRadius: 14,
        background: isDragging ? 'rgba(255,255,255,0.08)' : GLASS_BG,
        border: isDragging ? `1px solid rgba(52,211,153,0.35)` : GLASS_BORDER,
        boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.38)' : 'none',
        opacity: visible ? 1 : 0.55,
        transform: CSS.Transform.toString(
          transform ? { ...transform, scaleX: 1, scaleY: isDragging ? 1.02 : 1 } : null
        ),
        transition,
        zIndex: isDragging ? 5 : 0,
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      {/* Drag handle — listeners live here only, so the page still scrolls. */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        style={{
          width: 44, height: 44, flexShrink: 0, border: 0, background: 'transparent',
          color: 'rgba(255,255,255,0.40)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', touchAction: 'none',
        }}
      >
        <GripIcon />
      </button>

      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: visible ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
      }}>
        <Icon size={17} strokeWidth={1.75} color={visible ? EMERALD : 'rgba(255,255,255,0.40)'} />
      </div>

      {/* Label */}
      <div style={{
        flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500,
        color: visible ? 'rgba(255,255,255,0.92)' : MUTED,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </div>

      {/* Secondary arrow fallback — keyboard reordering without a pointer. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <button
          onClick={() => onMove(item.id, -1)}
          disabled={isFirst}
          aria-label={`Move ${label} up`}
          style={arrowBtn(isFirst)}
        >
          <ChevronUp size={13} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => onMove(item.id, 1)}
          disabled={isLast}
          aria-label={`Move ${label} down`}
          style={arrowBtn(isLast)}
        >
          <ChevronDown size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* Show / hide */}
      <button
        onClick={() => onToggle(item.id)}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={visible}
        style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 11, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: visible ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${visible ? 'rgba(52,211,153,0.28)' : 'rgba(255,255,255,0.10)'}`,
          color: visible ? EMERALD : MUTED,
        }}
      >
        {visible ? <Eye size={17} strokeWidth={1.75} /> : <EyeOff size={17} strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export default function MenuSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled } = useFeaturesContext();
  const [items, setItems] = useState<MenuConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [activeId, setActiveId] = useState<string | null>(null);

  const lastSavedRef = useRef<MenuConfigItem[]>([]);
  const saveSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/teacher/menu');
        const data = res.ok ? await res.json() : null;
        const cfg: MenuConfig | null = data?.menu ?? null;
        if (cancelled) return;
        const next = cfg && Array.isArray(cfg.items) && cfg.items.length > 0
          ? normalise(cfg.items)
          // No saved config → start from the full list, all visible. The teacher
          // trims from here; the first auto-save switches them to a custom menu.
          : MENU_REGISTRY_ORDER.map((id) => ({ id, visible: true }));
        lastSavedRef.current = next;
        setItems(next);
      } catch {
        if (!cancelled) {
          const next = MENU_REGISTRY_ORDER.map((id) => ({ id, visible: true }));
          lastSavedRef.current = next;
          setItems(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // PATCH with one retry; if the retry also fails, revert to the last saved state.
  const persist = useCallback(async (snapshot: MenuConfigItem[]) => {
    const seq = ++saveSeq.current;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      setSaveState(attempt === 0 ? 'saving' : 'retrying');
      try {
        const res = await montreeApi('/api/montree/teacher/menu', {
          method: 'PATCH',
          body: JSON.stringify({ menu: { v: MENU_CONFIG_VERSION, items: snapshot } }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || 'Save failed');
        }
        if (seq !== saveSeq.current) return; // a newer save superseded this one
        lastSavedRef.current = snapshot;
        setSaveState('saved');
        return;
      } catch {
        if (seq !== saveSeq.current) return;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        setItems(lastSavedRef.current);
        setSaveState('idle');
        toast.error('Could not save your menu — changes were undone', { duration: 2600 });
      }
    }
  }, []);

  // Auto-save: debounce every order / visibility change by 600ms.
  useEffect(() => {
    if (loading) return;
    if (sameConfig(items, lastSavedRef.current)) return;
    const h = setTimeout(() => { void persist(items); }, 600);
    return () => clearTimeout(h);
  }, [items, loading, persist]);

  const move = useCallback((id: MenuItemId, dir: -1 | 1) => {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.id === id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      // Arrows reorder within the item's own section (visible / hidden).
      if (prev[index].visible !== prev[target].visible) return prev;
      return normalise(arrayMove(prev, index, target));
    });
  }, []);

  const toggle = useCallback((id: MenuItemId) => {
    // Re-shown items land at the end of the visible list; hidden ones drop into
    // the hidden section. normalise() does both while keeping relative order.
    setItems((prev) => normalise(prev.map((it) => (it.id === id ? { ...it, visible: !it.visible } : it))));
  }, []);

  const resetToDefault = useCallback(() => {
    setItems(defaultItems(isEnabled));
  }, [isEnabled]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = useCallback((e: DragStartEvent) => setActiveId(String(e.active.id)), []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((it) => it.id === active.id);
      const to = prev.findIndex((it) => it.id === over.id);
      if (from < 0 || to < 0) return prev;
      return normalise(arrayMove(prev, from, to));
    });
  }, []);

  const labelFor = useCallback((id: MenuItemId) => {
    const def = MENU_REGISTRY[id];
    if (!def) return id as string;
    return def.labelKey ? t(def.labelKey as TranslationKey) : def.label;
  }, [t]);

  const firstHiddenId = useMemo(() => items.find((it) => !it.visible)?.id ?? null, [items]);
  const visibleCount = useMemo(() => items.filter((it) => it.visible).length, [items]);

  return (
    <div className="min-h-screen bg-[#0a1a0f]" style={{ fontFamily: SANS }}>
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 96px' }}>
      <Toaster position="top-center" richColors />

      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
        <ChevronLeft size={16} strokeWidth={1.75} /> Back
      </button>

      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 6px' }}>
        Manage Menu
      </h1>
      <p style={{ fontSize: 14, color: MUTED, margin: '0 0 20px', lineHeight: 1.5 }}>
        Drag to reorder · tap the eye to hide
      </p>

      {loading ? (
        <div style={{ color: MUTED, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          Loading your menu…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((it, index) => (
                <div key={it.id} style={{ display: 'contents' }}>
                  {it.id === firstHiddenId && (
                    <div
                      aria-hidden={false}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        margin: '14px 4px 6px', fontSize: 11, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED,
                      }}
                    >
                      Hidden
                      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
                    </div>
                  )}
                  <SortableRow
                    item={it}
                    label={labelFor(it.id)}
                    isFirst={it.visible ? index === 0 : index === visibleCount}
                    isLast={it.visible ? index === visibleCount - 1 : index === items.length - 1}
                    onMove={move}
                    onToggle={toggle}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
            <button
              onClick={resetToDefault}
              className="btn btn-ghost btn-sm"
              style={{ color: MUTED }}
            >
              <RotateCcw size={14} strokeWidth={1.9} /> Reset to default order
            </button>
          </div>

          <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
            Camera, language, and Logout are always available. Manage Menu lives at the bottom of your menu.
          </p>

          {/* Auto-save indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 14, fontSize: 12, color: MUTED, minHeight: 18,
          }}>
            {saveState === 'saving' && (<><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Saving…</>)}
            {saveState === 'retrying' && (<><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Couldn&apos;t save — retrying</>)}
            {saveState === 'saved' && (<><Check size={13} strokeWidth={2.4} color={EMERALD} /> Saved just now</>)}
          </div>
        </>
      )}

      {/* Keeps the dragged id referenced for assistive tech / future DragOverlay use. */}
      <span aria-live="polite" className="sr-only">
        {activeId ? `Moving ${labelFor(activeId as MenuItemId)}` : ''}
      </span>
    </div>
    </div>
  );
}

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 20, borderRadius: 6, border: 0,
    background: disabled ? 'transparent' : 'rgba(255,255,255,0.06)',
    color: disabled ? 'rgba(255,255,255,0.15)' : MUTED,
    cursor: disabled ? 'default' : 'pointer',
  };
}
