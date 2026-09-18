// components/montree/MenuReorderSection.tsx
// Long-press-to-reorder for the teacher's customizable rows in the "…" menu
// (DashboardHeader). The PINNED rows above the divider are NOT part of this —
// only the rows that come from the teacher's saved config (settings.menu).
//
// Interaction: press and hold any row for ~400ms (mouse or touch). The row
// double-flashes, lifts, the rest dim, and it can be dragged up/down; on release
// the new order is saved to settings.menu with the same debounce / one-retry /
// revert contract the Manage Menu page uses. A plain tap is untouched — it still
// navigates, and a long-press is prevented from firing that navigation.
//
// Ordering contract: this ONLY permutes the ids it renders. Hidden items and the
// visible-but-not-rendered ids ('milestones', 'manage_students', which the header
// pins elsewhere) keep their exact index in the saved array, so a reorder here is
// invisible to Manage Menu's normalise() and to the server-side move-to-front in
// lib/montree/features/menu-sync.ts.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, AlertCircle } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { MENU_CONFIG_VERSION, type MenuConfigItem } from '@/lib/montree/menu/config';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const MUTED = 'rgba(255,255,255,0.62)';

/** One rendered menu row, keyed by the config id it came from. */
export interface ReorderEntry {
  id: string;
  node: React.ReactNode;
}

interface Props {
  /** The teacher's full saved item list (visible + hidden), in saved order. */
  items: MenuConfigItem[];
  /** The rows the header renders from that list, in the same relative order. */
  entries: ReorderEntry[];
  /** Optimistic + revert channel back to the header's menuConfig state. */
  onItemsChange: (next: MenuConfigItem[]) => void;
  /** Lets the header keep the panel open while a drag is in flight. */
  onDraggingChange?: (dragging: boolean) => void;
}

function sameOrder(a: MenuConfigItem[], b: MenuConfigItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((it, i) => it.id === b[i].id && it.visible === b[i].visible);
}

/**
 * Apply a new order for `orderedIds` onto the full list, leaving every other
 * item exactly where it was (hidden rows stay at the end, pinned-elsewhere ids
 * keep their slot).
 */
function applyOrder(items: MenuConfigItem[], orderedIds: string[]): MenuConfigItem[] {
  const inScope = new Set(orderedIds);
  const byId = new Map(items.map((it) => [it.id as string, it]));
  let cursor = 0;
  return items.map((it) => {
    if (!inScope.has(it.id as string)) return it;
    const next = byId.get(orderedIds[cursor]);
    cursor += 1;
    return next ?? it;
  });
}

function SortableMenuRow({
  entry, lifted, dimmed, suppressClickRef,
}: {
  entry: ReorderEntry;
  lifted: boolean;
  dimmed: boolean;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const pressingRef = useRef(false);

  const base = transform ? { ...transform, scaleX: 1, scaleY: 1 } : null;
  const transformStr = lifted
    ? `${base ? CSS.Transform.toString(base) : ''} scale(1.04)`.trim()
    : CSS.Transform.toString(base);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={lifted ? 'mt-menu-lift mt-menu-flash' : undefined}
      onPointerDown={() => { pressingRef.current = true; }}
      onPointerUp={() => { pressingRef.current = false; }}
      onPointerCancel={() => { pressingRef.current = false; }}
      // A long-press must not open the iOS callout / native context menu, and
      // must not fall through to the row's navigation on release.
      onContextMenu={(e) => { if (pressingRef.current || isDragging) e.preventDefault(); }}
      onClickCapture={(e) => {
        if (suppressClickRef.current) { e.preventDefault(); e.stopPropagation(); }
      }}
      style={{
        position: 'relative',
        borderRadius: 8,
        // pan-y keeps the menu scrollable with a finger; the 400ms delay is what
        // distinguishes a scroll/tap from a reorder.
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        transform: transformStr || undefined,
        transition,
        opacity: dimmed ? 0.7 : 1,
        zIndex: lifted ? 5 : 0,
        background: lifted ? 'rgba(255,255,255,0.10)' : undefined,
        border: lifted ? '1px solid rgba(52,211,153,0.45)' : '1px solid transparent',
        boxShadow: lifted ? '0 10px 26px rgba(0,0,0,0.42)' : undefined,
      }}
    >
      {entry.node}
    </div>
  );
}

