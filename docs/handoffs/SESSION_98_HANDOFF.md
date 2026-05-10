# Session 98 — Parent Messaging Architecture (Flag-Gated, OFF by Default)

**Date:** May 9, 2026 (continuation cut after Session 97)

**Goal of this session:** Build the full parent-side threaded messaging architecture mirroring the principal/teacher Communication system shipped in Session 97 — but ship it with the feature flag OFF for every school. Eliminates the "two channels open at once" support-ticket scenario before Gloria's first real school onboards. Plus a deliberate posture decision on the parent dashboard scope: it stays exactly as it is — log in, see Weekly Wrap report, log out. No nav clutter. The dashboard never links to messaging, milestones, photos, or weekly-review even when those routes exist.

---

## TL;DR

- **Migration 193** — adds `parent_messaging` feature flag (default `false` for every school).
- **4 new API endpoints** under `/api/montree/parent/messages/*` that mirror admin/communication exactly. All gate on the flag (404 if off) and self-scope by parent's child set + school.
- **2 new UI pages** at `/montree/parent/messages` (thread list + compose) and `/montree/parent/messages/[threadId]` (thread detail + reply).
- **Legacy parent /messages page replaced** — old flat-table inbox is gone. New page does flag-probe on mount → redirects to dashboard if OFF.
- **Milestones page deprecated** — hide-don't-delete posture, top-of-file comment documents the decision, dashboard never links to it.
- **Parent dashboard untouched.** Locked-in scope: `log in → see Weekly Wrap → log out`. Photos / Weekly Review / Messages routes stay accessible by URL, never by nav.

---

## Migration to run

🚨 **`migrations/193_parent_messaging_feature.sql`** — must be run in Supabase SQL Editor before any of the new endpoints function. Until run, every parent messages route returns 404 because `isFeatureEnabled()` falls back to `default_enabled` and there's no row to read.

