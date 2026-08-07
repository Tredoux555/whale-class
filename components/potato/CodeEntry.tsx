// components/potato/CodeEntry.tsx
// The six code boxes.
//
// A parent does this once, standing in a hallway, holding a paper card. So: one
// real (visually hidden) input carries focus and the phone keyboard, and the six
// boxes are painted from its value. That keeps mobile autofill, paste and the
// backspace key working, which per-box inputs famously break.

'use client';

import React, { useRef, useState, useEffect } from 'react';

const LENGTH = 6;

interface CodeEntryProps {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function CodeEntry({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
}: CodeEntryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, LENGTH);
    onChange(cleaned);
    if (cleaned.length === LENGTH) onComplete?.(cleaned);
  };

  const boxes = [];
  for (let i = 0; i < LENGTH; i++) {
    const char = value[i] ?? '';
    const isCurrent = focused && !disabled && i === Math.min(value.length, LENGTH - 1) && !char;
    boxes.push(
      <div key={i} className={`pt-cbox ${char ? 'pt-cbox--on' : ''} ${isCurrent ? 'pt-cbox--cur' : ''}`.trim()}>
        {char || (isCurrent ? <div className="pt-caret" /> : null)}
      </div>,
    );
  }

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <input
        ref={inputRef}
        className="pt-codeinput"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="one-time-code"
        spellCheck={false}
        maxLength={LENGTH}
        aria-label="Your 6-character code"
      />
      <div className="pt-codeboxes">{boxes}</div>
    </div>
  );
}