export default function MenuReorderSection({ items, entries, onItemsChange, onDraggingChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<'saved' | 'error' | null>(null);

  const suppressClickRef = useRef(false);
  const lastSavedRef = useRef<MenuConfigItem[]>(items);
  const dirtyRef = useRef(false);
  const saveSeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the revert target in step with server refreshes (focus revalidation),
  // but never while our own save is still pending.
  useEffect(() => {
    if (!dirtyRef.current) lastSavedRef.current = items;
  }, [items]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const flashToast = useCallback((kind: 'saved' | 'error') => {
    setToast(kind);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1200);
  }, []);

  // PATCH with one retry; if the retry also fails, revert to the last saved order.
  const persist = useCallback(async (snapshot: MenuConfigItem[]) => {
    const seq = ++saveSeq.current;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await montreeApi('/api/montree/teacher/menu', {
          method: 'PATCH',
          body: JSON.stringify({ menu: { v: MENU_CONFIG_VERSION, items: snapshot } }),
        });
        if (!res.ok) throw new Error('Save failed');
        if (seq !== saveSeq.current) return; // superseded by a newer drop
        lastSavedRef.current = snapshot;
        dirtyRef.current = false;
        flashToast('saved');
        return;
      } catch {
        if (seq !== saveSeq.current) return;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        onItemsChange(lastSavedRef.current);
        dirtyRef.current = false;
        flashToast('error');
      }
    }
  }, [flashToast, onItemsChange]);

  const scheduleSave = useCallback((snapshot: MenuConfigItem[]) => {
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void persist(snapshot); }, 600);
  }, [persist]);

  const sensors = useSensors(
    // 400ms hold = the long-press. Below that the press is a normal tap, and a
    // finger that travels more than the tolerance scrolls the menu instead.
    useSensor(PointerSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
  );

  const endDrag = useCallback(() => {
    setActiveId(null);
    onDraggingChange?.(false);
    // Swallow the click that follows the release of a long-press.
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 320);
  }, [onDraggingChange]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    onDraggingChange?.(true);
    try { navigator.vibrate?.(10); } catch { /* no haptics */ }
  }, [onDraggingChange]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    endDrag();
    if (!over || active.id === over.id) return;
    const ids = entries.map((en) => en.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = applyOrder(items, arrayMove(ids, from, to));
    if (sameOrder(next, items)) return;
    onItemsChange(next);
    scheduleSave(next);
  }, [endDrag, entries, items, onItemsChange, scheduleSave]);

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes montree-menu-flash {
          0%   { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          12%  { box-shadow: 0 0 0 2px rgba(52,211,153,0.85); }
          25%  { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          37%  { box-shadow: 0 0 0 2px rgba(52,211,153,0.85); }
          50%  { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          100% { box-shadow: 0 10px 26px rgba(0,0,0,0.42); }
        }
        /* Two ~120ms emerald pulses, then the lifted shadow takes over. */
        .mt-menu-flash { animation: montree-menu-flash 480ms ease-out 1; }
        .mt-menu-lift  { transition: opacity 140ms ease, background 140ms ease; }
        @media (prefers-reduced-motion: reduce) { .mt-menu-flash { animation: none; } }
      `}</style>

      {activeId && (
        <div style={{
          padding: '4px 10px 6px', fontSize: 11, fontFamily: SANS,
          color: MUTED, letterSpacing: 0.2,
        }}>
          Drag to move · release to drop
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <SortableContext items={entries.map((en) => en.id)} strategy={verticalListSortingStrategy}>
          {entries.map((en) => (
            <SortableMenuRow
              key={en.id}
              entry={en}
              lifted={activeId === en.id}
              dimmed={!!activeId && activeId !== en.id}
              suppressClickRef={suppressClickRef}
            />
          ))}
        </SortableContext>
      </DndContext>

      {toast && (
        <div style={{
          position: 'sticky', bottom: 2, zIndex: 8, pointerEvents: 'none',
          display: 'flex', justifyContent: 'center', marginTop: 6,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999, fontFamily: SANS,
            fontSize: 11.5, fontWeight: 500,
            color: toast === 'saved' ? '#34d399' : 'rgba(239,100,100,0.9)',
            background: 'rgba(8,20,12,0.92)',
            border: `1px solid ${toast === 'saved' ? 'rgba(52,211,153,0.45)' : 'rgba(239,68,68,0.45)'}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}>
            {toast === 'saved'
              ? <><Check size={12} strokeWidth={2.4} /> Saved</>
              : <><AlertCircle size={12} strokeWidth={2.2} /> Couldn&apos;t save</>}
          </span>
        </div>
      )}
    </div>
  );
}
