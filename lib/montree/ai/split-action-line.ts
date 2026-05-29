// lib/montree/ai/split-action-line.ts
//
// Canonical parser for Astra + Mira's action-line marker.
//
// 🚨 Session 113 V2 — Astra + Mira audit MED-5. Until this module, four
// separate `splitActionLine` copies existed across the codebase with two
// different return shapes:
//   - components/montree/admin/TracyFloat.tsx       { body, action: string | null }
//   - components/montree/agent/MiraFloat.tsx        { body, action: string | null }
//   - app/montree/admin/page.tsx                    { body, action: string | null }
//   - app/montree/agent/mira/page.tsx               { mainText, actionLine: string }
//
// The drift was a real bug magnet — changes to one parser didn't propagate to
// the others. This module is the single source of truth.
//
// CONTRACT:
//   The action-line marker is the LITERAL ARROW `→ ` (followed by a space) at
//   the start of the final paragraph or line. ASCII alternative `-> ` is also
//   accepted (clients on keyboards that can't type → fall back to ->).
//
//   For cached responses generated before the action-line system prompt rule
//   was tightened, lines starting with `I'd ` (or `I’d ` with curly apostrophe)
//   in the final paragraph are also surfaced as action lines so the legacy
//   conversations still render with the action-line treatment in the UI.
//
// RETURN SHAPE: { body, action: string | null }
//   - body: everything before the action line, trimmed
//   - action: the action line text with the `→ ` prefix stripped, or null
//     if no action line was detected.

const ARROW_RE = /^\s*(?:→|->)\s+/;
const LEGACY_ID_RE = /^I['’]d\s/i;

export interface ActionLineSplit {
  body: string;
  action: string | null;
}

export function splitActionLine(text: string | null | undefined): ActionLineSplit {
  if (!text || !text.trim()) {
    return { body: text || '', action: null };
  }

  // Case 1: last paragraph (separated by blank lines) starts with the arrow.
  const paragraphs = text.split(/\n\s*\n/);
  const lastPara = paragraphs[paragraphs.length - 1]?.trim() ?? '';

  if (ARROW_RE.test(lastPara)) {
    const action = lastPara.replace(ARROW_RE, '').trim();
    const body = paragraphs.slice(0, -1).join('\n\n').trim();
    return { body, action };
  }

  // Case 2: last LINE (single-newline separated) starts with the arrow. This
  // handles responses that didn't have a blank line before the action.
  const lines = text.split(/\n/);
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1].trim();
    if (ARROW_RE.test(lastLine)) {
      const action = lastLine.replace(ARROW_RE, '').trim();
      const body = lines.slice(0, -1).join('\n').trim();
      return { body, action };
    }
  }

  // Case 3: legacy "I'd ..." action line (cached pre-arrow conversations).
  if (LEGACY_ID_RE.test(lastPara)) {
    const body = paragraphs.slice(0, -1).join('\n\n').trim();
    return { body, action: lastPara };
  }

  return { body: text.trim(), action: null };
}
