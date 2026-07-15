# PLAN — DIARY RECALL (recall_history) — Jul 15, 2026 — BINDING CONTRACT

> **✅ BUILT + AUDITED same day (sacred flow: Fable contract → 2 parallel Opus builds → 2
> independent Sonnet fresh-eyes audits, both FIXED-NOW-SHIP).** Both auditors independently
> caught the same real hole — the search RPC was granted to anon/authenticated while taking a
> caller-supplied p_space with no session check (guessable space slugs ⇒ public diary-metadata
> probe). Fixed in both repos: **service_role ONLY — never widen this grant.**
> Change surface — montree: migrations 295+295b, lib/story/coach/{log-embeddings,history-search}.ts,
> tool-definitions/tool-executor/system-prompt, app/api/story/coach/route.ts (archive insert moved
> into after() + write-time embed), app/api/story/admin/embed-coach-log/route.ts. lyfcoach-web:
> same pattern, SQL appended to 0001_init.sql, backfill at app/api/admin/embed-coach-log.
> tsc/eslint clean both repos (lyfcoach full tsc exit 0; montree scoped, 1 pre-existing
> libsodium-types error only). next build unverified in-sandbox (fuse EPERM) — run locally.
> ⏳ OWED: Tredoux runs both SQL blocks (two DIFFERENT Supabase projects), commits+pushes both
> repos (Desktop Commander for montree), runs the backfills until remaining=0, live-tests recall.

Fable-authored contract. Applies to BOTH repos:
- **montree** (legacy personal coach serving montree.xyz — `lib/story/coach/*`, `app/api/story/coach/route.ts`)
- **lyfcoach-web** (standalone public product — `lib/story/coach/*`, `app/api/coach/route.ts`)

## §0 Tredoux's rulings (locked — do not relitigate)
1. Verbatim permanent diary of every chat. **Already true** — `story_coach_log` stores every turn encrypted, never pruned. Builders change NOTHING about retention or consolidation write logic.
2. The consolidated summary (`story_coach_memory`) stays the working brain. Untouched.
3. Recall = tiered: **7 days → 30 days → long-term** (never read the whole log). Semantic (embeddings) + keyword hybrid.
4. Both repos in one session.

## §1 Ground truth (from Sonnet scouts — trust these paths)
- `story_coach_log` row = ONE TURN: `question_enc`, `answer_enc` (AES-256-GCM via `lib/story/diary-crypto.ts`), `space`, `conversation_id`, `tools_used`, `cipher_version`, `consolidated_at`, `created_at`. No role/content columns.
- Insert site: montree `app/api/story/coach/route.ts:630-646`; lyfcoach `app/api/coach/route.ts:714-726`. Fire-and-forget, gated `!isE2e && isDiaryEncryptionConfigured()`.
- Current window: `loadRecentThread` — 12 turns / 72h / unconsolidated only. Nothing reads older rows except consolidation.
- Tool pattern: `tool-definitions.ts` (`COACH_TOOLS` + child subset) → `tool-executor.ts` switch with `deps: { supabase, space, role, tz, isE2e }` → result JSON capped `MAX_TOOL_RESULT_CHARS`.
- Space scoping is the ONLY tenant boundary (service role bypasses RLS). `.eq('space', space)` on every query, `space` from verified JWT only.
- Embedding precedent (montree only): `lib/montree/tracy/corpus/embeddings.ts` — `text-embedding-3-small`, 1536 dims, raw fetch, 15s abort, batch concurrency 5; RPC pattern `tracy_corpus_search` (242b), HNSW `vector_cosine_ops`.
- lyfcoach-web has NO pgvector yet; has `OPENAI_API_KEY` (whisper). Schema convention: append idempotent SQL to `supabase/migrations/0001_init.sql` AND paste live SQL in chat.
- montree next migration number: **295** (RPC in **295b** per 242/242b precedent).

## §2 The build (identical pattern, per-repo installs)

### A. Schema
- `ALTER TABLE story_coach_log ADD COLUMN IF NOT EXISTS embedding vector(1536);`
- Partial HNSW index: `USING hnsw (embedding vector_cosine_ops)` (log grows unbounded over years — tracy precedent). Guard with `CREATE INDEX IF NOT EXISTS`.
- RPC `story_coach_log_search(p_space text, p_query_embedding vector(1536), p_from timestamptz, p_to timestamptz, p_min_similarity numeric DEFAULT 0.35, p_limit int DEFAULT 8)` → returns `id, conversation_id, created_at, similarity` ONLY. **The RPC never returns or decrypts content** — the app fetches rows by id and decrypts in JS. SECURITY DEFINER, search_path pinned, EXECUTE granted per house style, filters `space = p_space AND embedding IS NOT NULL AND created_at BETWEEN p_from AND p_to`.
- lyfcoach additionally: `CREATE EXTENSION IF NOT EXISTS vector;`
- montree: files `migrations/295_coach_log_embedding.sql` + `295b_coach_log_search_fn.sql`. lyfcoach: append to `0001_init.sql`.

