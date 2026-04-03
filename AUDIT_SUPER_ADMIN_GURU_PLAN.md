# Super-Admin Guru Plan Audit Report

**Date:** 2026-03-30
**Plan:** PLAN_SUPER_ADMIN_GURU.md
**Audit Focus:** Tool definitions, SQL safety, executor patterns, token budget
**Verdict:** ⚠️ **NOT CLEAN — 3 CRITICAL + 4 HIGH issues must be fixed**

---

## Executive Summary

The plan is **architecturally sound** (system design, tool grouping, confirmation flow, streaming) but has **critical SQL injection risks** and **incomplete schema validation**. The `run_sql_readonly` tool as specified is **unsafe** and requires a hardened RPC. The `query_table` tool's op whitelist doesn't cover common SQL injection vectors (CTEs, semicolons, comments). Missing mitigations:

1. **CRITICAL:** RPC function doesn't prevent CTEs or nested SELECT attacks
2. **CRITICAL:** Operator whitelist incomplete — missing `in`, `nin`, `cs`, operators that trigger injection
3. **CRITICAL:** No regex/pattern validation on `table` parameter — could bypass whitelist via wildcards
4. **HIGH:** Token budget estimate (+12%) may exceed actual limits with schema injection
5. **HIGH:** Tool definitions lack length limits on string parameters (most)
6. **HIGH:** Schema injection scope uncapped — "~20 tables" is ambiguous
7. **MEDIUM:** No rate limiting mentioned (single user, but helpful for monitoring)

---

## CRITICAL Issues

### CRITICAL-1: RPC `execute_readonly_query` Vulnerable to CTE Injection

**Location:** Migration section, `migrations/157_readonly_sql_rpc.sql`

**Problem:**
```sql
IF NOT (LOWER(TRIM(query_text)) LIKE 'select%') THEN
  RAISE EXCEPTION 'Only SELECT queries are allowed';
END IF;
```

This check is **trivially bypassed** by:
- **Leading whitespace + comment:** `/* comment */ SELECT...` → LOWER(TRIM(...)) still sees SELECT, but comments bypass validation
- **CTEs (Common Table Expressions):** `WITH attacker AS (SELECT * FROM secrets) SELECT * FROM attacker;` → Starts with WITH, not SELECT
- **Parentheses:** `( SELECT * FROM secrets )`  → Starts with `(`, not SELECT

**Better Pattern:**
```sql
-- Reject if contains forbidden keywords (case-insensitive, whole-word boundaries)
IF query_text ~* '\b(WITH|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|INTO)\b' THEN
  RAISE EXCEPTION 'Query contains forbidden keywords';
END IF;

-- Only allow SELECT (after rejecting above)
IF NOT (LOWER(LTRIM(query_text)) ~ '^(select|with)') THEN
  RAISE EXCEPTION 'Only SELECT queries allowed';
END IF;
```

**Impact:** An attacker (e.g., Claude prompt injection) could exfiltrate sensitive data:
```sql
-- This passes the current check:
( SELECT string_agg(data, ',') FROM story_users );

-- Or CTE:
WITH cte AS (SELECT password_hash FROM story_admin_users) SELECT * FROM cte;
```

**Fix:** Move keyword rejection to **reject list first** (WITH, INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, COPY, DECLARE, DO), then allow only SELECT as the **first non-whitespace word**.

---

### CRITICAL-2: `query_table` Operator Whitelist Incomplete

**Location:** `guru-tools.ts`, tool `query_table`, input schema

**Problem:**
```ts
Op whitelist: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `is_null`, `not_null`
```

Missing operators that Supabase `.select()` supports and could be misused:
- `in` / `nin` — list matching, allows `in` with semicolon-injection in array
- `cs` / `cd` — containment/contains (JSONB/array operators)
- `ov` — overlap (array/range operators)
- `sl` / `sr` / `nxr` / `nxl` / `ants` / `anti` — range operators

