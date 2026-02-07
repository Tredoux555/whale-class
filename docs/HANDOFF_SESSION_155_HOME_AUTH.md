# Session 155 Handoff — Montree Home Code-Based Auth

**Date:** Feb 8, 2026
**Session:** 155 (continued across 2 Cowork sessions due to context compaction)

---

## What Was Done

### 1. Replaced Email/Password Auth with Code-Based Auth (Home Product)

The entire Montree Home auth system was converted from email/password to 6-char join codes, matching the Montree classroom pattern.

**Registration flow (new):**
- Parent enters name → clicks "Start Free" → API generates 6-char code → code displayed to save → auto-logged in → Go to Dashboard

**Login flow (new):**
- Parent enters 6-char code in individual digit boxes → auto-submits → logged in

**Files changed:**

| File | Change |
|------|--------|
| `app/home/page.tsx` | Added parentName input, POST name to API |
| `app/home/register/page.tsx` | **Full rewrite** from redirect stub to working code-based registration page |
| `app/home/login/page.tsx` | **Full rewrite** from email/password form to 6-digit code entry with auto-advance |
| `app/api/home/auth/try/route.ts` | Accept name from body, use as familyName, added debug error output |
| `app/api/home/auth/login/route.ts` | Converted from bcrypt password verify to SHA256 code hash lookup |
| `app/api/home/auth/register/route.ts` | Replaced with 410 stub (registration now via `/api/home/auth/try`) |

### 2. Added Name Collection to Montree Classroom Registration

**Files changed:**

| File | Change |
|------|--------|
| `app/montree/try/page.tsx` | Added 'details' step (name + school name inputs) between role selection and account creation |
| `app/api/montree/try/instant/route.ts` | Accept `name` + `schoolName` from body, use in school/teacher/principal/lead inserts |

### 3. Super-Admin Families Tab Updated

| File | Change |
|------|--------|
| `components/montree/super-admin/FamiliesTab.tsx` | Shows join_code instead of email, added join_code to interface |
| `app/api/montree/super-admin/home/route.ts` | Minor adjustments |

### 4. SQL Migration 121 Applied

- `migrations/121_home_join_code.sql` — Adds `join_code TEXT` column + UNIQUE constraint + index to `home_families`
- **Successfully applied** to Supabase during this session
- Migration 120 (`home_tables.sql`) was already applied previously

---

## Git Status

### Pushed to origin (deployed on Railway):
```
c73a088 feat: add name collection to registration flows, replace old email/password register with code-based auth
```

### Committed but NOT pushed (1 commit):
```
a233bf8 debug: surface Supabase error details in home registration
```
This adds debug error details to the `/api/home/auth/try` API responses so Supabase errors are visible in the UI.

### Uncommitted changes (8 files):
```
M  BRAIN.md
M  app/api/home/auth/login/route.ts          ← bcrypt→SHA256 conversion
M  app/api/home/auth/register/route.ts       ← full API→410 stub
M  app/api/montree/super-admin/home/route.ts ← minor
M  app/home/login/page.tsx                   ← full rewrite to code entry
M  components/montree/super-admin/FamiliesTab.tsx ← show join_code
M  package-lock.json
M  package.json                              ← 2 new deps
```

### Action needed:
```bash
git add -A && git commit -m "feat: complete code-based auth for Home (login, register, super-admin)" && git push
```
The second push during the session failed with SSL error (transient). Just retry.

---

## CRITICAL BUG: 500 Error on `/api/home/auth/try`

### Symptom
Live site at `teacherpotato.xyz/home` → enter name → click "Start Free" → **500 error "Failed to create account"**

### Root Cause (Suspected)
The API inserts into `home_families` with columns: `name, email, password_hash, join_code, plan`

The table was created by migration 120, which the user said was "already applied" (got `relation already exists` error). This means it may have been applied with a **different schema version** than what's in the migration file. Migration 121 (join_code column) was applied successfully during this session.

### Likely Issues (check in order):
1. **Column mismatch** — Run this in Supabase SQL editor to verify schema:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'home_families'
   ORDER BY ordinal_position;
   ```
   Expected columns: `id, email, password_hash, name, plan, created_at, trial_ends_at, join_code`

2. **Missing column** — If `join_code` doesn't exist despite migration 121 "succeeding", re-run:
   ```sql
   ALTER TABLE home_families ADD COLUMN IF NOT EXISTS join_code TEXT;
   ALTER TABLE home_families ADD CONSTRAINT unique_home_join_code UNIQUE(join_code);
   ```

3. **RLS policy blocking inserts** — Shouldn't happen (service role key bypasses RLS), but check:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'home_families';
   ```

4. **Debug info not deployed** — The debug commit (`a233bf8`) was never pushed. Push it to see the actual Supabase error in the UI:
   ```bash
   git push
   ```

### Fastest Fix Path:
1. Push all uncommitted + unpushed changes
2. Deploy (Railway auto-deploys on push)
3. Try registering on live site
4. If still 500, the debug info will now show the actual Supabase error message in the UI
5. Fix based on what the error says

---

## Architecture Reference

### Home Auth Flow
```
Registration:
  /home OR /home/register
  → Name input → "Start Free"
  → POST /api/home/auth/try { name }
  → Generates 6-char code from ABCDEFGHJKMNPQRSTUVWXYZ23456789
  → SHA256(code) → stored as password_hash
  → Code stored as join_code (for super-admin visibility)
  → Auto-generated email: home-{code}@montree.app
  → Seeds 68-work curriculum via seedHomeCurriculum()
  → Returns { success, code, family }
  → Client saves to localStorage (setHomeSession)
  → Shows code to user → "Go to Dashboard"

Login:
  /home/login
  → 6 individual digit inputs with auto-advance
  → Auto-submits when all 6 filled
  → POST /api/home/auth/login { code }
  → SHA256(code.toUpperCase()) → lookup by password_hash
  → Returns { success, family }
  → Client saves to localStorage
  → Redirects to /home/dashboard
```

### Code Charset
Same as Montree classroom: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I, L, O, 0, 1 to avoid confusion)

### Key Files
- `lib/home/auth.ts` — localStorage session management (HOME_SESSION_KEY)
- `lib/home/curriculum-helpers.ts` — seedHomeCurriculum() + work metadata lookups
- `lib/curriculum/data/home-curriculum.json` — 68 curated works data

---

## RAM Issue

User's Mac has 8GB RAM, was at 7.04GB used + 3.49GB swap during this session. Local dev server (Turbopack) caused memory pressure. If testing locally:
- Close all unnecessary apps first
- Use `npm run dev` (Turbopack) — it did work once after clearing `.next` cache
- Alternative: just deploy and test on live site

---

## What's Left (Priority Order)

1. **Push & deploy** all changes (1 unpushed commit + 8 uncommitted files)
2. **Fix the 500 error** on `/api/home/auth/try` (see debug section above)
3. **Test full flow** on live site: register → see code → login with code → dashboard
4. **Test Montree classroom** name collection: `/montree/try` → pick role → enter name/school → create
