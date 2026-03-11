# Handoff: True Fire-and-Forget Smart Capture (Mar 11, 2026)

## Summary

Fixed Smart Capture (Photo Insight) so processing genuinely survives navigation between children. Previously, switching to another child while a photo was being analyzed would abort the request (AbortController cleanup on unmount) and show an error. Now the analysis runs in a global background store completely decoupled from React component lifecycle.

## Problem

When teacher taps Smart Capture on Amy's photo then switches to another child:
- Old behavior: Component unmounts → AbortController aborts fetch → `mountedRef.current = false` discards response → shows error
- New behavior: Fetch runs in global store → results cached → when teacher returns to Amy, result is displayed instantly

## Architecture

**New file: `lib/montree/photo-insight-store.ts` (~220 lines)**
- Module-level singleton `Map<string, InsightEntry>` — survives React re-renders + navigation
- Listener pattern compatible with React 18's `useSyncExternalStore`
- Version counter ensures new Map reference on each mutation (fixes `Object.is` comparison in useSyncExternalStore)
- 60s client-side timeout prevents stuck "analyzing..." state
- Auto-eviction of entries older than 30 minutes (called on each new analysis)
- Public API: `startAnalysis()`, `subscribe()`, `getSnapshot()`, `resetEntry()`, `clearAll()`, `evictStale()`

**Rewritten: `components/montree/guru/PhotoInsightButton.tsx` (~315 lines)**
- No longer manages its own fetch or AbortController
- Reads from global store via `useSyncExternalStore(subscribe, getSnapshot, getSnapshot)`
- `onProgressUpdate` fires exactly once per result via `useRef` tracking (prevents infinite re-render loops)
- CTA handlers (Add to Classroom, Add to Shelf, Teach Guru) remain as local state — they're user-initiated and don't need background persistence
- All scenario logic (A/B/C/D) and UI unchanged

## 3x3 Audit Results

**Cycle 1 — 5 issues found, all fixed:**
1. CRITICAL: `useSyncExternalStore` snapshot identity — same Map reference never triggered re-render → Added version counter + new Map on each mutation
2. HIGH: `queueMicrotask(onProgressUpdate)` fired on every re-render → Replaced with useRef tracking + useEffect
3. HIGH: Unused `getEntry` import → Removed
4. MEDIUM: No timeout on background fetch → Added 60s timeout
5. MEDIUM: Entries accumulate forever → Added auto-eviction via `evictStale()` on each new analysis

**Cycle 2 — 0 issues (CLEAN)**
**Cycle 3 — 0 issues (CLEAN)** — Integration with progress page verified

## Files Changed

| File | Change |
|------|--------|
| `lib/montree/photo-insight-store.ts` | **NEW** — Global background store |
| `components/montree/guru/PhotoInsightButton.tsx` | **REWRITTEN** — Uses store instead of own fetch |

## Also This Session

- **Voice Notes Fix:** `OPENAI_API_KEY` was missing from Railway env vars → added new key + $10 credits → voice notes now working
- **OpenAI Billing:** Account was on pay-as-you-go with $0 balance → added $10 credit

## Deploy

Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add lib/montree/photo-insight-store.ts components/montree/guru/PhotoInsightButton.tsx && git commit -m "feat: true fire-and-forget Smart Capture — processing survives navigation" && git push origin main
```

No new migrations needed. No new i18n keys.
