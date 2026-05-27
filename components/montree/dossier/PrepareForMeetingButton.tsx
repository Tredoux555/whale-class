// components/montree/dossier/PrepareForMeetingButton.tsx
//
// The "Prepare for a meeting with this parent" button surfaced on:
//   - parent message thread row (admin/communication/threads/[id])
//   - child page (admin/child/[id])
//
// Click → modal asks for meeting_purpose + optional parent_context →
// POST /api/montree/admin/dossier/parent-meeting → render DossierRenderer
// inline OR open the print view in a new tab.
//
// The component is its own little state machine:
//   'idle'      — button visible
//   'modal'     — input form open
//   'loading'   — Sonnet running, show progress
//   'ready'     — dossier rendered
//   'error'     — show error + retry
//
// Wraps everything in a portal-style overlay so the parent page can use
// it without layout conflicts.

'use client';

import { useState, useCallback } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { DossierRenderer } from './DossierRenderer';

interface DossierResponse {
  payload: string;
  output_format: 'markdown' | 'html' | 'json';
  generated_at: string;
  from_cache: boolean;
  cost_usd: number | null;
  source_counts: {
    observations: number;
    behavioural_observations: number;
    teacher_notes: number;
    work_session_notes: number;
    guru_analyses: number;
    pattern_events: number;
    progress_entries: number;
    developmental_insights: number;
    parent_states: number;
  };
  child_name: string;
  cache_active: boolean;
}

export interface PrepareForMeetingButtonProps {
  childId: string;
  childName: string;
  classroomName?: string | null;
  /** Default text for meeting_purpose. The principal can edit before firing. */
  defaultPurpose?: string;
  /** Visual variant — 'pill' for inline thread chrome, 'block' for child page header. */
  variant?: 'pill' | 'block';
  /** Label override. Default 'Prepare for a parent meeting'. */
  label?: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'modal' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: DossierResponse }
  | { kind: 'error'; message: string };

