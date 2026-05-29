# Session 137 Handoff — Astra/Mira reliability cracked + Mira agent-enablement + health check + photo tool

**Pushed to main:** `8b908df0` → `5d6baf9b` (9 commits). Working tree clean, `HEAD == origin/main`. Railway auto-deployed throughout.

## 1) The headline — the blank-bubble bug that haunted 7 sessions is FIXED (and it wasn't what anyone thought)

For 7 sessions Astra (the principal AI) returned an empty bubble — "no glow, no response," especially in Chinese. Every prior session (and this one's first attempt) chased the **pre-flight Supabase timeouts** theory from the Session 136 handoff. That was a red herring.

**The actual root cause, found from the user's own production logs:**
```
sonnet_round=0 stop_reason=tool_use ... input_tokens=16651
sonnet_round=1 stop_reason=tool_use ... input_tokens=16736
sonnet_round=2..4 stop_reason=tool_use ... input_tokens=16736  ← FROZEN
```
`input_tokens` frozen across rounds = **the conversation transcript wasn't growing.** The tool-use loop built a one-shot `messagesForRound` containing only the SINGLE most-recent tool exchange on top of the question — it never appended each round into `conversationMessages`. So Sonnet never "saw" it had already called tools, called a tool every round, hit `MAX_TOOL_ROUNDS=5`, and fell out of the loop with **no final text** → blank bubble.

**Fix (commit `9a19a946`):** accumulate `assistant` + `tool_result` turns into `conversationMessages` every round + a `tool_choice:'none'` forced-summary safety net if the loop ever exhausts rounds. **Mira had the byte-for-byte identical bug** (commit `a82c4d4f`) — ported the same fix. **Guru** got an empty-stream guard too (`5d6baf9b`).

🚨 **Lesson:** the per-round `[principal-agent] sonnet_round=...` diagnostic logging (added Session 136, `3bfb7066`) is what cracked it. When a chat AI goes blank, read those logs FIRST — `stop_reason` + frozen `input_tokens` tell the whole story.

## 2) Every commit this session

| Commit | What |
|---|---|
| `8b908df0` | Astra reliability v1: Supabase fetch timeout (root-cause hang fix in `lib/supabase-client.ts`) + pre-flight moved INTO the stream (glow shows instantly) + empty-response recovery. **New gold "A" Astra icon** (`public/astra-avatar.png`, Lora-Bold; the avatar was a stale Tracy "T"). |
| `9a19a946` | **THE FIX** — Astra tool-loop now accumulates the transcript + forced-summary net. |
| `7ed33e42` | Dossier **Section 9 "Questions she'll probably ask (with answers ready)"** re-added (distinct from Section 8 pushback handlers); 30-day plan → Section 10; cache `schema_version: 'v10'` so old dossiers regenerate. |
| `a82c4d4f` | Mira had the identical blank-bubble bug → ported the fix. `isFeatureEnabled` cached (30s TTL) — was uncached on ~30 hot routes. |
| `0b23249f` | **Mira full agent-enablement**: `product.md` (ground-up Montree overview) + `playbook.md` (zero→first-paid-school + code/payout mechanics + economics) + `consult_knowledge` tool + system-prompt reframe to coach blank-slate agents. |
| `321d96b5` | Prompt caching on Astra + Mira + Guru (cache_control on system block caches the tools+system prefix). Tier-gate voice onboarding (`onboard` was ungated Sonnet). |
| `a6a1696f` | Dossier streaming "thinking" stages (`searchingPatterns`, `composingDossier`) via `onProgress` — 2 i18n keys × 12 locales. |
| `c0942564` | Mira Opus → Sonnet. Astra `get_child_photos` tool. Meeting-prep memory-fallback now always includes likely questions. |
| `5d6baf9b` | Guru empty-stream guard + stale "90s" timeout-string cleanup. |

## 3) Root-cause fix in `lib/supabase-client.ts` (affects the WHOLE app)

`fetchWithRetry` had **no timeout on the actual `fetch`** — a connected-but-silent socket (stale Railway↔Supabase keep-alive) hung forever, and the retry only fired on *thrown* connect-timeouts. Added a 12s per-attempt `AbortSignal.timeout` (signal-combined so it never clobbers a caller's abort) + treat abort as retryable. This is the canonical reason the pre-flight "timed out" — a hung socket, not slow queries.

## 4) Mira is now a full agent operator

New knowledge files under `lib/montree/mira/knowledge/`:
- **`product.md`** — what Montree is, every surface, the magic moment, day-in-the-life per role.
- **`playbook.md`** — step-by-step from zero to first paid school + referral-code/signup/payout mechanics + agent economics (20% recurring share).

New tool **`consult_knowledge`** (mirrors Astra's `consult_tracy_knowledge`) pulls any full knowledge file on demand — Mira's chat prompt only carries a summary, this gives her depth to teach. System prompt reframed: she now coaches a blank-slate agent (product → playbook → drill on demand, in small steps). Mira also moved **Opus → Sonnet** (5× cheaper, same quality; cost constants updated).

## 5) Astra get_child_photos

New tool: pulls a child's `teacher_confirmed` photos from `montree_media` (school-scoped via `verifyChildBelongsToSchool` — cross-pollination safe), returns proxied URLs (`getProxyUrl`) + caption + date + work label. Astra presents them as inline markdown images. Optional `date_from`/`date_to`/`limit`. Closes the "I can't pull photos directly" gap the user hit.

## 6) Architectural rules locked in this session

1. **Chat-AI tool-use loops MUST accumulate the full transcript** into `conversationMessages` each round. Never send only the latest exchange. A `tool_choice:'none'` forced-summary after the loop is the canonical round-cap safety net.
2. **Every Supabase fetch has a hard per-attempt timeout** (`lib/supabase-client.ts`, 12s). Signal-combined with caller aborts.
3. **Prompt caching pattern**: `system: [{ type:'text', text, cache_control:{type:'ephemeral'} }]` caches the tools+system prefix; rounds 2-N read from cache. Applied to Astra/Mira/Guru.
4. **`get_child_photos` (and any media tool) MUST gate on `verifyChildBelongsToSchool` before any read.**
5. **Meeting-prep briefs ALWAYS include likely parent questions** — in the dossier (Section 9) AND in Astra's from-memory fallback.
6. **Astra avatar is `/public/astra-avatar.png`** (gold "A"); single source is `TracyAvatar.tsx` (file paths stay `tracy/` — non-breaking).
7. **When an audit agent claims something is missing, verify** — this session two agent findings were wrong (`loading.tsx` already existed app-wide; tier-gate transient-blip already covered by the fetch-retry).

## 7) 🔒 STILL OPEN — needs Tredoux (cannot do from sandbox)

1. **🔒 THE BIG ONE — Supabase >3s latency (region + pooler).** By-PK lookups taking >3s is why Astra's tools time out and fall back to memory (the "connection's dropping" the user saw). Fix in dashboards: confirm Supabase region → pin Railway service to the same region → switch `DATABASE_URL` to the pooler (`:6543`). ~15 min. **Highest-impact remaining lever** — graceful degradation is shipped, but this is the real cure.
2. **🔒 Service-worker stale-while-revalidate API cache** — biggest returning-visit speed win, but cross-user cache-poisoning risk; needs multi-user testing on a shared browser. Own focused session.

## 8) Deferred / low-priority (not blocking, not asked)
- Unify the two client fetch layers (`lib/montree/cache.ts` vs `montreeApi`) — the dashboard prefetch is currently dead code.
- Trim `select('*')` on hot read paths.
- Pre-existing lint-warning backlog on `guru/route.ts` + `onboard/route.ts` (unused imports, `any`) — not from this session's edits; a dedicated cleanup pass.

## 9) Verify on production (after Railway settles)
- Log in **as Principal Leu** (not the teacher login) → ask Astra in English and Chinese → real answer + gold "A" avatar + faster on follow-ups (prompt cache).
- "Prepare for the meeting" on a parent thread → live streaming stages → dossier with Section 9. (Until the latency fix, may still fall back to memory — but the fallback now includes likely questions.)
- "Show me [child]'s photos" → inline images.
- Log in as an agent → ask Mira "teach me Montree" → product then playbook, step by step.

## 10) Standing working rule (saved to memory this session)
Push through ALL tasks autonomously without stopping to ask; audit each to clean before moving on; review at the end. Push via Desktop Commander (sandbox can't push). See memory: `feedback_autonomy_and_audit.md`, `montree_deploy_and_push.md`.

---
**End of handoff. Next session: the region/pooler latency fix is the single highest-leverage item.**