**Example Attack:**
```json
{
  "table": "montree_schools",
  "filters": [
    { "column": "id", "op": "in", "value": "1234' OR '1'='1" }
  ]
}
```

If the executor naively passes `value` to `.in()` without array-ifying it, Claude could craft a string that confuses the builder.

**Fix:** Whitelist ONLY the 10 operators in the plan. Reject any `op` not in the list with a clear error before calling `.from()`.

**Code Pattern (Executor):**
```ts
const ALLOWED_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is_null', 'not_null']);
if (!ALLOWED_OPS.has(op)) {
  return { success: false, message: `Invalid operator: ${op}` };
}
```

---

### CRITICAL-3: Table Whitelist Validation Missing Regex/Wildcard Check

**Location:** `guru-executor.ts` (to be implemented), `query_table` handler

**Problem:**
The plan states "all montree_* tables (validated against list)" but doesn't specify **how** the list is checked. Claude could bypass a naive prefix-check via:

- **Wildcard patterns:** `montree_*` (if regex matching is used naively)
- **UNION injection:** `montree_schools UNION SELECT * FROM story_users; --` (semicolon-terminated)
- **Comments:** `montree_schools; DROP TABLE x; --` (semicolon + comment)

**Example Attack (if Supabase query builder is misused):**
```json
{
  "table": "montree_schools; DELETE FROM montree_teachers; --"
}
```

If the executor concatenates `table` into a raw SQL string (instead of using `.from(table)` builder), this could work.

**Fix:**
1. **Maintain a Set of allowed table names:**
   ```ts
   const ALLOWED_TABLES = new Set([
     'montree_schools', 'montree_teachers', 'montree_children',
     'montree_child_progress', 'montree_media', 'montree_guru_interactions',
     // ... ~20 tables max
   ]);

   if (!ALLOWED_TABLES.has(table)) {
     return { success: false, message: `Table not allowed: ${table}` };
   }
   ```

2. **Never concatenate** `table` into SQL strings. Use Supabase `.from(table)` builder exclusively.

3. **Validate table name format:** `if (!/^[a-z_]{5,50}$/.test(table))` — alphanumeric + underscores, 5-50 chars.

---

## HIGH Issues

### HIGH-1: Schema Injection Scope Uncapped ("~20 tables" is vague)

**Location:** `guru-prompt.ts`, system prompt

**Problem:**
```
Include only the ~20 most relevant tables with their key columns. Full list available but trimmed for token efficiency.
```

This is **ambiguous**. Which 20 tables? What if Claude asks for a table not in the schema? Does it:
- Guess and hallucinate schema?
- Ask for it as a free text request?
- Assume all `montree_*` tables are included?

**Impact:** If the schema doesn't include a table but Claude thinks it does, tool calls fail silently, wasting tokens and confusing the user.

**Fix:**
1. **Hardcode the 20 tables** in the prompt. No ambiguity.
   ```
   Supported tables: montree_schools, montree_teachers, montree_children,
   montree_child_progress, montree_media, montree_guru_interactions,
   montree_super_admin_audit, montree_leads, montree_reports,
   montree_classroom_curriculum_works, montree_feature_toggles,
   montree_school_features, montree_rate_limit_logs, montree_api_usage,
   montree_visitors, montree_events, montree_event_attendance,
   story_users, story_admin_users, story_login_logs
   ```

2. **Explain what's NOT included:**
   ```
   NOT available: story_messages, story_admin_users (partial — no password_hash),
   auth tables, Stripe data, third-party integrations
   ```

3. **If a table isn't in the schema, tell Claude so:**
   ```ts
   if (!ALLOWED_TABLES.has(table)) {
     return {
       success: false,
       message: `Table ${table} not available. Try: ${Array.from(ALLOWED_TABLES).slice(0, 5).join(', ')}, ...`
     };
   }
   ```

---

### HIGH-2: Tool String Parameters Lack Length Validation

