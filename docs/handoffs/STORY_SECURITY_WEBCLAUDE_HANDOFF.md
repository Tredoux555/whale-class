> ⚠️ SUPERSEDED — see /HANDOFF_LATEST.md (Jun 13).

# Story Nuke — Activation & Verification Handoff (June 2026)

Scope clarified by the owner: the nuke wipes **content only** (messages, media,
files, vault entries, logs) — **accounts and the app stay intact** so everyone can
still log in afterward. No database-wide backup/PITR changes are part of this (that
was considered and rejected — the Supabase project is shared by all of Montree).

This is verification + (optionally) one reversible env var. There is **no
destructive dashboard action** to perform, and the nuke must **never be fired**
during this handoff.

## What's already shipped (code on `main`, auto-deployed)
- `POST /api/story/admin/system-controls/nuke` — wipes the 13 Story content tables
  + empties the `story-uploads`, `story-files`, `vault-secure` buckets. It does NOT
  delete `story_users` or `story_admin_users`, so logins survive.
- A ☢️ "NUKE — wipe all content" panel at the bottom of the Story admin Controls tab.
- Gated by a secret `STORY_NUKE_CODE` env var (fail-closed: if unset, the endpoint
  returns "not configured"). The owner sets this value himself.

---

## TASK 0 — Confirm you are on the right projects (do this first)
Before touching anything, confirm:
- The **Railway** project is the one serving **montree.xyz / whale-class**.
- The **Supabase** project is the **montree / whale-class** one — NOT "jeffy-commerce"
  and NOT the parent-meeting-vault project.
If you cannot positively confirm both, STOP and tell the owner which projects you can
actually see. Do not change settings on an unverified project.

## TASK 1 — (optional, owner's call) ephemeral messages
Only if the owner says yes: Railway → the web service → Variables → add
`STORY_EPHEMERAL` = `true`. This makes each new message auto-delete the previous one.
It's reversible (delete the var to turn off) and only affects Story content. If the
owner only wants the nuke, skip this.

## TASK 2 — Confirm the deploy is live
In Railway, confirm the latest deployment built and is running (Success). Note the
status.

## TASK 3 — Verify the nuke is armed, WITHOUT firing it
1. Confirm the owner has set `STORY_NUKE_CODE` in Railway Variables (you do NOT set
   this and you do NOT need to see its value).
2. In the Story admin dashboard → Controls tab, confirm the ☢️ "NUKE — wipe all
   content" panel appears.
3. Type a deliberately WRONG code into it and click the button → it must fail
   ("Unauthorized"). **Do NOT enter the real code. Do NOT fire the nuke** — it is
   irreversible.
4. Report back: project identity confirmed, Railway deploy status, whether the nuke
   panel is present and correctly rejects a wrong code, and whether ephemeral was
   enabled.

## Hard rules
- Never fire the nuke.
- No backup / PITR / retention changes — not part of this.
- Never change or regenerate `MESSAGE_ENCRYPTION_KEY` or any Supabase key/password.
- Don't set `STORY_NUKE_CODE` yourself — the owner does that.
- If project identity can't be confirmed, stop and report.
