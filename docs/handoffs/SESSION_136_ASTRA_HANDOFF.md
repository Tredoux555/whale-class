# Session 136 Handoff — Astra rename + production bug hunt + multiple Tracy fixes

**Pushed to main:** Commits `9a7a2e4f` through `01557295` (the rename), with `3bfb7066` as the latest unverified state.

## 1) The headline

**Tracy is now Astra.** 1636 user-visible occurrences renamed across 184 files via word-boundary regex (`\bTracy\b`). File paths, TypeScript identifiers, and i18n key names all kept their original `tracy` spelling to keep the rename non-breaking. System prompts, UI strings, comments, docs, and the CLAUDE.md brain all now say Astra.

## 2) Production status — UNVERIFIED

Last user report (before the Astra rename pushed):

> "still no response when asked in Chinese — no glow, no response whatsoever"

Railway production logs at that point showed the same pattern on every Astra POST:

```
POST /api/montree/admin/principal-agent
[principal-agent] pre-flight timeout (school+principal name lookup, 5000ms) — using fallback
[principal-agent] pre-flight timeout (loadActiveMemories, 8000ms) — using fallback
[principal-agent] pre-flight timeout (getTracyKnowledgeSummary, 8000ms) — using fallback
(SILENCE for 30-60s)
(next user retry)
```

All three pre-flight Supabase calls timing out. Then nothing. No `[prepare_parent_meeting]` log. No `error` log. No `done` log.

Independent audit + multi-angle investigation concluded the leading theory:

> Sonnet receives a degraded prompt (no school name, no memories, no knowledge bundle) and returns `stop_reason=end_turn` with **zero text blocks and zero tool_use blocks**. The route's tool-use loop sees `!hasToolUse` and `!roundText`, breaks silently, emits `done`. The client receives `done`, sets `pending=false`, and renders an empty assistant bubble.

## 3) What's shipped on production right now (commit `01557295`)

| Commit | What |
|---|---|
| `457dbd2a` | Pre-flight Supabase timeouts (5s + 8s + 8s) + early `:keepalive` SSE comment |
| `586850ac` | Smart auto-scroll (only scrolls to bottom if within 80px) + `border-radius: 50%` on .tracy-pulse |
| `b50911a1` | Halo rewrite — `::before` pseudo-element with radial-gradient + 18px wrapper padding so halo can't be clipped |
| `5d733710` | Audit fixes — dot alignment via `alignItems: center` + tamed `withTimeout` to swallow late rejections |
| `7ec59bd3` | **REVERTED** — broke Astra entirely (3 empty responses in a row). Don't re-apply without isolation testing. |
| `57bbbfa3` | Revert of `7ec59bd3` |
| `3bfb7066` | **Empty-response detection + Sonnet round logging.** Logs `stop_reason`, block types, token counts on every Sonnet round. Sends a user-visible error event (`"I had trouble loading your school's context just now. Please try again — it usually clears on the second attempt."`) when the loop would otherwise close silently. |
| `01557295` | Tracy → Astra rename (display-only, non-breaking) |

## 4) The 21-second pre-flight problem (UNRESOLVED root cause)

On Whale Class, every Astra POST triggers three Supabase queries that ALL time out:

1. `school+principal name lookup` (5s ceiling) → uses default `'your school'` / `'Principal'`
2. `loadActiveMemories` (8s ceiling) → uses empty memory array
3. `getTracyKnowledgeSummary` (8s ceiling) → uses empty knowledge bundle

These are simple by-PK lookups. They should be sub-100ms. The audit suggested:

- Railway↔Supabase region mismatch (Railway probably US, Supabase EU)
- Cold container hibernation forcing TCP/TLS handshakes on first calls
- Connection pool starvation (less likely — Supabase JS uses PostgREST/HTTP, no per-process pool)

**Mitigation attempts shipped:**
- Timeouts let Astra fall back gracefully instead of hanging forever
- Tamed `withTimeout` so late rejections don't crash the route
- `:keepalive` SSE first-byte so the client sees the connection alive

