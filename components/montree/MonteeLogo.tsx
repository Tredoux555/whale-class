// components/montree/MonteeLogo.tsx
// SVG logo mark for Montree — a geometric leaf/sprout in emerald-teal gradient

interface MontreeLogoProps {
  size?: number;
  className?: string;
}

export default function MontreeLogo({ size = 32, className = '' }: MontreeLogoProps) {
  const id = `montree-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Montree"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <clipPath id={`clip-${size}`}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>

      {/* Rounded square background */}
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />

      {/* Leaf mark — a central stem with two symmetrical leaves */}
      {/* Stem */}
      <line
        x1="16" y1="26"
        x2="16" y2="13"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Left leaf */}
      <path
        d="M16 19 C13 17 10 13 12 9 C14 9 17 12 16 19Z"
        fill="rgba(255,255,255,0.9)"
      />
      {/* Right leaf */}
      <path
        d="M16 16 C19 14 22 10 20 6 C18 6 15 9 16 16Z"
        fill="rgba(255,255,255,0.75)"
      />
    </svg>
  );
}
