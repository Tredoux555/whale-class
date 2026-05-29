// components/montree/admin/TracyBody.tsx
//
// Renders Astra's body prose with copy cards substituted in for fenced
// code blocks. The fence convention is documented in
// lib/montree/tracy/system-prompt.ts: any message Astra drafts that the
// principal will copy and forward gets wrapped in a triple-backtick fence,
// with an optional bold recipient label on the line immediately before.
//
// Example shape Astra emits:
//
//   Here you go — short welcomes for each teacher, codes baked in.
//
//   **Donna**
//   ```
//   Hey Donna! Welcome to Test School 2 on Montree. ...
//   ```
//
//   **Matty**
//   ```
//   Hey Matty! Welcome ...
//   ```
//
// We DON'T pull in react-markdown for this — the format is narrow and
// well-defined, and a focused parser is faster, smaller, and avoids
// security questions about arbitrary markdown rendering.
//
// What we render:
//   - Fenced blocks → <CopyableMessageCard /> with optional recipient label
//   - **bold** spans inside prose → <strong>...</strong>
//   - Everything else → plain whitespace-preserving text
//
// What we INTENTIONALLY don't render specially:
//   - Bullet lists, headings, links — Astra is instructed not to use them
//     in body prose. If she does, it renders as plain text with the
//     symbols visible. That's fine and keeps this component honest.
'use client';

import { Fragment, type ReactNode } from 'react';
import CopyableMessageCard from './CopyableMessageCard';

interface TracyBodyProps {
  text: string;
  /** Style overrides for the wrapping div (caller controls font/colour). */
  style?: React.CSSProperties;
}

interface ParsedSegment {
  kind: 'prose' | 'card';
  /** For prose segments: the raw text. */
  text?: string;
  /** For card segments: the message body inside the fence. */
  body?: string;
  /** For card segments: optional recipient label parsed from the bold line above. */
  recipient?: string;
}

const FENCE_RE = /```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```/g;
// "**Donna**" or "**Donna's mum**" — letters, spaces, apostrophes, hyphens.
const TRAILING_BOLD_HEADER_RE = /\*\*([^*\n]+?)\*\*\s*$/;

/**
 * Parse Astra's body prose into an ordered list of prose + card segments.
 * Recipient labels are detected as `**Name**` on the line immediately
 * preceding a fence — when found, the label is stripped from the prose
 * segment and attached to the card.
 */
function parseSegments(text: string): ParsedSegment[] {
  if (!text || !text.trim()) return [];
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  // Reset regex state — it's a top-level constant with /g.
  FENCE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FENCE_RE.exec(text)) !== null) {
    const fenceStart = match.index;
    const fenceEnd = match.index + match[0].length;
    const body = match[1] ?? '';

    let prose = text.slice(lastIndex, fenceStart);
    let recipient: string | undefined;

    // If the prose ends with `**Name**` (optionally followed by whitespace
    // newlines), pull it off as the recipient label for the upcoming card.
    const trimmed = prose.replace(/\s+$/, '');
    const headerMatch = trimmed.match(TRAILING_BOLD_HEADER_RE);
    if (headerMatch) {
      recipient = headerMatch[1].trim();
      prose = trimmed.slice(0, trimmed.length - headerMatch[0].length);
    }

    if (prose.trim()) {
      segments.push({ kind: 'prose', text: prose });
    }
    segments.push({ kind: 'card', body, recipient });

    lastIndex = fenceEnd;
  }

  const tail = text.slice(lastIndex);
  if (tail.trim()) {
    segments.push({ kind: 'prose', text: tail });
  }

  return segments;
}

/**
 * Render `**bold**` as <strong> inside otherwise-plain prose. We accept
 * unmatched `**` (just render as text) so Astra's stray asterisks don't
 * collapse the rest of her message.
 */
function renderProse(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Split on **...** while keeping the matched groups so we can render
  // them as <strong>. The pattern matches the shortest run between the
  // delimiters and refuses to span newlines so a stray `**` lower in the
  // text doesn't bold paragraphs of content.
  const re = /\*\*([^*\n]+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`p${key++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }
    parts.push(<strong key={`b${key++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={`p${key++}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return parts;
}

export default function TracyBody({ text, style }: TracyBodyProps) {
  const segments = parseSegments(text);

  // Fast path — no fences. Render with bold-span support and original
  // whitespace preservation. This is the most common case for short turns.
  if (segments.length === 0 || segments.every((s) => s.kind === 'prose')) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', ...style }}>
        {renderProse(text)}
      </div>
    );
  }

  return (
    <div style={style}>
      {segments.map((seg, i) => {
        if (seg.kind === 'card') {
          return (
            <CopyableMessageCard
              key={`card-${i}`}
              text={seg.body || ''}
              recipient={seg.recipient}
            />
          );
        }
        return (
          <div
            key={`prose-${i}`}
            style={{
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderProse(seg.text || '')}
          </div>
        );
      })}
    </div>
  );
}