**What hasn't been tried:**
- Moving pre-flight INTO the stream's `start()` callback — so the response body starts streaming with `:keepalive` immediately on POST, then pre-flight runs while the client already has the connection. Currently pre-flight blocks the `return new Response(stream)` line, so the response headers don't go out until after 21s.
- Investigating Railway region pinning (Singapore/HK is closer to Supabase EU than US-East).
- Database-side: checking that `montree_school_admins.id` lookup actually uses the PK index. Same for `montree_principal_memory.principal_id` (migration 195's partial index).

## 5) What changed in 7ec59bd3 (the REVERTED commit)

These three changes ALL went out in one commit and ALL got reverted together. Each individually deserves another attempt:

**A. Streaming progress events for `prepare_parent_meeting`.** The infrastructure (SSE `tool_progress` events) existed, but only `child_focus` was emitting them. The dossier tool ran silent for 60-90s with just the 3-dot indicator. Added `onProgress` callback wiring + 4 stages (`preparingDossier`, `fetchingObservations`, `searchingPatterns`, `composingDossier`). 4 new i18n keys (en + zh real translations, 10 fallback English).

**B. New Section 9 in dossier prompt.** "Questions she'll probably ask (suggested answers)" — 4-6 example Q+A pairs in the principal's voice. Section 8 (pushback handlers) and new Section 9 (Q+A) are distinct: section 8 is "they push back on what I said", section 9 is "they ask me something I have to answer cleanly". Old Section 9 (30-day plan) renumbered to 10.

**C. Chinese-output anchor.** Sonnet was biasing toward English (from the English worked Yo-yo example in system prompt) on Chinese requests. Added a parallel language directive at the TOP of the user prompt (`🌐 OUTPUT LANGUAGE REQUIREMENT`) so Sonnet sees the target language signal both BEFORE and AFTER the English example. Plus a schema_version bump in cache extras to invalidate old 9-section cached dossiers.

**Why I reverted:** Combined diagnosis was impossible — user reported empty responses after `7ec59bd3` deployed. Couldn't tell which of A/B/C broke it. Reverted all three together for safety.

**Recommended re-introduction order:** A → verify → B → verify → C → verify. Each in its own commit, each tested with a single Astra question before the next one ships.

## 6) Open questions for the next session

1. **Is Astra responding NOW?** After `3bfb7066`, the user should see a clear red error ("I had trouble loading your school's context just now") instead of an empty bubble. Verify before doing anything else.
2. **Why are Whale Class Supabase calls so slow?** Pull Supabase logs for the principal's row. Check the query plan. Check Railway region.
3. **Move pre-flight INTO the stream's start()?** The simplest UX fix — the response headers can flow immediately, the client sees connection life, then pre-flight runs while the spinner is showing.
4. **Re-introduce the three 7ec59bd3 changes** one at a time, with verification between each.
5. **Tighten pre-flight timeouts?** Current 5+8+8 = 21s. Cutting to 2+3+3 = 8s makes Astra degrade-to-fallbacks faster. Trade-off: more frequent empty-context turns on slow days.

## 7) Files to start with next session

- `app/api/montree/admin/principal-agent/route.ts` — the route. Pre-flight starts at line 299. Stream + Sonnet loop at line 456+.
- `lib/montree/tracy/tools/prepare_parent_meeting.ts` — the dossier tool. Add the `onProgress` wiring back here when re-introducing 7ec59bd3 (A).
- `lib/montree/tracy/prompts/parent_meeting_prep.ts` — system prompt. Add Section 9 (Q+A) back here when re-introducing 7ec59bd3 (B).
- `components/montree/admin/ThinkingIndicator.tsx` — halo + dots. Current state at `b50911a1` + `5d733710` should be uncut + center-aligned. Verify visually next session.

## 8) The rename — what to verify visually

After Railway deploys `01557295`:

- Astra's greeting on `/montree/admin` says "Hi, Tredoux. How can I help you?" with "Astra" as the avatar name (it's a `T` monogram visually but the alt/aria says Astra).
- The TracyFloat trigger (top-right on cockpit pages) and panel header say "Astra".
- The principal-agent route's logs in Railway prefix with `[principal-agent]` (unchanged — that's a path identifier, not the display name).
- System prompt sees "You are Astra, the principal's chief of staff..."
- Sonnet's first-person responses introduce as Astra.
- The MiraFloat in the agent dashboard (separate AI for agents) is untouched and still says Mira.

The file paths in `lib/montree/tracy/` are unchanged. Don't be confused — the folder name is `tracy/` but Astra is the display name. Future cleanup could rename to `lib/montree/astra/`.

---

**End of handoff. Next session: verify production, fix what's broken, then resume product work.**
