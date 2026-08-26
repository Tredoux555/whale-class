// components/lens/GuruPanel.tsx
// The Lens Guru, as a drawer at the bottom of the report editor.
//
// 🚨 NOTHING THE GURU SAYS GOES INTO THE REPORT BY ITSELF.
// Every mode streams into this panel and stops there. "Use this" is an explicit
// tap that hands the text to the caller, which is what makes the Storypark rule
// — AI drafts, she reviews, she decides — true at the level of the interface and
// not just in a prompt.
//
// The SSE parser is the same shape as the one the Montree Guru stream uses:
// `data: {json}\n\n` frames, {type:'text'} while it writes and {type:'done'} at
// the end. An {type:'error'} frame carries a reason, so a stream that dies
// mid-sentence says why rather than just stopping.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD } from '@/lib/lens/ui';
import { GURU_MODES, MODE_LABELS, type GuruMode } from '@/lib/lens/guru/modes';

export interface GuruRequest {
  mode: GuruMode;
  /** The text the mode works on (a section body, for tighten/kinder/firmer). */
  text?: string;
  sectionKey?: string;
  message?: string;
}

export function GuruPanel({
  visitId,
  reportId,
  open,
  onClose,
  pending,
  onUse,
}: {
  visitId: string;
  reportId: string;
  open: boolean;
  onClose: () => void;
  /** Set by the editor when a section button is tapped; runs immediately. */
  pending: GuruRequest | null;
  /** Called when she taps "Use this" — with the text and the section it was for. */
  onUse: (text: string, sectionKey?: string) => void;
}) {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [lastRequest, setLastRequest] = useState<GuruRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (request: GuruRequest) => {
      // A second run must not interleave with the first.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setRunning(true);
      setError(null);
      setOutput('');
      setLastRequest(request);

      try {
        const response = await fetch('/api/lens/guru/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({
            visitId,
            reportId,
            mode: request.mode,
            text: request.text,
            sectionKey: request.sectionKey,
            message: request.message,
          }),
        });

        // 🚨 Status before body. A 500 serves an HTML error page, and parsing
        // that as SSE produces a silent empty answer instead of the real reason.
        if (!response.ok || !response.body) {
          let reason = `The Guru couldn’t answer (${response.status}).`;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload?.error) reason = payload.error;
          } catch {
            /* not JSON */
          }
          throw new Error(reason);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let text = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          // The last element is whatever has not been terminated yet.
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith('data:')) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim()) as {
                type?: string;
                content?: string;
                message?: string;
              };
              if (payload.type === 'text' && payload.content) {
                text += payload.content;
                setOutput(text);
              } else if (payload.type === 'error') {
                throw new Error(payload.message || 'The Guru stopped mid-sentence.');
              }
            } catch (err) {
              // A frame we cannot parse is a frame; a thrown error frame is a
              // failure. Distinguish by whether it is our own Error.
              if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
                throw err;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'The Guru couldn’t answer.');
      } finally {
        setRunning(false);
      }
    },
    [visitId, reportId],
  );

  // Run whatever the editor handed us, once per hand-off.
  //
  // The key is what makes "once" true: the same request object arriving again
  // (a re-render, a parent state change) must not fire a second stream and
  // interleave two answers in the same box.
  const pendingKey = pending
    ? `${pending.mode}:${pending.sectionKey ?? ''}:${pending.text?.length ?? 0}`
    : '';
  const lastKeyRef = useRef('');
  useEffect(() => {
    if (!open || !pending || pendingKey === lastKeyRef.current) return;
    lastKeyRef.current = pendingKey;
    run(pending);
  }, [open, pending, pendingKey, run]);

  if (!open) return null;

  return (
    <div className="ln-noprint fixed inset-x-0 bottom-0 z-30 max-h-[80dvh] overflow-y-auto border-t border-[rgba(52,211,153,0.25)] bg-[#0A1A0F]/98 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-serif text-lg text-forest-text">Lens Guru</p>
          <button type="button" className={BTN_GHOST} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ln-rail mb-3">
          {GURU_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className="ln-chip"
              data-on={lastRequest?.mode === mode ? '1' : '0'}
              disabled={running}
              onClick={() =>
                run({
                  mode,
                  // Tighten / kinder / firmer keep working on whatever text the
                  // editor last handed over, so she can chain them.
                  text: lastRequest?.text,
                  sectionKey: lastRequest?.sectionKey,
                  message: message || undefined,
                })
              }
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div className="mb-3 flex gap-2">
          <input
            className="ln-field"
            placeholder="Ask it something — “is this normal for week two of term?”"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && message.trim() && !running) {
                run({ mode: 'brainstorm', message });
              }
            }}
          />
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={running || !message.trim()}
            onClick={() => run({ mode: 'brainstorm', message })}
          >
            Ask
          </button>
        </div>

        {error && <p className="mb-2 text-[13px] text-forest-danger">{error}</p>}

        <div className={`${CARD} min-h-[120px]`}>
          {output ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-forest-text">{output}</p>
          ) : (
            <p className="text-[13px] text-forest-muted">
              {running ? 'Thinking…' : 'Pick a mode, or ask a question.'}
            </p>
          )}
        </div>

        {output && !running && lastRequest && lastRequest.mode !== 'brainstorm' && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => onUse(stripEvidenceFooter(output), lastRequest.sectionKey)}
            >
              {lastRequest.sectionKey ? 'Use this for the section' : 'Copy into the report'}
            </button>
            <button type="button" className={BTN_GHOST} onClick={() => setOutput('')}>
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The draft_section mode is told to end with an "EVIDENCE: id, id" line so she
 * can see what it drew on. That line is a note to her, not part of the section,
 * so it is removed when the text is put INTO the report — the citations
 * themselves live in the section's evidence array, not in its prose.
 */
export function stripEvidenceFooter(text: string): string {
  return text.replace(/\n*^EVIDENCE:.*$/im, '').trimEnd();
}