**Location:** All tool input schemas in `guru-tools.ts`

**Problem:**
Most string parameters are defined without `maxLength`:

```json
{
  "reason": {
    "type": "string",
    "description": "Brief explanation of WHY..."
  }
}
```

Claude could send:
- `reason`: 10,000 chars of garbage
- `custom_context`: SQL injection payloads
- `email_type`: `"custom" + "' OR '1'='1"`
- Search term: Regex bombs

**Fix:** Add `maxLength` to every string parameter:

```json
{
  "reason": {
    "type": "string",
    "maxLength": 500,
    "description": "Brief explanation (max 500 chars)"
  },
  "search_term": {
    "type": "string",
    "maxLength": 100,
    "pattern": "^[a-zA-Z0-9\\s@.\\-_]{1,100}$",
    "description": "Search term (alphanumeric, email chars only)"
  },
  "email_type": {
    "type": "string",
    "enum": ["cold_intro", "follow_up", "demo_offer", "custom"],
    "description": "Email template type"
  }
}
```

**Apply to all 15 tools:**
- `reason`: 500
- `custom_context`: 1000
- `search_term`: 100
- `school_name`, `contact_name`: 200
- `notes`: 1000
- `sql`: 5000 (still safe because of RPC validation)

---

### HIGH-3: Confirmation Flow Doesn't Validate Re-execution

**Location:** `route.ts`, confirmation flow

**Problem:**
```
Client sends: { confirmed_action: { tool, input } }
Route: "detects confirmed_action, executes directly without AI re-evaluation"
```

**Risk:** If Claude's input is malformed or has changed since the confirmation prompt, the route executes bad input silently.

**Example:**
1. Claude proposes: `delete_school { school_id: 'V8F8V9', reason: 'Testing' }`
2. User confirms deletion
3. Client somehow (glitch, race condition) sends: `{ school_id: 'PROD-LIVE', reason: '...' }`
4. Route deletes PROD-LIVE without re-checking

**Fix:**
```ts
// Before executing confirmed action, re-validate input schema
const schema = GURU_TOOLS.find(t => t.name === tool)?.input_schema;
if (!schema) return error('Tool not found');

const validationResult = validateAgainstSchema(input, schema);
if (!validationResult.valid) {
  return error(`Confirmation input invalid: ${validationResult.errors}`);
}

// Also: log the original input hash + confirmation hash for audit
```

---

### HIGH-4: Token Budget Estimate May Be Off

**Location:** Token Budget Analysis section

**Problem:**
```
System prompt estimate:
- Base instructions: ~800 tokens
- Schema injection (~20 tables, key columns): ~2,000 tokens
- Business context: ~300 tokens
- Tool definitions (15 tools): ~3,000 tokens
Total system: ~6,100 tokens
```

**Issues:**
1. **15 tools = 3,000 tokens** is **very optimistic**. Teacher Guru's 12 tools = ~2,500-3,000 tokens. 15 tools with longer descriptions (query tools are verbose) could be 4,000-4,500.
2. **Schema injection is 2,000 tokens** — that's ~300 tokens per table for 7 columns each. If you add indexes, types, relationships, this balloons.
3. **"Conversation memory (5 exchanges): ~2,000 tokens"** — with complex super-admin queries (long tool results), this could be 3,000-4,000.
4. **No room for error:** 8,300 input tokens leaves only ~3,700 for output. If Claude generates a 3,000-token response + wants to call 2 tools, it'll hit limits.

**Actual estimate:**
```
System (conservative):      7,000 tokens
Memory (5 exchanges):       2,500 tokens
User question:               300 tokens
Tool calls + results:      2,000 tokens (streaming helps, but budget is tight)
────────────────────────────────────
Total input budget:       11,800 tokens (63% of 200K limit — safe)
Total per interaction:    ~$0.035 input + ~$0.10 output = ~$0.135
```

