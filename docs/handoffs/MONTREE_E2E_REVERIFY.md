# Montree E2E Re-Verification — for the next web-Claude sweep

**For:** the browser-Claude that ran the original `HANDOFF.md` E2E test.
**Context:** Every numbered bug from your handoff (Phases 0–6a) plus a separate
Story video-call bug has been fixed and pushed to `main` (commit `11585d87`,
33 files). Railway auto-deploys on push. This doc tells you exactly what to
re-verify, what is deliberately NOT fixed yet, and what to capture if a bug
recurs.

The fixes were code-audited twice (an audit found 3 issues → fixed → clean
re-audit) but NOT runtime-tested — this sweep is the runtime verification.

---

## 0. BEFORE YOU START — one migration must be run

The Story video-call fix is a database change. The code is deployed but the
fix is inert until this SQL runs in the Supabase SQL Editor:

`migrations/230_story_calls_mode_check.sql`

If it has not been run yet, Story **video** calls will still fail (voice will
still work). Confirm with Tredoux that 230 has been run before testing Story
video calls. No other migration is needed — every other fix is pure code and
already live.

---

## 1. What to re-verify (was broken → should now be fixed)

Use a **fresh disposable school** for anything trial-related — the old
"E2E Test School — 23 May" was created on the old 90-day trial and won't
show the new 7-day values.

### Phase 1 — Teacher routing + 403 logout (handoff #2, #3)
1. As a teacher, visit a bogus path directly: `/montree/dashboard/weekly-plan`
   (and `/dashboard/parent-manager`, `/dashboard/photo-albums`). **Expect:** a
   "Page not found" screen with a "Back to Dashboard" button. **NOT:** the
   student-detail shell, and **NOT** a bounce to the login screen.
2. The teacher must stay **logged in** after hitting those URLs. The old bug
   logged them out (403 → login redirect). A 403 must never log a teacher out
   now; only a genuine 401 does.
3. Walk the real teacher menu (the ⋯ More menu) top to bottom — every item
   opens its own real page.

### Phase 2 — Principal role checks (handoff #6, #8)
4. As the principal who **owns** a school, open `/montree/admin` — there must
   be **no** "You're a viewer / this school is teacher-led" banner, and
   `/admin/classrooms` must let them add a classroom (no "Upgrade to add"
   gate on their own school).
5. Open `/montree/admin/conversations` as that principal — it must render the
   Conversations page, **not** "This area is for principals only."

### Phase 3 — Trial is now 7 days (handoff CR-1)
6. Create a brand-new school. `/montree/admin/billing` must read **"7 days"**,
   not 90, and the badge/label must say "Trial" (not "First month").
7. Switch the locale to **ES** and **ZH** (and ideally DE/FR/JA) — the billing
   card, the trial banner, and the signup CTA must all say trial / 7-day
   wording, **never** "first month" / "primer mes" / "首月" / "30 days".

### Phase 4 — AI family report (handoff #5)
8. Open a generated parent/family report (principal Pulse → reports, or the
   parent portal). The narrative must be **single-pass** (no doubled text),
   show **no raw markdown** (`**`, `#`, `_`), and be in the **school's
   language** — an ES school's report must be in Spanish, not English.

### Phase 5 — Loading (handoff #4, #7)
9. Visit `/montree/dashboard/weekly-wrap` **with no URL parameters**. It must
   load this week's content (or an empty state) within ~2s — **not** sit on a
   skeleton forever. A garbage `?week=xyz` param must not crash the page.
10. `/montree/admin/features` must load (it had an intermittent stuck-on
    "Loading features…"; it now times out + recovers after 12s).

### Phase 6a — Locale sync (handoff #22)
11. Change the language in one switcher — every other switcher / badge on the
    page should update to match immediately. Open a second tab; changing the
    language in one tab should update the other.

### Story video calls (NEW bug — receiver not notified)
12. **After migration 230 is run:** as admin, go to the Story admin dashboard
    → 👥 Students → pick an online student → click **📹 Video**. The student
    (Story page open) must get the incoming-call banner — same as a 📞 Voice
    call. Test both Voice and Video; both must notify the receiver.

---

## 2. Deliberately NOT fixed yet — do NOT re-file these

Phases 6b / 6c / 7 are queued but not done. Expect, and do **not** report as
new bugs:
- The 4 admin pages **Classrooms / Communication / Pulse / Events**, the
  principal **sidebar**, and the **login screen** are still in English on
  ES/ZH. (Bulk i18n wiring — needs the `npm run i18n:fill-ui` Haiku batch.)
- Teacher drawer partial-English, parent-chats mixed locale, plural artifacts
  ("1 aula(s)"), curriculum work-title inconsistencies, billing fine-print.
- `#23` — the principal login code equals the referral code. This is by
  design (Session 90); it's awaiting a product decision, not a fix.

If you find these, a one-line "still pending, as expected" note is enough.

---

## 3. The sweep — find anything new

After the targeted re-verification above, do a full fresh walk of the app
(signup → principal cockpit → teacher dashboard → parent flow → super-admin),
exactly like the original handoff. Report **any new or still-broken** issue in
the same format as `HANDOFF.md` (page · status · notes, then a numbered,
actionable change-list).

---

## 4. If a bug recurs — capture this

- **Billing locale flip (#20):** the i18n core was verified sound and the flip
  could not be reproduced from code. If it recurs, capture the **exact** repro:
  hard reload vs soft navigation, and what the `mt_locale` cookie + the
  `montree_lang` localStorage value held at the time. Without that it can't be
  pinned.
- **Story video call still fails after migration 230:** the admin "Start call"
  flow now shows the **real database error** in the alert popup. Copy that
  alert text verbatim into the report — it names the exact failure.

---

## 5. Test accounts (from the original handoff)

- Old school "E2E Test School — 23 May" — principal `TESTRUNCLAUD-AP9D`,
  teacher `María Docente` code `3DKBY5`. Fine for routing/role/report checks,
  but **created on the old 90-day trial** — use a fresh school for the
  trial-duration checks (#6, #7).
