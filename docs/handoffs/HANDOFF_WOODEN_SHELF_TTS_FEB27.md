# Handoff: Wooden Shelf UI + OpenAI TTS Voice (Feb 27, 2026)

## Summary

Two enhancements to the Home Parent experience (Portal + Shelf interface):

1. **Wooden Shelf UI** — ShelfView rewritten from flat card grid to realistic wooden shelf planks with 3D material icons
2. **OpenAI TTS Voice** — Guru messages can be read aloud via OpenAI's Text-to-Speech API with a "Listen" button on each message

## Files Created (1 new)

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/montree/tts/route.ts` | 99 | OpenAI TTS endpoint — POST text → strip markdown → call `tts-1` with `nova` voice → stream MP3 back. Rate limited 10/min/IP via `checkRateLimit()` |

## Files Modified (3)

| File | Changes |
|------|---------|
| `components/montree/home/ShelfView.tsx` | **Full rewrite** — 5 wooden planks (CSS gradient + grain), 3D material icons with `perspective()` transforms, area-colored tabs, progress bars, mastered sparkle, empty slot CTAs |
| `components/montree/home/PortalChat.tsx` | Added `useTTS()` hook (AbortController for safe unmount, play/stop toggle, loading state) + 🔈 Listen button on every Guru message bubble |
| `lib/montree/bioluminescent-theme.ts` | Added `BIO.shelf` (wood colors: plank gradient, edge gradient, shadow, grain overlay) + `BIO.workIcon` (60+ Montessori work → emoji mappings across all 5 areas) |

## Architecture

### Wooden Shelf

The shelf shows 5 horizontal wooden planks, one per Montessori area. Each plank has:
- A colored area tab on the left
- A 3D-ish material icon (emoji with `perspective(200px) rotateY(-3deg) rotateX(2deg)` CSS transform)
- Work name, area label, and a thin progress bar
- Status glow (amber for presented, jade for practicing, mint + sparkle ⭐ for mastered)
- A chevron indicating tappability

Icon resolution: exact match in `BIO.workIcon` → partial match (case-insensitive) → fallback to `BIO.areaIcon`.

Same props interface (`ShelfViewProps`) — drop-in replacement. Same API (`/api/montree/shelf`). Same WorkDetailSheet on tap.

### TTS Voice

**API Route (`/api/montree/tts`):**
- Auth: `verifySchoolRequest()` (school JWT cookie)
- Rate limit: `checkRateLimit()` — 10 requests per minute per IP
- Markdown stripping: removes `#`, `**`, `*`, backticks, `[links](url)`, bullets, numbered lists
- OpenAI call: `tts-1` model, `nova` voice, `mp3` format
- Response: raw MP3 audio buffer with `Content-Type: audio/mpeg`
- Cost: ~$0.015 per 1,000 characters

**Client Hook (`useTTS`):**
- `play(messageId, text)` — fetches TTS audio, creates `Audio()` object, plays
- `stop()` — aborts pending fetch + pauses audio + cleans up blob URL
- `AbortController` cancels in-flight requests on stop or unmount
- State: `playingId` (which message is playing), `loadingId` (which is generating)
- Cleanup: `useEffect` return calls `stop()` on unmount (prevents setState on unmounted component)

**UI:** Small 🔈 "Listen" button below each Guru message (>10 chars). Shows ⏳ "Generating..." while loading, 🔊 "Playing" while audio plays. Tap again to stop.

## Audit Results (4 issues found, all fixed)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | HIGH | `group-hover:scale-105` Tailwind class overrides inline `transform: perspective()` — 3D effect lost on hover | Removed conflicting class |
| 2 | HIGH | TTS fetch no AbortController — setState on unmounted component | Added `abortRef` with cancellation in `stop()` and `signal.aborted` checks |
| 3 | MEDIUM | No rate limiting on TTS — cost exposure | Added `checkRateLimit()` at 10/min/IP |
| 4 | LOW | `emptyAreas` state declared but never read | Removed dead state |

## Testing Checklist

- [ ] Open `/montree/home/[childId]` as a homeschool parent
- [ ] Tap SHELF tab → see 5 wooden planks with area labels
- [ ] If works assigned: see 3D icons with progress bars and status glows
- [ ] Tap a work → WorkDetailSheet opens with full guidance
- [ ] Tap an empty slot → switches to Portal with prefilled suggestion request
- [ ] In Portal, send a message → Guru responds
- [ ] Tap 🔈 "Listen" on a Guru message → see ⏳ "Generating..." → hear audio play → see 🔊 "Playing"
- [ ] Tap 🔊 while playing → audio stops
- [ ] Switch from Portal to Shelf while audio loading → no console errors (AbortController handles cleanup)
- [ ] Spam Listen button rapidly → rate limit kicks in after 10 requests/minute

## Dependencies

- `OPENAI_API_KEY` must be set (already is — used for Whisper transcription)
- `montree_rate_limit_logs` table must exist (already does — migration 122)
- No new npm packages needed

## Cost Estimate

OpenAI TTS `tts-1`: $0.015 per 1,000 characters. A typical Guru response is ~500-1000 chars → ~$0.008-0.015 per listen. With rate limiting at 10/min, max theoretical cost per user is ~$0.15/minute of continuous spam (unlikely usage pattern). Normal usage: a few listens per session → negligible cost.
