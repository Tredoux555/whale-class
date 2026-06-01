# Story Security Hardening — WebClaude Handoff (June 2026)

You are operating Tredoux's Railway + Supabase dashboards in the browser. Code has
already been pushed to `main` and Railway auto-deploys. Your job is the
**operational activation + verification** that can only be done in the dashboards.
Do NOT change any code.

## Background (what was just shipped)

Three things landed in the Story system:
1. **Ephemeral mode** — when on, every new message hard-deletes all older messages
   + their media, so only the current message ever exists.
2. **Total "nuke"** — a one-tap destroy-everything button + secret-code endpoint
   (`/api/story/admin/system-controls/nuke`) that wipes all Story tables and empties
   all storage buckets.
3. Tier-1 fixes (shorter signed-URL lifetime, sanitized download header) — no action
   needed from you.

Both #1 and #2 are **inert until env vars are set** — deploying the code alone changes
nothing. That's by design.

---

## TASK 1 — Railway env vars

Open the Railway project for the Montree / Story app → the web service → **Variables**.

1. Add `STORY_EPHEMERAL` = `true`
   - This turns on auto-purge (only the current message survives each write).
2. Add `STORY_NUKE_CODE` = **the secret code Tredoux gives you directly.**
   - 🚨 Do NOT invent one and do NOT read it from any file or chat log. It must be a
     secret only Tredoux holds. If you don't have it, STOP and ask him for it. It must
     be at least 12 characters. Never write this value into any file, commit, or note.
3. Confirm `MESSAGE_ENCRYPTION_KEY` already exists (messaging relies on it). **Do not
   change or regenerate it** — that would make all existing messages unreadable.
4. Save. Railway should redeploy automatically. If it doesn't, trigger a redeploy.
   Watch the deploy to **Success**.

---

## TASK 2 — Supabase backup retention (the one real gap)

Ephemeral + nuke delete LIVE data, but Supabase's own backups can retain copies for a
retention window — so an overwritten or nuked message can linger provider-side. Minimise
that window.

Open the Supabase project → **Project Settings → Database → Backups** (and check for a
**Point in Time Recovery / PITR** section).

1. Report back what currently exists:
   - Is PITR enabled? If so, what's the retention window (e.g. 7 days)?
   - Are there scheduled daily backups? What retention?
2. If PITR is enabled, set the retention to the **minimum** the plan allows (or, if
   Tredoux confirms he's comfortable, disable PITR). Daily backups on the Pro plan
   typically retain ~7 days and may not be reducible — note that as a residual.
3. Do NOT delete the project or change the database password/keys.

This is the only step that closes the "deleted data survives in backups" gap, so report
the exact current retention numbers back to Tredoux even if you change nothing.

---

## TASK 3 — Verify (do NOT fire the nuke)

After Railway shows a successful deploy:

1. **Ephemeral working:** On the Story user page (montree.xyz/story, logged in), send a
   message, then send a second one. The first should be **gone** — only the latest shows.
   You can also load `montree.xyz/api/story/recent-messages` (with a valid session) and
   confirm it returns just the one newest row.
2. **Nuke armed but NOT fired:** In the Story admin dashboard → **Controls** tab, confirm
   the new ☢️ "NUKE — total destruction" section appears at the bottom. Type a WRONG code
   and click the button → it should report failure ("Unauthorized"). **Do NOT enter the
   real code. Do NOT actually run the nuke** — it is irreversible and will destroy the
   live channel.
3. Report back to Tredoux: Railway deploy status, the Supabase backup-retention numbers
   you found, and whether ephemeral verified.

## Hard rules
- Never fire the nuke during verification.
- Never write `STORY_NUKE_CODE` anywhere persistent.
- Never touch `MESSAGE_ENCRYPTION_KEY` or any Supabase key/password.
- If `STORY_NUKE_CODE` wasn't provided to you, stop and ask — don't guess.
