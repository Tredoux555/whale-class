'use client';

// components/montree/shared/KebabMenu.tsx
//
// The uniform three-dot (kebab) menu used at the top-right of every
// authenticated Montree surface. Design precedent: the More menu in
// components/montree/DashboardHeader.tsx — same glass trigger, same dark
// dropdown panel, same danger-row treatment. Extracted here so the principal
// setup wizard, the parent portal and the agent nav all get an identical
// affordance instead of hand-rolling one each.
//
// Deliberately self-contained (no imports beyond React + lucide) so it can be
// dropped into any theme without dragging a token module along.

import { useState, useEffect, useRef, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";

const C = {
  glassBtn: 'rgba(255,255,255,0.10)',
  glassBtnHvr: 'rgba(255,255,255,0.18)',
  border: 'rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.08)',
  textLo: 'rgba(255,255,255,0.75)',
  textMute: 'rgba(255,255,255,0.50)',
  textDanger: 'rgba(239,100,100,0.8)',
  menuBg: 'rgba(8,20,12,0.95)',
} as const;

export interface KebabItem {
  icon: React.ElementType;
  label: string;
  /** Danger rows render red (logout, delete). */
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
}

// ── One menu row ──────────────────────────────────────────────────────────────
function KebabRow({ item, onDone }: { item: KebabItem; onDone: () => void }) {
  const [hover, setHover] = useState(false);
  const Icon = item.icon;
  const color = item.danger ? C.textDanger : (item.active ? C.emerald : C.textLo);
  const iconColor = item.danger ? C.textDanger : (item.active ? C.emerald : C.textMute);
  const bg = (hover || item.active) ? C.emeraldSoft : 'transparent';
  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { onDone(); void item.onClick?.(); }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', background: bg, border: 0, borderRadius: 8,
        color, fontSize: 13, fontWeight: 500, textAlign: 'left',
        cursor: item.disabled ? 'default' : 'pointer',
        opacity: item.disabled ? 0.5 : 1,
        fontFamily: SANS, transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      <Icon size={16} strokeWidth={1.75} color={iconColor} />
      <span>{item.label}</span>
    </button>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
// Mirrors MENU_PANEL_STYLE in DashboardHeader: safe-area aware bottom padding
// (so the last row isn't under the iPad home indicator) and a dvh-based max
// height (vh doesn't shrink with the Safari toolbars and clips the panel).
function panelStyle(align: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    ...(align === 'right' ? { right: 0 } : { left: 0 }),
    width: 248,
    padding: 6,
    paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
    background: C.menuBg,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    // Sits above the funnel topbar (z 5), parent sticky headers (z 10–20) and
    // the agent nav (z 30).
    zIndex: 90,
    maxHeight: 'calc(100dvh - 80px)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  };
}

export default function KebabMenu({
  items,
  variant = 'forest',
  align = 'right',
  title = 'Menu',
  className = '',
}: {
  items: KebabItem[];
  /** `forest` = in-app glass button; `funnel` = Lanternlight pill (setup wizard). */
  variant?: 'forest' | 'funnel';
  align?: 'left' | 'right';
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isFunnel = variant === 'funnel';
  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: isFunnel ? 32 : 36,
    padding: isFunnel ? '6px 9px' : '8px 10px',
    background: (hover || open) ? C.glassBtnHvr : C.glassBtn,
    border: isFunnel ? '1px solid rgba(255,255,255,0.08)' : 0,
    borderRadius: isFunnel ? 999 : 10,
    color: '#fff', cursor: 'pointer', flexShrink: 0,
    transition: 'background 140ms ease', fontFamily: SANS,
  };

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`btn btn-secondary btn-icon btn-sm flex-shrink-0 ${isFunnel ? 'btn-round' : ''}`}
      >
        <MoreHorizontal size={isFunnel ? 16 : 18} strokeWidth={1.75} color="#fff" />
      </button>

      {open && (
        <div role="menu" style={panelStyle(align)}>
          {items.map((item, i) => (
            <KebabRow key={`${item.label}-${i}`} item={item} onDone={close} />
          ))}
        </div>
      )}
    </div>
  );
}
