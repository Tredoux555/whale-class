#!/usr/bin/env python3
"""Update CLAUDE.md to insert Smart Capture audit fixes as Priority #0"""

import re

CLAUDE_MD = '/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/CLAUDE.md'

with open(CLAUDE_MD, 'r') as f:
    content = f.read()

NEW_PRIORITY_0 = """### Fix Smart Capture Critical Bugs (Priority #0 — FIRST CALL TO ACTION)

**Status:** Deep audit completed Mar 15. Found 3 CRITICAL, 4 HIGH bugs. System works but has silent failure modes that lose data and hang requests.
**Handoff:** `docs/handoffs/HANDOFF_SMART_CAPTURE_AUDIT_MAR15.md` — Full details with exact file paths, line numbers, and fix patterns.
**Estimated time:** ~2.5 hours for all CRITICALs + HIGHs.

**CRITICAL-001: No timeout on Haiku vision call** — `app/api/montree/guru/corrections/route.ts` lines ~276-293. `generateAndStoreVisualMemory()` calls `anthropic.messages.create({ model: HAIKU_MODEL })` with NO AbortController, NO timeout. If Haiku hangs, teacher correction request hangs forever. Fix: Add AbortController + 45s timeout + graceful skip (correction still saves, only visual learning skipped).

**CRITICAL-002: Verify Sonnet vision AbortController** — `app/api/montree/guru/photo-insight/route.ts` lines ~830-870. Mar 13 R2C1 supposedly added `apiAbortController` with signal to Sonnet call. NEEDS VERIFICATION — open the file, find `anthropic.messages.create()` for main vision call (model: AI_MODEL), confirm second argument `{ signal: apiAbortController.signal }` exists. If not, add same pattern as CRITICAL-001 but return graceful JSON (not 500).

**CRITICAL-003: Brain learning silent data loss** — `app/api/montree/guru/corrections/route.ts` lines ~374-401. If `supabase.rpc('append_brain_learning')` fails AND manual upsert fallback fails, learning is silently discarded via `console.error`. Fix: Add in-memory retry queue (module-level array, 3 attempts, 30s delay). See handoff for full code pattern.

**HIGH-001: Photo URL lookup silent failure** — `corrections/route.ts` lines ~85-130. If all 3 photo URL resolution paths fail, `photoUrl` stays null, `generateAndStoreVisualMemory()` is skipped silently. Teacher thinks correction worked but system didn't learn visually. Fix: Log error + return warning in response.

**HIGH-002: Double onProgressUpdate race condition** — `components/montree/guru/PhotoInsightButton.tsx`. GREEN zone auto-update fires `onProgressUpdate` via useEffect AND user clicking confirm fires it again. Fix: Add `progressUpdateFiredRef` guard.

**HIGH-003: Stale closures in PhotoInsightButton handlers** — Same file. `result` derived from `entry?.result` during render can be stale by the time handler executes. Fix: Read fresh from store inside handlers via `photoInsightStore.getEntry(storeKey)`.

**HIGH-004: Missing child_id validation** — `corrections/route.ts` lines ~35-40. If child_id is null/undefined, access check skipped, correction recorded with null child_id, breaks learning loop. Fix: Add `if (!child_id) return 400` at top of handler.

**Architecture note:** Haiku is NOT in the main vision pipeline. Every photo goes through Sonnet (~$0.06). Two-tier Haiku/Sonnet router was designed but NEVER built — would cut costs 60-70%. Build after fixing these bugs.

"""

# Find the line "### Deploy All Local Changes" and insert before it
old_deploy = '### Deploy All Local Changes (Priority #0 — URGENT)'
new_deploy = '### Deploy All Local Changes (Priority #1 — URGENT)'

# Replace the deploy header to renumber
content = content.replace(old_deploy, NEW_PRIORITY_0 + new_deploy)

# Renumber all subsequent priorities
content = content.replace(
    '### Rewrite Phonics Image Downloader with Montessori Filters (Priority #1 — FIRST CALL TO ACTION)',
    '### Rewrite Phonics Image Downloader with Montessori Filters (Priority #2)'
)
content = content.replace(
    '### Fix i18n Work Names Not Translating to Chinese (Priority #2)',
    '### Fix i18n Work Names Not Translating to Chinese (Priority #3)'
)
content = content.replace(
    '### Fix `{count}m ago` Timestamp Bug (Priority #3)',
    '### Fix `{count}m ago` Timestamp Bug (Priority #4)'
)
content = content.replace(
    '### Seed Community Library (Priority #4)',
    '### Seed Community Library (Priority #5)'
)
content = content.replace(
    '### Per-School Guru Personality Settings (Priority #5)',
    '### Per-School Guru Personality Settings (Priority #6)'
)
content = content.replace(
    '### Stripe Setup (Priority #6 — Deferred)',
    '### Stripe Setup (Priority #7 — Deferred)'
)
content = content.replace(
    '### i18n Remaining Wiring (Priority #7)',
    '### i18n Remaining Wiring (Priority #8)'
)
content = content.replace(
    '### Story Vault Image Viewer (Priority #8 — Deferred)',
    '### Story Vault Image Viewer (Priority #9 — Deferred)'
)

# Also update the deploy commit message to include Mar 15 work
old_push = 'feat: self-learning visual memory, expanded visual ID guide, Smart Capture marketing, pink/blue box generators, all Mar 8-14 features'
new_push = 'feat: self-learning visual memory, expanded visual ID guide, Smart Capture marketing, outreach campaign, pink/blue box generators, all Mar 8-15 features'
content = content.replace(old_push, new_push)

# Update the session work section - add handoff to Key Handoff Docs if not already there
if 'HANDOFF_SMART_CAPTURE_AUDIT_MAR15' not in content:
    # Find the first handoff entry in the table and insert before it
    old_first_handoff = '| `docs/handoffs/HANDOFF_GLOBAL_MONTESSORI_RESEARCH_MAR15.md`'
    new_entry = '| `docs/handoffs/HANDOFF_SMART_CAPTURE_AUDIT_MAR15.md` | **CURRENT** — Smart Capture deep audit: 3 CRITICAL + 4 HIGH bugs found. Timeout gaps, silent data loss, race conditions. Full fix patterns with code. |\n' + old_first_handoff
    content = content.replace(old_first_handoff, new_entry)

# Add the outreach campaign page to session work
if 'outreach-campaign/page.tsx' not in content:
    old_session_note = '**Output:** `docs/handoffs/HANDOFF_GLOBAL_MONTESSORI_RESEARCH_MAR15.md`'
    new_session_note = """**Also this session:**
- Deep audit of Smart Capture system — found 3 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW issues
- Built outreach campaign page (`app/montree/super-admin/marketing/outreach-campaign/page.tsx`) with 9 personalized emails, 4-week game plan, mailto links, sent tracking
- Generated `docs/Montree_Global_Outreach_List.xlsx` (Top 50, Chains, Training Orgs, Cold Email sheets)
- Updated marketing hub with outreach campaign link
- Wrote comprehensive handoff: `docs/handoffs/HANDOFF_SMART_CAPTURE_AUDIT_MAR15.md`

**Output:** `docs/handoffs/HANDOFF_GLOBAL_MONTESSORI_RESEARCH_MAR15.md`"""
    content = content.replace(old_session_note, new_session_note)

with open(CLAUDE_MD, 'w') as f:
    f.write(content)

print("CLAUDE.md updated successfully!")
print(f"File size: {len(content)} chars")
