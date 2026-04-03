# Super-Admin Guru — Implementation Plan

## Vision
Full-power AI copilot on the super-admin dashboard. One new tab ("🧠 Guru") alongside Schools, Leads, Feedback, Visitors. The Guru can query all data, manage operations, draft outreach, and perform destructive operations with confirmation. Modeled after the teacher Guru system but scoped to super-admin concerns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  SuperAdminGuru.tsx (Chat UI Tab)                │
│  - SSE streaming, tool result display            │
│  - Confirmation modal for destructive ops        │
│  - Conversation history (session-scoped)         │
└──────────────────┬──────────────────────────────┘
                   │ POST /api/montree/super-admin/guru
                   │ Headers: x-super-admin-token
┌──────────────────▼──────────────────────────────┐
│  route.ts (API Handler)                          │
│  - Auth via verifySuperAdminAuth()               │
│  - SSE streaming (ReadableStream)                │
│  - Tool loop (max 4 rounds)                      │
│  - 90s total timeout                             │
│  - Audit logging every tool call                 │
│  - Conversation memory (last 3 messages)         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  guru-prompt.ts (System Prompt)                  │
│  - Full DB schema injection (~47 tables)         │
│  - Role: "Montree platform operations copilot"   │
│  - Destructive op confirmation instructions      │
│  - Business context (pricing, schools, metrics)   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  guru-tools.ts (Tool Definitions, ~15 tools)     │
│  - Strict JSON schemas per tool                  │
│  - Grouped: Query / Operations / Outreach / Mgmt │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  guru-executor.ts (Tool Execution)               │
│  - Switch/case per tool                          │
│  - Parameter validation before DB calls          │
│  - Audit log every execution                     │
│  - Destructive ops return confirmation request   │
└─────────────────────────────────────────────────┘
```

---

## Files to Create (5 new)

### 1. `app/api/montree/super-admin/guru/route.ts` (~350 lines)

**Auth:** `verifySuperAdminAuth(request.headers)` from `lib/verify-super-admin.ts` — takes `Headers` object, checks JWT token first (`x-super-admin-token`), falls back to password (`x-super-admin-password`). Returns `{ valid: boolean, error?: string }`. Return 401 if `!valid`.

**Streaming:** SSE via `new ReadableStream()` with `TextEncoder`. Events:
- `{ type: 'text', text: '...' }` — streamed text chunks
- `{ type: 'tool_use', name: '...', input: {...} }` — tool being called
- `{ type: 'tool_result', name: '...', result: {...} }` — tool execution result
- `{ type: 'confirmation_required', tool: '...', description: '...' }` — destructive op pending
- `{ type: 'done' }` — stream complete
- `{ type: 'error', message: '...' }` — error

**Tool Loop:**
- Max 4 rounds (super-admin needs more rounds for complex queries)
- Parallel tool execution via `Promise.all` (same as teacher Guru)
- Total timeout: 90s via `AbortController`
- Per-API-call timeout: 45s

**Conversation Memory:**
- Accept `messages: Array<{ role: 'user' | 'assistant', content: string }>` in request body
- Client maintains conversation history in React state (session-scoped, no DB persistence)
- Inject last 5 exchanges into API call

**Confirmation Flow:**
- Destructive tools (delete_school) return `{ confirmation_required: true, confirmation_id: crypto.randomUUID(), description: "..." }`
- Stream emits `confirmation_required` event with `confirmation_id`
- Client shows confirmation modal, stores `confirmation_id` in state
- User confirms → client sends POST with `{ confirmed_action: { confirmation_id, tool, input } }`
- Route detects `confirmed_action` in body:
  ```ts
  if (body.confirmed_action) {
    const { confirmation_id, tool, input } = body.confirmed_action;
    // Validate confirmation_id matches a pending action (stored in-memory map with 5-min TTL)
    const pending = pendingConfirmations.get(confirmation_id);
    if (!pending || pending.tool !== tool) return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
    pendingConfirmations.delete(confirmation_id);
    // Execute directly, stream result back
    const result = await executeToolDirect(tool, input, supabase, request);
    // ... stream result as SSE
  }
  ```
- Module-level `pendingConfirmations = new Map()` with 5-min TTL cleanup
- Prevents double-execution: confirmation_id is deleted after use

**Audit Logging:**
- Every tool call logged to `montree_super_admin_audit` table
- Fields: action='guru_tool_call', resource_type=tool_name, resource_details=JSON(input+result), ip

**Model:** Claude Sonnet (`claude-sonnet-4-20250514`) — needs full reasoning for complex queries.

### 2. `lib/montree/super-admin/guru-prompt.ts` (~200 lines)

**System prompt structure:**
```
You are Montree's operations copilot. You have full access to the platform database and tools.

