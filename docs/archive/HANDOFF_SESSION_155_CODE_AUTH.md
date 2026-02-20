# Handoff: Session 155 (Continued) — Code-Based Auth for Montree Home

**Date:** Feb 8, 2026
**Status:** Code complete. Ready to deploy.

## What Was Done

Switched Montree Home from email/password auth to **code-based instant trial** matching the Montree classroom pattern. Built super-admin Families tab. Ran deep audit and fixed all critical/moderate issues.

## The Flow

```
Parent visits /home → clicks "Start Free"
    ↓
POST /api/home/auth/try → generates 6-char code (e.g., K4RM7N)
    ↓
Code displayed BIG on screen + session auto-saved to localStorage
    ↓
Parent writes down code, clicks "Go to Dashboard"
    ↓
Next visit: /home/login → enter 6 boxes → auto-submit → dashboard
```

## Files Changed (9 total)

| File | What |
|------|------|
| `migrations/121_home_join_code.sql` | NEW — `join_code TEXT` + UNIQUE constraint + index |
| `app/api/home/auth/try/route.ts` | NEW — instant trial (code gen, SHA256, collision retry 3x) |
| `app/api/home/auth/login/route.ts` | REWRITTEN — SHA256 code lookup (was bcrypt email) |
| `app/home/page.tsx` | REWRITTEN — Start Free → code display → manual continue |
| `app/home/login/page.tsx` | REWRITTEN — 6-box code input with auto-advance/paste |
| `app/home/register/page.tsx` | REPLACED — redirect to /home |
| `app/api/home/auth/register/route.ts` | REPLACED — 410 Gone stub |
| `app/api/montree/super-admin/home/route.ts` | MODIFIED — returns join_code in list + detail |
| `components/montree/super-admin/FamiliesTab.tsx` | MODIFIED — shows Code column instead of Email |

## Technical Details

**Code Generation:**
- Charset: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (29 chars, no I/L/O/0/1)
- Length: 6 characters
- Stored: SHA256 hash in `password_hash`, plaintext in `join_code`
- Collision handling: Retry up to 3x on UNIQUE violation (code 23505)

**Login:**
- Input sanitized: `.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')`
- Charset validated: rejects I, L, O, 0, 1
- SHA256(input) compared against `password_hash` via `.single()`
- Error logged for ambiguous matches

**Families Tab (Super-Admin):**
- Shows join code in mono font with emerald highlight
- Admin can see codes to re-share with parents
- Same dark slate + emerald theme as Schools tab

## Audit Results

### Fixed (Critical + Moderate)
1. **UNIQUE constraint** on join_code — prevents duplicate codes breaking `.single()` login
2. **Collision retry** in try route — 3 attempts on unique violation
3. **Double-click guard** on Start Free — `if (loading) return` before `setLoading(true)`
4. **Removed 4s auto-redirect** — parent must click "Go to Dashboard" manually (time to save code)
5. **Charset validation** in login — rejects confusable characters (I/L/O/0/1)
6. **Error logging** for `.single()` lookup failures

### Accepted (Matching Montree Pattern)
- `Math.random()` for code gen (same as classroom)
- SHA256 without salt (code IS the secret)
- No rate limiting on login (deferred — would need middleware)

## To Deploy

### 1. Run Migrations on Supabase (IN ORDER)
```sql
-- First: create the home tables (if not already done)
-- File: migrations/120_home_tables.sql

-- Then: add join_code column
-- File: migrations/121_home_join_code.sql
```

### 2. Push to GitHub
```bash
git add -A && git commit -m "feat: code-based auth for Montree Home" && git push
```

Railway will auto-deploy.

### 3. Test
1. Visit teacherpotato.xyz/home
2. Click "Start Free" → should see 6-char code
3. Note the code, click "Go to Dashboard"
4. Log out, visit /home/login
5. Enter the code → should reach dashboard
6. Visit /montree/super-admin → Families tab → should see the family with code

## Known Limitations

- **No rate limiting** — Login accepts unlimited attempts. With 29^6 ≈ 594M codes, brute force is slow but not impossible. Consider adding middleware rate limiting later.
- **No code recovery** — If parent loses their code, admin must look it up in Families tab and re-share. No self-service password reset.
- **No email notifications** — Code is shown once on screen. No email/SMS delivery. Parent must write it down.
- **Email column still fetched** — API returns `email` but FamiliesTab doesn't display it. Auto-generated as `home-{code}@montree.app`.

## Future Enhancements

- [ ] Rate limiting middleware on `/api/home/auth/login`
- [ ] Email/SMS code delivery option
- [ ] Self-service code recovery (verify by child name?)
- [ ] Family name customization (currently defaults to "My Family")
