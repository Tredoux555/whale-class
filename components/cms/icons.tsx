// components/cms/icons.tsx
// A hand-picked inline SVG set. No icon package: the skeleton needs nine icons,
// and a dependency for nine icons is a dependency for nine icons.
//
// Every icon is 24×24, stroke-based, `currentColor` — so it inherits the button
// or tag colour it sits in and needs no per-variant styling.

type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M10.3 3.9 1.9 18.2a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function UtensilsIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <path d="M6 3v8a2 2 0 0 0 4 0V3" />
      <path d="M8 11v10" />
      <path d="M17 3c-1.7 1-2.5 3-2.5 5.5S15.3 13 17 14v7" />
    </svg>
  );
}

export function HandoverIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <path d="M4 12h13" />
      <path d="m13.5 7 5 5-5 5" />
      <path d="M20.5 5v14" />
    </svg>
  );
}

export function PillIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" />
      <path d="M12 8.4v7.2" />
    </svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.1} className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M5 12h13" />
      <path d="m12.5 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
      <path d="M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** Phase 5 — the one action a document page offers. */
export function PrinterIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M7 8V3.5h10V8" />
      <path d="M7 17H5.5A2.5 2.5 0 0 1 3 14.5v-4A2.5 2.5 0 0 1 5.5 8h13A2.5 2.5 0 0 1 21 10.5v4a2.5 2.5 0 0 1-2.5 2.5H17" />
      <rect x="7" y="14" width="10" height="6.5" rx="1" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M15.5 20.5v-1.7a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.8v1.7" />
      <circle cx="9.25" cy="7.6" r="3.6" />
      <path d="M21 20.5v-1.7a3.6 3.6 0 0 0-2.7-3.5" />
      <path d="M15.8 4.2a3.6 3.6 0 0 1 0 6.9" />
    </svg>
  );
}

/** Phase 7 — the parent doorway names what is waiting in Montree, and "photos"
 *  and "calls" are the two things no existing icon in this set can stand in for
 *  without lying about which surface a family is being pointed at. Same 24×24
 *  stroke grammar as every icon above; still no icon package. */
export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.9l1.3-2.2h6.6L16.6 6h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.8" r="3.6" />
    </svg>
  );
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <rect x="2.8" y="6" width="12.6" height="12" rx="2.4" />
      <path d="M15.4 11.2 21.2 8v8l-5.8-3.2z" />
    </svg>
  );
}

/**
 * Inline icon box. `.cms-btn > svg` only sizes DIRECT svg children, so an icon that
 * needs a wrapper (for RTL flipping) must carry its own box or it collapses to
 * zero width. Use this instead of a bare span.
 */
export function IconBox({
  children,
  flip = false,
}: {
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center w-[1.05em] h-[1.05em] shrink-0 ${
        flip ? 'cms-flip' : ''
      }`}
    >
      {children}
    </span>
  );
}