export function PrepareForMeetingButton({
  childId,
  childName,
  classroomName,
  defaultPurpose = '',
  variant = 'pill',
  label = 'Prepare for a parent meeting',
}: PrepareForMeetingButtonProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [purpose, setPurpose] = useState<string>(defaultPurpose);
  const [parentContext, setParentContext] = useState<string>('');

  const open = useCallback(() => {
    setState({ kind: 'modal' });
  }, []);
  const close = useCallback(() => setState({ kind: 'idle' }), []);

  const fire = useCallback(async () => {
    if (!purpose.trim()) {
      setState({
        kind: 'error',
        message: 'Tell me what the meeting is about first.',
      });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await montreeApi<DossierResponse>(
        '/api/montree/admin/dossier/parent-meeting',
        {
          method: 'POST',
          body: JSON.stringify({
            child_id: childId,
            meeting_purpose: purpose.trim(),
            parent_context: parentContext.trim() || undefined,
            output_format: 'markdown',
          }),
        }
      );
      setState({ kind: 'ready', data: res });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Dossier generation failed',
      });
    }
  }, [childId, purpose, parentContext]);

  const printHref = (() => {
    if (state.kind !== 'ready') return undefined;
    const params = new URLSearchParams({
      child_id: childId,
      meeting_purpose: purpose.trim(),
      format: 'html',
    });
    if (parentContext.trim()) params.set('parent_context', parentContext.trim());
    return `/api/montree/admin/dossier/parent-meeting?${params.toString()}`;
  })();

  return (
    <>
      <style jsx>{`
        .btn-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(52, 211, 153, 0.4);
          background: rgba(52, 211, 153, 0.12);
          color: #0d2818;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-pill:hover {
          background: rgba(52, 211, 153, 0.22);
        }
        .btn-block {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid #34d399;
          background: #ecfdf5;
          color: #0d2818;
          cursor: pointer;
          box-shadow: 0 1px 0 rgba(13, 40, 24, 0.04);
        }
        .btn-block:hover {
          background: #d1fae5;
        }
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 40, 24, 0.62);
          z-index: 100;
          overflow-y: auto;
          padding: 32px 16px;
        }
        .modal {
          max-width: 540px;
          margin: 8vh auto;
          background: #fafdfb;
          border-radius: 12px;
          padding: 24px 28px;
          box-shadow: 0 8px 32px rgba(13, 40, 24, 0.32);
        }
        .modal h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 21px;
          margin: 0 0 6px;
          color: #0d2818;
        }
        .modal p.sub {
          font-size: 14px;
          color: #4a5b51;
          margin: 0 0 18px;
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #1d6b48;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        textarea {
          width: 100%;
          font-family: 'Lora', Georgia, serif;
          font-size: 15px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(74, 91, 81, 0.3);
          background: #fff;
          resize: vertical;
          min-height: 70px;
          color: #0d2818;
          box-sizing: border-box;
        }
        textarea:focus {
          outline: none;
          border-color: #34d399;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18);
        }
        .field {
          margin-bottom: 16px;
        }
        .field-hint {
          font-size: 12px;
          color: #4a5b51;
          margin-top: 4px;
          font-style: italic;
        }
        .actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 18px;
        }
        .actions button {
          font-size: 14px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .actions .cancel {
          background: transparent;
          color: #4a5b51;
        }
        .actions .cancel:hover {
          color: #0d2818;
        }
        .actions .primary {
          background: #34d399;
          color: #0d2818;
          border-color: #34d399;
        }
        .actions .primary:hover {
          background: #1d6b48;
          color: #fff;
        }
        .actions .primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 24px 0 12px;
          color: #1d6b48;
          font-family: 'Lora', Georgia, serif;
        }
        .loading .spinner {
          display: inline-block;
          width: 22px;
          height: 22px;
          border: 3px solid rgba(52, 211, 153, 0.3);
          border-top-color: #34d399;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error {
          background: #fef2f2;
          color: #991b1b;
          border-left: 3px solid #ef4444;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 14px;
          border-radius: 0 4px 4px 0;
        }
      `}</style>

      {state.kind === 'idle' && (
        <button
          type="button"
          onClick={open}
          className={variant === 'block' ? 'btn-block' : 'btn-pill'}
          title="Use Tracy to prepare a dossier for a parent meeting"
        >
          <span aria-hidden="true">📋</span>
          <span>{label}</span>
        </button>
      )}

      {state.kind === 'modal' && (
        <div className="overlay" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Prepare for a meeting about {childName}</h2>
            <p className="sub">
              Tracy will pull every observation, Guru analysis, and pattern
              in {childName}&apos;s record and build a dossier you can read
              once and walk into the meeting prepared.
            </p>

            <div className="field">
              <label htmlFor="purpose">What is the meeting about?</label>
              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. concerns about the emerging sleep pattern"
                rows={2}
                autoFocus
              />
              <div className="field-hint">
                A short sentence is plenty. Tracy fills in the rest.
              </div>
            </div>

            <div className="field">
              <label htmlFor="parent_context">
                Anything I should know about the parent? (optional)
              </label>
              <textarea
                id="parent_context"
                value={parentContext}
                onChange={(e) => setParentContext(e.target.value)}
                placeholder="e.g. expectation-driven, will fight any 'special' framing"
                rows={3}
              />
              <div className="field-hint">
                Free-text wins on tone calibration. If you leave this blank,
                Tracy uses what Guru has inferred about the parent.
              </div>
            </div>

            <div className="actions">
              <button type="button" className="cancel" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={fire}
                disabled={!purpose.trim()}
              >
                Build my dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="overlay">
          <div className="modal">
            <div className="loading">
              <div className="spinner" />
              <p>
                Tracy is reading {childName}&apos;s record, pulling Guru&apos;s analyses, and writing the dossier. About a minute.
              </p>
            </div>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="overlay" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Something went wrong</h2>
            <div className="error">{state.message}</div>
            <div className="actions">
              <button type="button" className="cancel" onClick={close}>
                Close
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => setState({ kind: 'modal' })}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="overlay" onClick={close}>
          <div
            style={{ maxWidth: 820, margin: '4vh auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DossierRenderer
              markdown={state.data.payload}
              childName={state.data.child_name}
              subtitle={
                classroomName
                  ? `${classroomName} · prepared by Tracy`
                  : 'prepared by Tracy'
              }
              meta={{
                generated_at: state.data.generated_at,
                source_counts: state.data.source_counts,
                cache_active: state.data.cache_active,
                from_cache: state.data.from_cache,
              }}
              onClose={close}
              showPrintLink={true}
              printLinkHref={printHref}
            />
          </div>
        </div>
      )}
    </>
  );
}