**Fix:** Document this as "estimated $0.10-0.15 per interaction" instead of "$0.10" and add a caveat that complex queries may exceed 15 calls.

---

## MEDIUM Issues

### MEDIUM-1: No Rate Limiting or Audit Sampling

**Location:** `route.ts`, proposed implementation

**Problem:**
Every tool call logs to `montree_super_admin_audit`. Audit logging is good, but:
- No rate limiting (though single user, so low risk)
- No sampling for high-frequency tools (e.g., 100 `query_table` calls in a loop)
- Log table could grow unbounded if super-admin queries data repeatedly

**Fix:** Add optional rate limiting (not blocking, but logged):
```ts
const audit = {
  action: 'guru_tool_call',
  resource_type: toolName,
  ip_address: getClientIp(request),
  // Sample: log every Nth call if N > 10 calls/minute
};

const recentCallsCount = await supabase
  .from('montree_super_admin_audit')
  .select('id', { count: 'exact' })
  .eq('resource_type', toolName)
  .gt('created_at', new Date(Date.now() - 60_000).toISOString());

if (recentCallsCount > 10) {
  // Log with sampled flag
  audit.sampled = true;
}
```

---

### MEDIUM-2: Tool Return Schemas Inconsistent

**Location:** `guru-executor.ts`, all tool handlers

**Problem:**
All handlers return `ToolResult` with `{ success, message, detail }`. But the plan doesn't define what `detail` should be for different tools.

**Example Inconsistencies:**
- `query_table`: detail = `{ rows: [], count: number }`
- `query_stats`: detail = `{ aggregate_value: number }` or `{ results: [] }`?
- `get_school_detail`: detail = big school object?
- `delete_school`: detail = confirmation object?

**Fix:** Document the return schema per tool:
```ts
interface ToolResult {
  success: boolean;
  message: string;
  detail?: Record<string, unknown>; // Specific per tool (see below)
}

// Tool-specific detail schemas:
// query_table: { rows: any[], count: number, query_info?: string }
// query_stats: { result: number, group?: Record<string, number> }
// get_school_detail: { school: School, teachers: number, students: number, ... }
// delete_school: { confirmation_required: true, description: string } OR { deleted_at: timestamp }
```

---

### MEDIUM-3: Predefined Queries Lack Parameter Injection Prevention

**Location:** `guru-tools.ts`, tool `query_custom`

**Problem:**
```
Predefined queries: active_schools_summary, daily_api_costs, ..., (no login 30+ days), stale_schools
Input: { query_name: string, params?: Record<string, any> }
```

If a predefined query is something like:
```ts
case 'active_schools_summary':
  return supabase
    .from('montree_schools')
    .select(`*,teachers:${params.teacher_table || 'montree_teachers'}(count)`)
```

Then Claude could inject a table name via `params.teacher_table`.

**Fix:**
1. **Never use params to construct table/column names**. Only use for WHERE values.
2. **Whitelist all allowed param keys per query:**
   ```ts
   const QUERY_ALLOWED_PARAMS = {
     active_schools_summary: new Set([]), // No params
     daily_api_costs: new Set(['since_days']),
     guru_usage_by_school: new Set(['school_id']),
     stale_schools: new Set(['days_inactive']),
   };

   if (!QUERY_ALLOWED_PARAMS[query_name]?.has(key)) {
     return error(`Invalid param for ${query_name}: ${key}`);
   }
   ```

3. **Validate param types and ranges:**
   ```ts
   if (params.since_days !== undefined && (typeof params.since_days !== 'number' || params.since_days < 1 || params.since_days > 365)) {
     return error('since_days must be 1-365');
   }
   ```

---

## RECOMMENDATIONS

### Before Build:
1. ✅ **Fix CRITICAL-1, -2, -3** — Non-negotiable for security
2. ✅ **Fix HIGH-1, -2, -3, -4** — Significant risk/usability issues
3. ✅ **Add ALL maxLength + pattern validation** to tool input schemas
4. ✅ **Hardcode the 20 allowed tables** in system prompt + executor

