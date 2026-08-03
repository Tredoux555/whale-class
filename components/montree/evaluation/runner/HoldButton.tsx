'use client';

/**
 * Press-and-hold. The only way into a teacher surface while a child is at the tablet.
 *
 * A plain button labelled "Teacher summary" sitting next to a four-year-old's hand gets
 * pressed. A 1.5 s hold does not happen by accident, needs no password, and is instantly
 * learnable by the adult — the fill bar tells them it is working.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { C, SANS } from '../tokens';

export function HoldButton({
  onHold,
  label,
  hint,
  ms = 1500,
  variant = 'ghost',
}: {
  onHold: () => void;
  label: string;
  hint?: string;
  ms?: number;
  variant?: 'ghost' | 'solid';
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);

  const cancel = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setProgress(0);
  }, []);

  const begin = useCallback(() => {
    if (timer.current) return;
    setProgress(100);
    timer.current = setTimeout(() => {
      timer.current = null;
      setProgress(0);
      onHold();
    }, ms);
  }, [ms, onHold]);

  useEffect(() => cancel, [cancel]);

  const solid = variant === 'solid';
  return (
    <button
      type="button"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        minHeight: 64, padding: '14px 28px', borderRadius: 18,
        background: solid ? C.forest : C.paper,
        color: solid ? '#fff' : C.ink,
        border: `2px solid ${solid ? C.forest : C.sandDark}`,
        fontFamily: SANS, fontSize: 16, fontWeight: 600,
        cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {label}
      {hint && <span style={{ fontSize: 12, opacity: 0.7 }}>({hint})</span>}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, bottom: 0, height: 3, background: C.forest,
          width: `${progress}%`,
          transition: progress ? `width ${ms}ms linear` : 'width .18s',
        }}
      />
    </button>
  );
}

export default HoldButton;
