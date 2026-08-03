'use client';

/**
 * The guide — one small character who is present on every screen of a check-in.
 *
 * She is the same figure from the first practice item to the close, and she never reacts
 * to whether an answer was right: she bobs, and at the end she cheers for the child having
 * stayed the whole way through. A character who cheered on correct answers would be
 * feedback, and feedback during a check-in teaches the child to read the adult instead of
 * the material.
 *
 * Motion respects `prefers-reduced-motion` — the animation is decorative, and some children
 * find persistent movement hard to sit beside.
 */
import { C } from './tokens';

export function GuideCharacter({
  size = 104,
  pose = 'calm',
  animate = true,
}: {
  size?: number;
  pose?: 'calm' | 'cheer';
  animate?: boolean;
}) {
  const arms = pose === 'cheer'
    ? 'M22 62 L6 42 M78 62 L94 42'
    : 'M22 62 L10 74 M78 62 L90 74';

  return (
    <>
      <style>{`
        @keyframes mm-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        @keyframes mm-cheer { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
        @media (prefers-reduced-motion: reduce) { .mm-guide { animation: none !important } }
      `}</style>
      <svg
        className="mm-guide"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        style={{
          flex: '0 0 auto',
          animation: animate
            ? (pose === 'cheer' ? 'mm-cheer 2.4s ease-in-out infinite' : 'mm-bob 3.2s ease-in-out infinite')
            : undefined,
        }}
      >
        <path d="M50 6 q10 8 3 17" stroke={C.moss} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M53 17 q14-12 22-2 q-12 10 -22 2Z" fill={C.moss} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="50" cy="58" r="32" fill={C.sand} stroke={C.ink} strokeWidth="4" />
        <circle cx="39" cy="52" r="9" fill={C.paper} stroke={C.ink} strokeWidth="3" />
        <circle cx="61" cy="52" r="9" fill={C.paper} stroke={C.ink} strokeWidth="3" />
        <circle cx="40" cy="53" r="4" fill={C.ink} />
        <circle cx="62" cy="53" r="4" fill={C.ink} />
        <circle cx="30" cy="66" r="5" fill={C.gold} opacity="0.55" />
        <circle cx="70" cy="66" r="5" fill={C.gold} opacity="0.55" />
        {pose === 'cheer'
          ? <path d="M42 60 q8 10 16 0 q-8 4 -16 0Z" fill={C.ink} />
          : <path d="M43 60 q7 7 14 0" stroke={C.ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />}
        <path d={arms} stroke={C.ink} strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    </>
  );
}

export default GuideCharacter;
