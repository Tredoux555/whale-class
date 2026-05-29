# Session 117 (continued, late evening, May 17, 2026) — Handoff

**Session window:** May 17, 2026, late evening (extending Session 117 after the initial 6-commit Phase 116.2 + 116.3 ship).
**Total new commits on main this run:** 7
**State at session end:** Calendar-first appointments UI is live; Mira messaging tools (Phase 4.7) shipped; Mira system-prompt contradiction caught + fixed in same session.

---

## A. Commits this run (oldest → newest)

| SHA | What |
|---|---|
| `d6c70752` | Calendar-first appointments redesign — new `AppointmentsCalendar.tsx` (~1100 lines), wired into both `/montree/dashboard/appointments` and `/montree/admin/appointments`. Sidebar + More-menu labels: Appointments → Calendar. AvailabilityEditor kept on disk (hide-don't-delete). |
| `36c41e0c` | Calendar polish: Today jump button + mobile auto-scroll-to-detail-panel. |
| `a0f47258` | CLAUDE.md entry for the calendar UI build. |
| `a10f2070` | Mira messaging tools (Phase 4.7 from Session 108 Agent Dashboard Plan). Three new tools: `list_my_threads_with_tredoux`, `start_thread_with_tredoux`, `reply_in_thread`. Cross-pollination by agentId, ai_drafted forced false, school_id NULL only for agent_super_admin threads. |
| `b2424260` | CLAUDE.md entry for the Mira tool extension + 5 new architectural rules (#178-182). |
| `61f16fda` | AvailabilityEditor: deprecation comment header (zero behavior change, kept per hide-don't-delete). |
| `c918aa61` | Mira system prompt: resolved "You CAN'T send anything" contradiction with the new messaging tools. Rule #181 self-violation caught + fixed in the same session. |

All on `origin/main`. Railway auto-deploy triggered.

---

## B. What works now that didn't this morning

1. **Calendar UI** at both teacher (`/montree/dashboard/appointments`) and principal (`/montree/admin/appointments`) surfaces. Month grid with per-day markers (booking / time-away / open). Tap any day → schedule panel below shows bookings inline with Join video call + Show prior conversations. Add popover: "Open this weekday every week" / "I'm away this day". Recurring + Time-away accordions collapsed by default.

2. **Mira can talk to Tredoux** when the agent asks. Three new tools surface in the existing Mira chat at `/montree/agent/mira`. The agent says "tell Tredoux X" → Mira writes the body in the agent's voice, posts into `agent_super_admin` thread, confirms back. "Any reply from Tredoux?" → Mira calls `list_my_threads_with_tredoux`, surfaces unread state. "Reply saying Y" → Mira appends to the existing thread.

---

## C. Calendar architecture (preserved for cold-resume)

**File map:**
- `components/montree/appointments/AppointmentsCalendar.tsx` — single-file primary component, ~1170 lines, dark-forest theme, inline styles, mobile-first.
- `components/montree/appointments/AvailabilityEditor.tsx` — legacy DB-list view, kept on disk per rule #56, has deprecation header at top.
- `components/montree/appointments/AgoraVideoCall.tsx` — unchanged, lazy-imported by calendar.
- `components/montree/appointments/PriorConversationCard.tsx` — unchanged, lazy-imported by calendar.

**Word swaps (rule #177 — DO NOT regress):**

| Old | New |
|---|---|
| Weekly availability | Open every week on… |
| Add window | Add open slot |
| One-off blackouts | Time away |
| Add blackout | Mark time away |
| Upcoming bookings | What's on your calendar |
| Slot length | Meeting length |
| Buffer | Buffer between |

**Cross-pollination contract:** Every fetch goes to the existing 3 backend routes:
- `GET/POST/PATCH/DELETE /api/montree/appointments/availability`
- `POST/DELETE /api/montree/appointments/availability/blackouts`
- `GET /api/montree/appointments`

Server-side filtering by `auth.role + auth.userId + auth.schoolId` via `verifySchoolRequest()`. Frontend never passes identity in body/query.

**Architectural fix in same session:** `BookingRow` was originally defined as a nested function inside `AppointmentsCalendar`. React sees a new component type each render → forced unmount/remount of every booking row on every parent state change. Extracted to module scope. Locked in as future-going rule.

**i18n deferred.** The whole appointments surface (parent + staff + calendar) is English-only with zero `appointments.*` keys in any locale file. Adding i18n for just the calendar would create an inconsistent surface — that's its own sweep.

---

## D. Mira messaging tools architecture (preserved for cold-resume)

**File map:**
- `lib/montree/mira/tool-definitions.ts` — three new tool schemas under MESSAGING TOOLS section.
- `lib/montree/mira/tool-executor.ts` — three new dispatch cases. Imports `SUPER_ADMIN_SENTINEL_UUID` + `SUPER_ADMIN_DISPLAY_NAME` from `lib/montree/agent-super-admin-messaging/types`.
- `lib/montree/mira/system-prompt.ts` — new "When she asks you to message Tredoux" section. "What you can do" section updated (rule #181 contradiction fix in commit `c918aa61`).
- `app/api/montree/agent/mira/route.ts` — passes `agentName` into `executeMiraTool` deps so messages have correct sender_name without an extra DB lookup.

**Cross-pollination (load-bearing):**
- `created_by_id = agentId` on thread create
- `sender_id = agentId` on every message insert
- `participant_id = agentId` on every read/write to thread_participants
- Defense in depth on `reply_in_thread`: agent MUST be a participant on the thread AND `thread_type='agent_super_admin'`. A foreign thread_id will fail the participant check.
- `school_id = NULL` is allowed ONLY for `thread_type='agent_super_admin'` per migration 204 gated CHECK.
- `ai_drafted = false` FORCED on every Mira-written message (rule #84 / #179). The message IS the agent's, even though Mira composed it.

**Posture (system prompt):**
- Fire `start_thread_with_tredoux` ONLY when the agent has explicitly asked.
- Fire `reply_in_thread` ONLY when the agent is responding to something Tredoux wrote or explicitly asks to reply.
- Never volunteer. Write the body in HER voice. No greeting padding, no sign-off.
- After firing: confirm briefly ("Sent." / "Replied.") and stop.

**Plumbing edge cases handled:**
- `participants` insert failure after thread create → rollback the thread (best-effort).
- `message` insert failure after thread+participants → return error with thread_id so caller can retry without creating a second thread.
- `last_message_at` on thread bumped fire-and-forget on every send (so it sorts to the top on both sides).
- `last_read_at` on agent's participant row bumped fire-and-forget after every send (no false-unread on her side).

---

## E. Architectural rules locked in this run (extends Session 117 rules #171-177)

178. **Mira tools that write to messaging tables MUST pull `agentId` from `deps.agentId`, never from tool input.** Input parameters never control the agent's own identity — cross-pollination guarantee.

179. **`ai_drafted=false` is FORCED on every Mira-written message.** Same Session 84 rule that applies to the HTTP agent messages route. Mira composed the message; the message is the agent's. AI attribution would mislead Tredoux.

180. **`school_id=NULL` is allowed ONLY for `thread_type='agent_super_admin'`.** Migration 204's gated CHECK enforces this. Every Mira write to `montree_message_threads` passes both values together.

181. **Tool description + system prompt MUST agree on when to call.** When introducing a new write tool, the tool's description AND the system prompt's posture section both say "fire ONLY when X". One without the other is a footgun (Session 87 architectural lesson: tool description wins because that's what Opus reads at decision moment). Self-violation caught in same session — see commit `c918aa61`.

182. **Phase 4.8 (Astra super-admin scope) is recommended as a separate `/montree/super-admin/tracy` route**, not bolted onto the principal Astra. The principal Astra is gated to a single school's data; super-admin Astra would scan across all agents. Different identity, different gating, different system prompt.

(Earlier this session, Session 117 main run, added rules #171-177 — see `SESSION_117_HANDOFF.md`.)

---

## F. What's NOT done — picks for next session, ordered

1. **🚨 Stage A Agora activation — operational, ~5 min.** Tredoux pastes migration 223 SQL + flips `agora_video_calls` flag + 2-device end-to-end test inside the new calendar UI. Full SQL in `docs/handoffs/AGORA_STAGE_A_QUICKSTART.md` Step 4.

2. **Stage B Agora activation — operational, ~15 min.** Requires credit card on Agora + Cloud Recording enable + Supabase Storage bucket + 4 more Railway env vars + flip `video_recording` flag. Walks through `docs/handoffs/AGORA_SETUP_PLAYBOOK.md` Steps 2-3 + 5.

3. **Phase 4.8 — Astra super-admin scope (~4-6h focused session).** Symmetric counterpart to Phase 4.7. Recommended new route `/montree/super-admin/tracy` with role-based tool gating. Tools: `list_pending_agent_threads`, `scan_agent_thread`, `draft_agent_reply`, `send_agent_reply`. System prompt: "Astra-as-Tredoux's-chief-of-staff", different posture from principal Astra. Infrastructure (`/api/montree/super-admin/agent-messages/*` routes) already in place from Session 108.

4. **Appointments i18n sweep (~1-2h).** Translate the entire appointments surface (parent + staff + calendar) across 12 locales. ~40 new keys × 12 locales via Haiku batch. Pre-commit hook will block until all 12 are filled — use `scripts/fill-missing-i18n-keys.mjs` after adding to `en.ts`.

5. **Whale-Class admin SPA broken links (Session 113 V2 carry-over).** ~10 admin pages call non-existent API routes. Inventory in `docs/WHALE_CLASS_ADMIN_AUDIT.md`. **BLOCKED right now** — every admin page is in the working tree with uncommitted changes. Resolve those first.

6. **Story F-2.3 vault rekey (half-day + migration).** Per-file DEK wrapped by per-admin master KEK. Architectural — current `VAULT_PASSWORD` is shared across all files; rotating it requires re-encrypting everything.

7. **Carry-over outreach.** FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge follow-ups. All in Active Reply Threads in CLAUDE.md.

8. **Multilingual sweep (Session 75 carry-over).** Large scope — full audit of multilingual coverage across all surfaces.

---

## G. Verification checklist (after Railway settles)

1. Open `/montree/admin/appointments` as a principal — calendar renders, current month is selected, today is highlighted with gold border.
2. Tap any future day in the calendar — detail panel below opens (mobile: page auto-scrolls to it).
3. Tap "Add" button (only visible on future days) — popover shows "Open this weekday every week" / "I'm away this day".
4. Open the "Open every week on…" accordion at the bottom — existing rules listed cleanly, "Add open slot" button visible.
5. Open the "Time away" accordion — list cleanly, "Mark time away" button visible.
6. Navigate forward 2 months via ▶ — "Today" pill appears next to the month name. Tap it → jumps back to today.
7. Sidebar shows "Calendar" (not "Appointments") on both teacher dashboard More menu and principal admin sidebar.
8. Existing AvailabilityEditor.tsx file has the deprecation header.

**For the Mira tools** (requires an agent account):
1. Log into `/montree/agent/mira` as an agent.
2. Type: "What's the latest from Tredoux?"
3. Mira calls `list_my_threads_with_tredoux` and surfaces threads.
4. Type: "Tell Tredoux I'd like to discuss pricing for Argentina."
5. Mira calls `start_thread_with_tredoux`, confirms with "Sent."
6. Check `/montree/super-admin?tab=📬 Agent Inbox` — the new thread appears.

---

## H. Cold-resume TL;DR

If you're picking up cold: this run shipped the calendar-first appointments redesign and the Mira messaging tools (Phase 4.7). 7 commits on main. The Mira system-prompt contradiction caught in self-audit was fixed in the same session. The natural next builds are (1) finish Stage A Agora activation operational steps to test the killer feature inside the new calendar UI, (2) Phase 4.8 Astra super-admin scope as the symmetric counterpart to Mira's tools. CLAUDE.md has been updated with both new architectural rule blocks (#178-#182 for Mira, #171-#177 from earlier Session 117 main run).
