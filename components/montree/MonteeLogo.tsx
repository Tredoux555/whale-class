// components/montree/MonteeLogo.tsx
// The Montree brand mark — gold damascus serif "M" on deep forest green
// (rebranded Jul 2026; replaces the old teal sprout SVG). Same component API
// as before, so every screen that renders <MontreeLogo /> got the new mark
// with zero call-site changes.
//
// Assets (public/brand/):
//   m-tile.png  — M on the green field (used when showBackground = true)
//   m-mark.png  — transparent gold M only (for already-coloured surfaces)

interface MontreeLogoProps {
  size?: number;
  /** showBackground: true = full tile with rounded green background (nav, overlays)
   *  false = just the gold mark, for use on already-coloured surfaces */
  showBackground?: boolean;
  className?: string;
}

export default function MontreeLogo({
  size = 32,
  showBackground = true,
  className = '',
}: MontreeLogoProps) {
  if (showBackground) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/m-tile.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className={className}
        style={{
          display: 'block',
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          objectFit: 'cover',
          flex: 'none',
        }}
        draggable={false}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/m-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        flex: 'none',
      }}
      draggable={false}
    />
  );
}
