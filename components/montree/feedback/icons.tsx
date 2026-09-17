// components/montree/feedback/icons.tsx
//
// The board's whole icon set, inline. No icon package, no emoji: an emoji is
// rendered by the OS and looks different on every phone the board runs on,
// which on a calm notice board reads as noise.
//
// Every icon is decorative and marked aria-hidden; the meaning lives in the
// label or the aria-label of the control it sits in.

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The vote caret. Solid, so the pill reads as pressed at a glance. */
export function CaretUp({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 10) / 12)}
      viewBox="0 0 12 10"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 0 12 10H0z" />
    </svg>
  );
}

export const SearchIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const PlusIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const CloseIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="m5 5 14 14M19 5 5 19" />
  </Svg>
);

export const CheckIcon = (p: Props) => (
  <Svg {...p} strokeWidth={3}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
);

export const BackIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M15 5 8 12l7 7" />
  </Svg>
);

export const QuestionIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M9.2 9a2.8 2.8 0 1 1 3.8 2.6c-.8.3-1 .9-1 1.6v.4" />
    <path d="M12 17.5h.01" />
  </Svg>
);

export const ChatIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
  </Svg>
);

export const ImageIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="m5 18 5-4 4 3 3-2 2 3" />
  </Svg>
);

export const EyeOffIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
    <path d="m4 20 16-16" />
  </Svg>
);

export const FlagIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 5h11l-1.6 3.5L16 12H5z" />
  </Svg>
);

export const ArrowDownIcon = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="M12 4v15" />
    <path d="m6 13 6 6 6-6" />
  </Svg>
);

export const QuoteIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M9 10H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2z" />
    <path d="M9 10v3a4 4 0 0 1-4 4" />
    <path d="M20 10h-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2z" />
    <path d="M20 10v3a4 4 0 0 1-4 4" />
  </Svg>
);
