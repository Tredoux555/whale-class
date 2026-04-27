// components/montree/MonteeLogo.tsx
// Montree sprout logo mark — asymmetric two-leaf sprout on emerald-teal gradient

interface MontreeLogoProps {
  size?: number;
  /** showBackground: true = full icon with rounded square bg (nav, favicon)
   *  false = just the white mark, for use on already-coloured surfaces */
  showBackground?: boolean;
  className?: string;
}

export default function MontreeLogo({
  size = 32,
  showBackground = true,
  className = '',
}: MontreeLogoProps) {
  const gradId = `mg-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      {showBackground && (
        <rect
          width="32"
          height="32"
          rx="8"
          fill={`url(#${gradId})`}
        />
      )}

      {/* Stem — rises from base to centre */}
      <path
        d="M16 27 C16 27 16 18 16 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Left leaf — larger, lower, arcs left */}
      <path
        d="M16 21 C13.5 19.5 10.5 16 11.5 11 C13.5 10.5 17 14 16 21Z"
        fill="white"
        opacity="0.95"
      />

      {/* Right leaf — smaller, higher, arcs right */}
      <path
        d="M16 17 C18 15.5 20.5 12 19.5 7.5 C17.5 7 15 10 16 17Z"
        fill="white"
        opacity="0.78"
      />
    </svg>
  );
}
