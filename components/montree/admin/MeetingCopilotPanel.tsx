'use client';

// components/montree/admin/MeetingCopilotPanel.tsx
//
// The LIVE meeting co-pilot surface. During a parent conversation it
// transcribes on-device (Web Speech API — no audio leaves the browser),
// and every few seconds sends the rolling text to the copilot endpoint,
// which returns Astra's pre-drafted next-best response. Suggestion-only —
// the principal always decides and speaks.
//
// Renders null when the `live_copilot` flag is off (the endpoint replies
// { enabled:false }). Copy is English for the preview; i18n is a follow-up.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';

interface Suggestion {
  next_response: string;
  talking_points: string[];
  watch_out: string;
  tone: string;
}

// Minimal Web Speech API typings (not in the DOM lib by default).
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  0: SRAlternative;
  isFinal: boolean;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognitionLike;

export interface MeetingCopilotPanelProps {
  meetingId: string;
  locale?: string;
}

export default function MeetingCopilotPanel({
  meetingId,
  locale,
}: MeetingCopilotPanelProps) {
  const [active, setActive] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSuggestion = useCallback(async () => {
    const text = transcriptRef.current.trim();
    if (text.length < 20) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `/api/montree/admin/parent-meetings/${meetingId}/copilot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript_window: text.slice(-6000) }),
        }
      );
      const data = (await resp.json()) as {
        enabled?: boolean;
        suggestion?: Suggestion;
      };
      if (data.enabled === false) {
        setDisabled(true);
        return;
      }
      if (data.suggestion) setSuggestion(data.suggestion);
    } catch {
      /* transient — keep listening */
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const stop = useCallback(() => {
    setActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    const w = window as unknown as {
      SpeechRecognition?: SRCtor;
      webkitSpeechRecognition?: SRCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError(
        'Live transcription needs Chrome. You can still use the meeting recorder.'
      );
      return;
    }
    const rec = new Ctor();
    rec.lang = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) chunk += r[0].transcript + ' ';
      }
      if (chunk) transcriptRef.current += chunk;
    };
    rec.onerror = () => {
      /* ignore transient recognition errors; onend will restart */
    };
    rec.onend = () => {
      // Auto-restart while the session is still active (recognition stops on pauses).
      if (recRef.current) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
    setActive(true);
    timerRef.current = setInterval(() => {
      void fetchSuggestion();
    }, 6000);
  }, [locale, fetchSuggestion]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  if (disabled) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Lightbulb className="h-4 w-4" />
          Astra co-pilot
        </div>
        <button
          type="button"
          onClick={() => (active ? stop() : start())}
          className={[
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition',
            active ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600',
          ].join(' ')}
        >
          {active ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {active ? 'Stop listening' : 'Start co-pilot'}
        </button>
      </div>

      {active ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Listening on-device — suggestions appear below. Nothing is recorded.
        </p>
      ) : (
        <p className="mt-2 text-xs text-stone-500">
          Start the co-pilot during a conversation and Astra will pre-draft what to say next.
        </p>
      )}

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      {suggestion ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Say next
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                {suggestion.tone}
              </span>
              {loading ? <Loader2 className="h-3 w-3 animate-spin text-stone-400" /> : null}
            </div>
            <p className="text-sm leading-relaxed text-stone-800">
              {suggestion.next_response}
            </p>
          </div>

          {suggestion.talking_points.length > 0 ? (
            <ul className="space-y-1">
              {suggestion.talking_points.map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-stone-600">
                  <span className="text-amber-500">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {suggestion.watch_out ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{suggestion.watch_out}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
