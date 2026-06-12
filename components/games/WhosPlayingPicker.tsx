// components/games/WhosPlayingPicker.tsx
// "Who's playing?" child picker for the games hub (Jun 12, 2026).
//
// 8 of the learning games attach progress to a child by reading localStorage
// (phonics-challenge doesn't read these keys):
//   - 'current_student_id'  → plain child UUID (match-attack-new, read-and-reveal,
//     word-builder-new, sentence-scramble, sound-safari completion saves)
//   - 'studentSession'      → JSON { childId } (LetterTraceGame /
//     CapitalLetterTraceGame / NumberTraceGame session protocol)
// Until now NOTHING in the UI ever set those keys, so /api/games/progress rows
// landed with child_id NULL. This picker closes that gap: the teacher taps a
// child on the hub before handing over the device, and every game launched
// afterwards attaches progress to that child.
//
// Children come from the existing teacher-authenticated /api/montree/children
// endpoint (school-scoped via the montree-auth cookie) — no new API surface.
// If there's no teacher session or no children, the picker renders nothing.

'use client';

import { useState } from 'react';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { useMontreeData } from '@/lib/montree/cache';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

const STUDENT_ID_KEY = 'current_student_id';
const STUDENT_SESSION_KEY = 'studentSession';

interface PickerChild {
  id: string;
  name: string;
  photo_url?: string | null;
}

function readSelectedId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STUDENT_ID_KEY);
  } catch {
    return null;
  }
}

function ChildAvatar({ child, size }: { child: PickerChild; size: string }) {
  const [showFallback, setShowFallback] = useState(false);
  return (
    <div className={`${size} rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {!showFallback && child.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getProxyUrl(child.photo_url)}
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
          onError={() => setShowFallback(true)}
        />
      ) : (
        <span className="text-emerald-300 text-xs font-bold">
          {child.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function WhosPlayingPicker() {
  // Lazy initializers (same pattern as /montree/dashboard/page.tsx) — SSR
  // renders null, the first client render picks up localStorage.
  const [session] = useState<MontreeSession | null>(() => {
    if (typeof window === 'undefined') return null;
    return getSession();
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => readSelectedId());
  const [expanded, setExpanded] = useState(false);

  // Same SWR-cached children fetch the dashboard uses — instant on revisit.
  const childrenUrl = session
    ? `/api/montree/children${session.classroom?.id ? `?classroom_id=${session.classroom.id}` : ''}`
    : null;
  const { data } = useMontreeData<{ children: PickerChild[] }>(childrenUrl);
  const children = data?.children || [];

  // No teacher session (or nobody enrolled yet) → hide gracefully.
  if (!session || children.length === 0) return null;

  const selectedChild = children.find((c) => c.id === selectedId) || null;

  const selectChild = (child: PickerChild) => {
    try {
      localStorage.setItem(STUDENT_ID_KEY, child.id);
      localStorage.setItem(
        STUDENT_SESSION_KEY,
        JSON.stringify({ childId: child.id, childName: child.name, selectedAt: new Date().toISOString() })
      );
    } catch {
      // localStorage unavailable (private mode quota etc.) — games just won't attach
    }
    setSelectedId(child.id);
    setExpanded(false);
  };

  const clearChild = () => {
    try {
      localStorage.removeItem(STUDENT_ID_KEY);
      localStorage.removeItem(STUDENT_SESSION_KEY);
    } catch {
      // ignore
    }
    setSelectedId(null);
  };

  return (
    <div className="max-w-4xl mx-auto mb-4 bg-slate-800 rounded-xl border border-slate-700 p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🙋</span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm">Who&apos;s playing?</div>
          {selectedChild ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <ChildAvatar child={selectedChild} size="w-4 h-4" />
              <span className="text-emerald-400 text-xs font-medium truncate">{selectedChild.name}</span>
            </div>
          ) : (
            <p className="text-slate-400 text-xs mt-0.5">Pick a child so their game progress is saved</p>
          )}
        </div>
        {selectedChild && (
          <button
            onClick={clearChild}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all"
        >
          {expanded ? 'Close' : selectedChild ? 'Switch' : 'Choose'}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
          {children.map((child) => {
            const isSelected = child.id === selectedId;
            return (
              <button
                key={child.id}
                onClick={() => selectChild(child)}
                className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ChildAvatar child={child} size="w-6 h-6" />
                <span className="truncate max-w-[10rem]">{child.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