## Your Capabilities
- Query any data across all schools, teachers, children, interactions
- Manage schools, leads, features, settings
- Draft outreach emails and analyze campaigns
- Perform destructive operations (with user confirmation)
- Diagnose issues and check system health

## Database Schema
[Inject key table schemas — columns, types, relationships]

## Business Context
- Production URL: montree.xyz
- Deploy: Railway auto-deploy on push to main
- Pricing: Free trial (3 Guru messages/day) → $5/child/month (Haiku) or $20/child/month (Sonnet)
- Active schools: query montree_schools WHERE subscription_tier != 'free'
- Outreach: Google Sheet with ~420 schools, batched via GMass

## Tool Use Guidelines
- For data queries, use query_table or query_stats tools
- For destructive operations, ALWAYS describe what you will do and wait for confirmation
- Never fabricate data — if a query returns empty, say so
- Format numbers and dates for readability
- When showing tabular data, use markdown tables
```

**Schema injection:** Programmatically build from a const map of table→columns (not raw SQL). Include only the ~20 most relevant tables with their key columns. Full list available but trimmed for token efficiency.

### 3. `lib/montree/super-admin/guru-tools.ts` (~300 lines)

**15 tools in 4 groups:**

#### Group 1: Data Query (4 tools)
1. **`query_table`** — Read rows from any montree_* table with filters
   - Input: `{ table: string, columns?: string[], filters?: Array<{column, op, value}>, order_by?: string, limit?: number }`
   - Op whitelist: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `is_null`, `not_null`
   - Table whitelist: all montree_* tables (validated against list)
   - Default limit: 50, max: 500

2. **`query_stats`** — Aggregate statistics (count, sum, avg, min, max)
   - Input: `{ table: string, aggregate: 'count' | 'sum' | 'avg' | 'min' | 'max', column?: string, filters?: Array<{column, op, value}>, group_by?: string }`

3. **`query_custom`** — Run a predefined named query (NOT raw SQL)
   - Input: `{ query_name: string, params?: Record<string, any> }`
   - Predefined queries: `active_schools_summary`, `daily_api_costs`, `guru_usage_by_school`, `visitor_stats_by_country`, `recent_signups`, `stale_schools` (no login 30+ days), `top_api_consumers`, `lead_conversion_funnel`

4. **`search_across_tables`** — Search a term across multiple tables (name, email, notes fields)
   - Input: `{ search_term: string, tables?: string[] }`

#### Group 2: Operations (4 tools)
5. **`get_system_health`** — Check system status
   - No input required
   - Returns: DB connection status, recent error counts, API response times, storage usage, active sessions

6. **`get_school_detail`** — Deep dive into a specific school
   - Input: `{ school_id: string }`
   - Returns: school info, teacher count, student count, classroom count, recent activity, guru usage, API costs, subscription status

7. **`delete_school`** — ⚠️ DESTRUCTIVE — Delete a school and all associated data
   - Input: `{ school_id: string, reason: string }`
   - REQUIRES CONFIRMATION
   - Cascade: classrooms → children → progress → media → interactions → teachers

8. **`toggle_feature`** — Enable/disable a feature for a school
   - Input: `{ school_id: string, feature_name: string, enabled: boolean }`

#### Group 3: Outreach & Leads (4 tools)
9. **`manage_lead`** — Update lead status, notes, or email
   - Input: `{ lead_id: string, updates: { status?, notes?, email? } }`

10. **`get_lead_overview`** — Summary of all leads with conversion stats
    - No input required
    - Returns: total leads, by status, by source, recent activity, conversion rate

11. **`draft_email`** — Draft an outreach email using context
    - Input: `{ school_name: string, contact_name?: string, email_type: 'cold_intro' | 'follow_up' | 'demo_offer' | 'custom', custom_context?: string }`
    - Returns: subject line + email body (using the sacred email template as base)

12. **`get_campaign_stats`** — Outreach campaign statistics
    - No input required
    - Returns: emails sent, open rate, bounce rate, replies, by batch

#### Group 4: Platform Management (3 tools)
13. **`update_school_settings`** — Modify school settings (subscription tier, plan type, etc.)
    - Input: `{ school_id: string, updates: { subscription_tier?, plan_type?, account_type? } }`
    - Validates enum values before applying

14. **`run_named_query`** — Execute a predefined read-only SQL query by name (REPLACES raw SQL — safer)
    - Input: `{ query_name: string, params?: Record<string, any> }`
    - Available queries: `school_with_counts`, `api_cost_by_school_last_30d`, `guru_usage_heatmap`, `children_per_classroom`, `inactive_teachers_30d`, `media_storage_by_school`, `lead_source_breakdown`, `visitor_geo_summary`, `recent_errors`, `subscription_revenue`
    - Each query is a hardcoded SQL string with `$1`, `$2` parameter placeholders — NO string concatenation
    - Returns: `{ rows: any[], query_name: string }`

15. **`get_audit_log`** — View recent audit events
    - Input: `{ limit?: number, action_filter?: string, since_hours?: number }`
    - Returns: recent entries from montree_super_admin_audit

### 4. `lib/montree/super-admin/guru-executor.ts` (~500 lines)

**Pattern:** Switch/case matching teacher Guru executor exactly.

**Key implementation details per tool:**

- **`query_table`**: Validate table against whitelist. Build Supabase query dynamically: `.from(table).select(columns.join(',')).order(order_by).limit(limit)`. Apply filters via `.eq()`, `.gt()`, etc. Return `{ rows: data, count: data.length }`.

- **`query_stats`**: Use Supabase `.select('count', { count: 'exact' })` for count. For sum/avg/min/max, use `run_sql_readonly` internally with `SELECT AGG(column) FROM table WHERE ...`.

- **`query_custom`**: Hardcoded switch/case per named query. Each runs specific optimized Supabase queries. Example `active_schools_summary`:
  ```ts
  const schools = await supabase.from('montree_schools').select('id, name, subscription_tier, created_at')
  const teacherCounts = await supabase.from('montree_teachers').select('school_id').not('school_id', 'is', null)
  // ... merge and format
  ```

- **`delete_school`**: Returns `{ confirmation_required: true, description: "Will delete school X with Y teachers, Z students, W photos. This cannot be undone." }`. On confirmed re-call, executes cascade delete in correct FK order.

- **`run_sql_readonly`**: Parse SQL string, reject non-SELECT. Execute via `supabase.rpc('exec_readonly_sql', { query: sql })` — needs a Supabase RPC function, OR use the `DATABASE_URL` directly with `pg` client. **Decision: Use Supabase `.from().select()` to build the query where possible; for truly complex queries, use `supabase.rpc()` with a read-only wrapper.** Actually, simplest: just use the Supabase PostgREST `.rpc()` pattern or fall back to a raw fetch to the PostgREST endpoint. **Final decision: Create a simple RPC `execute_readonly_query` in a migration that wraps the query in a read-only transaction.**

- **Audit logging**: Every tool execution calls:
  ```ts
  await supabase.from('montree_super_admin_audit').insert({
    action: 'guru_tool_call',
    resource_type: toolName,
    resource_details: JSON.stringify({ input, result: truncatedResult }),
    ip_address: request.headers.get('x-forwarded-for')
  })
  ```

### 5. `components/montree/super-admin/SuperAdminGuru.tsx` (~400 lines)

**Props:** `{ saToken: string }`

**UI Structure:**
- Full-height chat thread (matches GuruChatThread pattern)
- Message bubbles: user (right, blue) and assistant (left, gray)
- Tool execution cards: collapsible cards showing tool name + input + result
- Confirmation modal: when `confirmation_required` event received
- Input bar at bottom: textarea + send button
- "Clear conversation" button in header

**State:**
```ts
const [messages, setMessages] = useState<Message[]>([])
const [input, setInput] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
```

**SSE Handling:**
- `fetch()` with `{ method: 'POST', headers: { 'x-super-admin-token': saToken } }`
- Read response body as `ReadableStream` via `getReader()`
- Parse SSE events, append text chunks to current assistant message
- On `tool_use` event: show tool card in message
- On `tool_result` event: update tool card with result
- On `confirmation_required`: show modal
- On `done`: finalize message

**Confirmation Flow:**
1. Modal shows: "The Guru wants to: [description]. Proceed?"
2. "Confirm" button → sends new message: `{ confirmed_action: { tool, input } }`
3. "Cancel" button → sends "I cancelled the operation" as user message

**Message Types:**
```ts
type Message = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ name: string; input: any; result?: any; status: 'pending' | 'done' | 'error' }>
}
```

---

## File to Modify (1)

### `app/montree/super-admin/page.tsx`

**Changes:**
1. Add `'guru'` to `TabType` union
2. Add 🧠 Guru tab button in the tab bar
3. Add `{activeTab === 'guru' && <SuperAdminGuru saToken={saToken} />}` in render
4. Dynamic import: `const SuperAdminGuru = dynamic(() => import('@/components/montree/super-admin/SuperAdminGuru'), { ssr: false })`

---

## Migration

No migration needed. All tools use existing Supabase client queries. Named queries in `run_named_query` are hardcoded SQL with parameterized placeholders — no RPC needed.

## Table Whitelist (explicit)

```ts
const ALLOWED_TABLES = [
  'montree_schools', 'montree_classrooms', 'montree_teachers', 'montree_children',
  'montree_child_progress', 'montree_works', 'montree_classroom_curriculum_works',
  'montree_classroom_curriculum_areas', 'montree_guru_interactions', 'montree_media',
  'montree_weekly_reports', 'montree_parent_invites', 'montree_behavioral_observations',
  'montree_leads', 'montree_visitors', 'montree_super_admin_audit',
  'montree_feature_toggles', 'montree_school_features', 'montree_api_usage',
  'montree_events', 'montree_event_attendance', 'montree_visual_memory',
  'montree_guru_corrections', 'montree_voice_notes', 'montree_weekly_admin_output',
  'montree_conference_notes', 'montree_attendance_override', 'montree_stale_work_dismissals',
  'montree_guru_brain', 'montree_child_patterns', 'montree_media_children',
] as const;
// Explicitly BLOCKED: story_*, auth tables, pg_* system tables
```

---

## Token Budget Analysis

**System prompt estimate:**
- Base instructions: ~800 tokens
- Schema injection (~20 tables, key columns): ~2,000 tokens
- Business context: ~300 tokens
- Tool definitions (15 tools): ~3,000 tokens
- **Total system: ~6,100 tokens**

**Per request (input):**
- System: 6,100
- Conversation memory (5 exchanges): ~2,000
- User message: ~200
- **Total input: ~8,300 tokens**

**Cost per request:** ~$0.025 input + ~$0.075 output = ~$0.10 per interaction. Acceptable for super-admin (single user, low volume).

---

## Security Considerations

1. **Auth**: Every request verified via `verifySuperAdminAuth()` — JWT or password
2. **Table whitelist**: `query_table` only allows montree_* tables (no story_*, no auth tables)
3. **SQL injection prevention**: All Supabase queries use parameterized builders. `run_sql_readonly` validates and uses read-only transaction.
4. **Destructive op confirmation**: Two-step flow — AI proposes, human confirms
5. **Audit trail**: Every tool call logged with input, result, timestamp, IP
6. **No credential exposure**: Guru never sees env vars, API keys, or passwords
7. **Rate limiting**: Not needed (single super-admin user), but could add 60/hr if desired

---

## Build Order

1. `guru-tools.ts` — Tool definitions (no dependencies)
2. `guru-prompt.ts` — System prompt (no dependencies)
3. `guru-executor.ts` — Tool execution (depends on tools for types)
4. `route.ts` — API handler (depends on prompt + executor)
5. `SuperAdminGuru.tsx` — Chat UI component
6. `super-admin/page.tsx` — Wire tab
7. `migration 157` — Optional RPC for raw SQL

---

## What This Does NOT Include (Future)

- Railway log access (would need Railway API integration)
- Google Sheets direct access (would need Sheets API — user can paste data instead)
- Automated scheduled reports (use existing schedule skill if needed)
- Multi-user super-admin support (currently single user)