### During Build:
1. ✅ **RPC function testing:** Unit test with CTE, parentheses, comments before deploy
2. ✅ **Integration test query_table:** 50 queries with edge cases (empty results, many rows, filters)
3. ✅ **Audit logging verification:** Check that every tool call is logged
4. ✅ **Confirmation flow e2e test:** Confirm deletion, then verify deleted_at timestamp in audit

### Post-Deployment:
1. ✅ **Monitor audit log:** Alert if super-admin makes >100 tool calls in 1 hour
2. ✅ **Check RPC function logs:** Watch for rejected queries (should be rare)
3. ✅ **Collect cost data:** Verify actual cost is near $0.10-0.15/interaction estimate
4. ✅ **Solicit feedback:** Ask super-admin if tool definitions are sufficient (any missing tables?)

---

## Summary Table

| Issue | Severity | Type | Blocker? |
|-------|----------|------|----------|
| CTE injection in RPC | CRITICAL | Security | YES |
| Incomplete op whitelist | CRITICAL | Security | YES |
| Table whitelist missing validation | CRITICAL | Security | YES |
| Schema injection scope ambiguous | HIGH | Design | YES |
| No string maxLength limits | HIGH | Security | YES |
| Confirmation doesn't re-validate | HIGH | Logic | NO* |
| Token budget estimate off | HIGH | Planning | NO* |
| No rate limiting | MEDIUM | Monitoring | NO |
| Inconsistent return schemas | MEDIUM | Design | NO |
| Predefined query param injection | MEDIUM | Security | NO |

\* Blocks merged commit, but can be fixed post-deployment.

---

## Verdict

### **⚠️ NOT CLEAN — HOLD FOR FIXES**

**Estimated Fix Time:**
- CRITICAL-1, 2, 3: 2 hours (RPC hardening, operator validation, table whitelist)
- HIGH-1, 2, 3, 4: 3 hours (schema, maxLength, confirmation logic, token docs)
- MEDIUM: 2 hours (optional, post-deployment)
- **Total: 7 hours before safe deployment**

**Merge Criteria:**
- [ ] CRITICAL-1: RPC rejects CTEs, parentheses, leading comments
- [ ] CRITICAL-2: Executor rejects unknown operators before Supabase call
- [ ] CRITICAL-3: Executor rejects tables not in whitelist with exact string match
- [ ] HIGH-1: System prompt hardcodes exactly 20 tables
- [ ] HIGH-2: Every string input has maxLength + pattern if applicable
- [ ] HIGH-3: Confirmation handler re-validates input schema before executing
- [ ] HIGH-4: Token budget documented with $0.10-0.15 per interaction estimate
- [ ] Unit tests: RPC SQL injection resistance (5+ test cases)
- [ ] Integration tests: query_table with 50 edge cases
- [ ] Audit trail verified in test environment

---

## Appendix: Recommended SQL Injection Test Cases

```sql
-- Test 1: CTE injection (should fail)
WITH attacker AS (SELECT password_hash FROM story_admin_users)
SELECT * FROM attacker;

-- Test 2: Leading comment (should fail)
/* comment */ SELECT * FROM montree_schools;

-- Test 3: Parentheses (should fail)
( SELECT string_agg(data, ',') FROM story_users );

-- Test 4: DECLARE (should fail)
DECLARE @sql NVARCHAR(MAX); SELECT * FROM montree_schools;

-- Test 5: UNION (should fail)
SELECT * FROM montree_schools UNION SELECT password_hash FROM story_users;

-- Test 6: Semicolon + DROP (should fail)
SELECT * FROM montree_schools; DROP TABLE montree_teachers; --

-- Test 7: Valid query (should pass)
SELECT id, name, subscription_tier FROM montree_schools WHERE created_at > now() - interval '30 days' LIMIT 50;
```