### B. Write-time embedding (new turns)
- New module `lib/story/coach/log-embeddings.ts` (both repos): `embedText(text)` — raw fetch to OpenAI embeddings, `text-embedding-3-small`, input = `Q: <question>\nA: <answer>` truncated to 8000 chars, 15s abort, **fail-open** (any error → null, log a console.warn once).
- At the existing log-insert site: change the insert to `.select('id').single()` (still off the critical path / inside the same background context), then if embedding succeeds, `UPDATE story_coach_log SET embedding = ... WHERE id = ...`. Embed from the PLAINTEXT variables already in scope (`question`, `finalText`) — never decrypt server-side detours. If insert-id capture fails, skip embedding silently (row remains keyword-searchable).
- No `OPENAI_API_KEY` in env → skip embedding entirely, everything else unchanged.

### C. Backfill (historic rows)
- One admin route per repo that pages rows `WHERE embedding IS NULL AND question_enc LIKE 'gcm:%'` scoped optionally by space, decrypts, embeds (concurrency 5), updates. Batch ≤200 rows per invocation, returns `{processed, remaining}` so it can be re-invoked until done.
  - montree: `app/api/story/admin/embed-coach-log/route.ts`, gated by the existing story-admin auth (`getAdminSpace` role admin) — a caller may backfill ONLY their own space; plus an `x-cron-secret`/`ADMIN_SECRET` override for all-spaces.
  - lyfcoach: `app/api/admin/embed-coach-log/route.ts`, gated `ADMIN_DASHBOARD_KEY` (existing admin-auth helper).
- E2e rows (null/absent question_enc or e2e spaces) skipped.

### D. The tool — `recall_history`
Definition (both repos, added to `COACH_TOOLS` AND child subset — a child searching their OWN sealed room is fine):
```
name: recall_history
description: Search the user's complete verbatim conversation history (their
permanent diary — every past chat, even details that never made it into
memories). Use whenever the user references something from a past conversation
that you can't see — a dream, a name, a plan, "remember when I told you…".
NEVER tell the user you don't remember something without searching this first.
input: { query: string (required — what to look for, in natural language),
         date_from?: YYYY-MM-DD, date_to?: YYYY-MM-DD,
         search_older?: boolean (continue past the first year of keyword walk-back) }
```
Executor (`tool-executor.ts` case → new helper `searchCoachHistory()` in `lib/story/coach/history-search.ts`):
1. `isE2e` → `{ success:false, error: 'History is device-encrypted; server search unavailable.' }`
2. Explicit date range given → search that window only (semantic + keyword), skip tiering.
3. Otherwise TIERS, stop at the first tier producing ≥1 result:
   - **Tier 1 (short-term):** last 7 days.
   - **Tier 2 (medium):** last 30 days.
   - **Tier 3 (long-term):** all time.
   Per tier: (a) embed the query once (reuse across tiers), call the RPC for that window; (b) ALSO decrypt-keyword scan the window for exact word hits — Tier 1/2: full window scan capped 300 rows; Tier 3 keyword: walk back month-by-month from most recent, cap 200 rows/month, stop on first month with hits, hard cap 12 months per call (report "older months unsearched — ask me to search older" and honor `search_older`).
   If embeddings unavailable (no key / column empty), keyword path alone carries the tier.
4. Merge + dedupe by row id (semantic hits first, similarity desc; keyword hits appended). Fetch top rows by id, decrypt, return up to 6 turns as `{ date, tier, similarity?, question: ≤1200 chars, answer: ≤1200 chars }` + `{ tier_reached, months_scanned }`. Respect `MAX_TOOL_RESULT_CHARS`.

### E. System prompt
One new bullet in the "How you use your tools" block (adult + child prompts): when the user references any past detail not visible in the current thread or memories, call `recall_history` BEFORE answering; never claim to not remember without searching; if Tier 3 keyword walk-back stops early, offer to search older.

### F. Hard invariants (audit will check these)
1. Every new query filters `.eq('space', deps.space)` / `p_space` — no exceptions.
2. `recall_history` reachable ONLY from the coach tool loop. `family-brain.ts` / `marriage-brain.ts` / family context paths gain NO new imports or read paths.
3. NO deletes/prunes of `story_coach_log`, ever. Consolidation logic untouched.
4. Fail-open everywhere: missing pgvector migration → RPC error caught → keyword path; missing OPENAI_API_KEY → keyword path; decrypt failure on a row → skip row.
5. lyfcoach: metering / model-pin contract untouched; the tool runs inside existing `MAX_TOOL_ROUNDS`.
6. RPC returns ids + metadata only — ciphertext/plaintext never flows through SQL.
7. Embedding vectors are derived from plaintext (documented tradeoff — semantic-leak surface in a DB dump; accepted, matches at-rest-encryption honesty posture).
8. montree route file is `app/api/story/coach/route.ts`; lyfcoach is `app/api/coach/route.ts` — do not cross-contaminate paths.

## §3 Gates before "done"
- `tsc` + `eslint` clean on touched files, `next build` green (lyfcoach: `npm install --include=dev` locally if needed; NEVER npm-install from the sandbox into the repo — flag instead).
- Logic self-check: enumerate the tier walk on paper against 3 scenarios (7d hit, 45-day-old dream, 8-month-old fact with exact keyword only).
- Cross-space reasoning check: show the space filter on every query path.
- SQL delivered as paste-ready blocks (Tredoux runs in Supabase dashboards — TWO different projects).