After running, the flag is OFF for every school. Flip ON per school via:

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('<SCHOOL_UUID>', 'parent_messaging', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

---

## Architectural rules locked in this session — DO NOT BREAK

1. **Parent messaging is feature-flagged via `parent_messaging` (migration 193).** Default OFF. Every API endpoint gates on this via `resolveMessagingParent()`. When OFF, return 404 — not 403, not redirect-server-side. The feature should not appear to exist for unflagged schools.

2. **The parent dashboard is NOT a hub.** Its only job: render the latest Weekly Wrap report. No links to messages, milestones, photos, weekly-review. Even when `parent_messaging` flips on, surfacing it on the dashboard is a separate explicit decision — not an automatic side-effect.

3. **Invite-based parent sessions are read-only in messaging.** A parent JWT with `sub=child_id` but no `parentId` cannot participate in threads (participants are people, not children). `resolveMessagingParent()` returns 403 for these, which the UI surfaces as a redirect to dashboard.

4. **Cross-pollination contract on every parent messaging endpoint:**
   - Filter by `participant_id = parent.parentId` for thread participation lookups.
   - Filter by `child_id IN parent.childIds` on thread reads.
   - Filter by `school_id = parent.schoolId` on every thread query (belt-and-braces).
   - POST validates `child_id ∈ parent.childIds` AND verifies recipient teacher is in the SAME classroom as the child OR recipient principal is in the same school.

5. **Parent messages flow into the SAME `montree_message_threads` tables as Session 97's Communication system.** No parallel schema. When a parent posts a thread, the principal sees it in `/montree/admin/communication` exactly as if a teacher drafted it. The principal is auto-added as observer per Session 96's transparency rule via `addPrincipalObserver()`.

6. **Parents have NO AI drafting in v1.** The reply API forces `ai_drafted=false`, `approved_by_id=null`. Tracy's drafting tools belong to the principal. If we add parent-side AI later (e.g. translation help), it gets its own column / its own posture decision — never silently flipped on.

7. **Hide-don't-delete on retired parent surfaces.** Milestones page stays on disk with a deprecation header at the top. Direct URLs still resolve. Future agents must not extend this page or surface it in any nav.

8. **The legacy parent /messages page (flat-table inbox) is GONE.** Its file was rewritten in place. The legacy `MessageCard` / `MessageComposer` / `InboxHeader` components remain because the teacher-side `/montree/dashboard/messages` page still uses them — don't delete those components.

---

## Files changed (15 total)

**Migration (NEW):**
- `migrations/193_parent_messaging_feature.sql`

**Type/lib (NEW):**
- `lib/montree/parent-messaging/types.ts`
- `lib/montree/parent-messaging/access.ts`
- `lib/montree/parent-messaging/index.ts`

**Type/lib (extended):**
- `lib/montree/features/types.ts` — `parent_messaging` added to `FeatureKey` union.

**APIs (NEW — 4 routes, 7 handlers):**
- `app/api/montree/parent/messages/threads/route.ts` (GET list + POST create)
- `app/api/montree/parent/messages/threads/[threadId]/route.ts` (GET detail + PATCH mark-read)
- `app/api/montree/parent/messages/threads/[threadId]/messages/route.ts` (GET messages list + POST reply)
- `app/api/montree/parent/messages/recipients/route.ts` (GET valid recipients per child)

**UI (REPLACED):**
- `app/montree/parent/messages/page.tsx` — was legacy flat-table inbox; now flag-gated thread list + compose modal.

**UI (NEW):**
- `app/montree/parent/messages/[threadId]/page.tsx` — thread detail + reply composer.

**UI (deprecation comment header only — behavior unchanged):**
- `app/montree/parent/milestones/page.tsx` — hide-don't-delete posture documented at top of file.

**Docs:**
- `docs/handoffs/SESSION_98_HANDOFF.md` (this file)

---

## Audit cycle outcome

12 audits run, all clean:
1. ✅ Every parent/messages route imports `resolveMessagingParent`.
2. ✅ Every handler (7 of 7) calls `resolveMessagingParent()` BEFORE any `.from(` data work.
3. ✅ Cross-pollination filter consistent: `parent.parentId` / `parent.childIds` / `parent.schoolId` on every query.
4. ✅ Frontend redirects to dashboard on 401, 403, AND 404 (covers unauth, invite-only, and flag-off).
5. ✅ Parent dashboard does not link to /messages anywhere.
6. ✅ No legacy imports left in the rewritten page.
7. ✅ Teacher-side `/montree/dashboard/messages` still works (MessageCard etc. components untouched).
8. ✅ No external code references the parent messages URL — no broken links.
9. ✅ Migration default_enabled=false confirmed in SQL.
10. ✅ `parent_messaging` added to FeatureKey union.
11. ✅ Lint clean across all 10 changed/new files (--max-warnings=0, exit 0).
12. ✅ Milestones deprecation header in place.

---

## Verification checklist (next session, after Railway deploys + migration 193 runs)

1. **Run migration 193 in Supabase.**
2. With flag OFF (default), open `/montree/parent/messages` directly → expect redirect to `/montree/parent/dashboard`.
3. With flag OFF, hit `GET /api/montree/parent/messages/threads` from devtools → expect 404.
4. Flip `parent_messaging` ON for Whale Class:
   ```sql
   INSERT INTO montree_school_features (school_id, feature_key, enabled)
   VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'parent_messaging', true)
   ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
   ```
5. Log in as a Whale Class parent (full account, not invite). Visit `/montree/parent/messages` → should now render (empty state if no threads).
6. Tap the floating + button → compose modal opens. Pick child → see teachers + principal. Pick a teacher, write subject + body, send.
7. Confirm the new thread appears in the list with unread count = 0.
8. Log in as the principal at `/montree/admin/communication` → confirm the parent's thread appears in their Inbox tab + on the child's classroom view.
9. Log in as the targeted teacher → confirm they see the thread (and CAN reply).
10. Reply as the teacher. Refresh as the parent → unread badge should appear.
11. Open the thread as the parent → mark-read fires → unread badge clears on next refresh.
12. Try to open `/montree/parent/messages/<random-thread-id-from-another-parent>` → expect 404 / redirect.
13. Try POST `/api/montree/parent/messages/threads` with a `child_id` not in parent.childIds → expect 403.
14. Confirm the dashboard remains unchanged: log in → see latest Weekly Wrap → log out. No Messages link visible.
15. Flip the flag OFF again. Visit `/montree/parent/messages` → confirm redirect-to-dashboard works.

---

## Known gaps / deferred to next session

| Item | Why deferred |
|------|-------------|
| Reply CTA on Weekly Wrap report viewer ("Reply to teacher about this week") | Defer until parent_messaging flips ON for any school. Easy to add — small button in `/montree/parent/report/[reportId]` page that POSTs a new thread with the report context. |
| Push notifications when parent gets a reply | Out of scope. Email triggers also deferred. |
| Auto-translation of message bodies between locales | Both sides have LanguageToggle — sufficient for v1. |
| Parent-side AI drafting (e.g. translation suggestions, "soften this") | Tracy belongs to the principal. Parents drafting with AI is a separate posture decision; defer. |
| File attachments | Schema columns exist (`media_url`, `media_type`); UI doesn't expose. Defer until a school asks. |
| i18n parity | New UI strings have inline English fallbacks via `t('key') || 'English'`. Run `npm run i18n:fill-ui` to backfill 11 other locales when ready. |
| Photos page surfacing on dashboard | User explicitly excluded — dashboard stays report-only. |
| Weekly Review page surfacing on dashboard | Same. |
| Per-school messaging policies (e.g. "parents can only message principal, not teachers") | v1 has no policy — any teacher of the child's classroom + the principal are valid recipients. Add policy table when a school asks. |

---

## Posture: when to flip the flag ON

**Don't flip per school until:**
1. The principal has been comfortably using `/montree/admin/communication` for at least a couple weeks. They need to know what to do when a parent replies.
2. There's a clear human handoff — Tredoux pings the principal to say "your parents can now message you in the app, here's what they'll see, here's where their messages land."
3. ONE channel is established as canonical. If the school is still using WeChat or email for parent-school comms, don't add a third channel — convert THEN flip.

**The first school to flip should be a low-stakes one.** Gloria's first school, ideally with a small parent base where any glitches are easy to catch.

---

## Carry-overs from prior sessions (still pending)

1. **Migration 192** (Session 97) — `ALTER TABLE montree_agent_gloria_log RENAME TO montree_agent_mira_log`. Required before Mira logging works.
2. **Migration 188** (Session 91) — agent dashboard authenticate.
3. **Resend domain verification** for `montree.xyz`.
4. **Sarah's agent login** issuance.
5. **Phase 5 Payout calculator** (~1.5 days, now unblocked since Stripe is live).
6. **Phase 6 super-admin Money tab** (~2-3 days).
7. **Outreach follow-ups:** FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.
8. **InVideo refund email** — Gmail draft `r-47687054011919665`.
