# SESSION 146 HANDOFF
## Education for All - Pricing & Access System
## Date: February 5, 2026 (Late Night)

---

# 🎯 THE MISSION

**"Make Montree accessible to everyone who needs it."**

- Individual teachers can try without registering a school (90-day trial, 30 students)
- NPOs serving underprivileged communities get free lifetime access
- Schools that can't afford $1k/month can apply for reduced rates
- 10% of revenue goes to Impact Fund for equipment, donations, building schools

---

# ✅ SESSION 146 ACCOMPLISHMENTS

## Database Migration 115 - COMPLETE ✅
All new tables and columns created in Supabase:

| Change | Status |
|--------|--------|
| `account_type` column on montree_schools | ✅ |
| Trial tracking columns (trial_started_at, trial_ends_at, etc.) | ✅ |
| `montree_npo_applications` table | ✅ |
| `montree_reduced_rate_applications` table | ✅ |
| `montree_impact_fund_transactions` table | ✅ |
| `montree_npo_outreach` table | ✅ |
| All indexes created | ✅ |
| Views created | ✅ |
| Triggers created | ✅ |

## Database Migration 116 - COMPLETE ✅
Seeded 14 NPO organizations for outreach:
- Global: Educateurs sans Frontières, Montessori Global Growth Fund
- USA: NCMPS, Wildflower Schools, Monarch Montessori, Breakthrough Montessori
- Kenya: Samburu Nomadic School, SARARA Foundation
- India: CoRE India, Indian Montessori Foundation
- Philippines: MCA Montessori
- Mexico: Horme Montessori Network

---

# 🔧 FILES CREATED/MODIFIED

## New Migration Files
| File | Purpose |
|------|---------|
| `migrations/115_account_types_and_impact_fund.sql` | Schema changes for pricing system |
| `migrations/116_seed_npo_outreach.sql` | NPO outreach seed data |

## New API Endpoints
| File | Purpose |
|------|---------|
| `app/api/montree/teacher/register/route.ts` | Personal Classroom registration (90-day trial) |
| `app/api/montree/apply/npo/route.ts` | NPO Community Impact application |
| `app/api/montree/apply/reduced-rate/route.ts` | Reduced rate application |
| `app/api/montree/super-admin/schools/route.ts` | PATCH endpoint for changing school status |
| `app/api/montree/super-admin/impact-fund/route.ts` | Impact fund tracking |
| `app/api/montree/super-admin/npo-outreach/route.ts` | NPO outreach management |

## New Pages
| File | Purpose |
|------|---------|
| `app/montree/teacher/register/page.tsx` | Teacher trial registration form |
| `app/montree/apply/npo/page.tsx` | NPO application form (hidden for now) |
| `app/montree/apply/reduced-rate/page.tsx` | Reduced rate application form (hidden for now) |
| `app/montree/super-admin/page.tsx` | Simplified admin with inline status toggle |

---

# 🏗️ SYSTEM ARCHITECTURE

## Account Types
```
personal_classroom  → Individual teacher trial (90 days, 30 students max)
school              → Standard paying school ($1k/month)
community_impact    → Free NPO account (verified manually)
```

## Subscription Tiers (Simplified)
```
trial   → 90-day trial (auto-assigned for personal_classroom)
free    → Lifetime free (for verified NPOs)
paid    → $1k/month (standard rate)
```

## Super-Admin Workflow (Simplified)
1. View all schools in table
2. Click dropdown to change status: Trial → Free → Paid
3. One click saves immediately

---

# 🔐 SECURITY NOTES

**Current State (Acceptable for Pre-Revenue):**
- Admin password hardcoded as `870602`
- Password hashing uses bcrypt (fixed from SHA-256)
- No rate limiting on public forms

**TODO for Production:**
- Move admin password to env var only
- Add rate limiting
- Add proper session-based auth

---

# 📋 CRITICAL FIXES APPLIED

| Issue | Fix |
|-------|-----|
| Migration CHECK constraint syntax | Split into separate ADD CONSTRAINT statements |
| Missing trial_ends_at column | Added to ALTER TABLE |
| Missing FK indexes | Added 6 indexes |
| Reduced rate API column mismatch | Fixed to match schema: reason_code, current_monthly_budget_usd, requested_rate_tier |
| Weak password hashing | Changed SHA-256 → bcrypt |
| Missing slug generation | Added generateSlug() function |

---

# 🧪 HOW TO TEST

## Teacher Registration
```
URL: /montree/teacher/register
Flow: Enter name, school name, email, password → Creates personal_classroom account with 90-day trial
```

## Super-Admin
```
URL: /montree/super-admin
Password: 870602
Actions: View schools, change status (Trial/Free/Paid)
```

---

# 📦 DEPENDENCIES ADDED

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

---

# ⏳ WHAT'S NEXT

1. **Test teacher registration flow** - Create account, verify in DB, login
2. **Test super-admin status changes** - Change school from trial → free → paid
3. **Build NPO outreach tracking UI** (when ready to do outreach)
4. **Build Impact Fund dashboard** (when revenue starts)

---

# 🎯 THE VISION

> "I want to become an education philanthropist. Eventually I want to build schools."

This system enables:
- Teachers to discover Montree through 90-day trials
- NPOs to get free access without barriers
- Schools in developing countries to get reduced rates
- 10% of all revenue funding real-world impact

---

*Handoff created: February 5, 2026*
*Session: 146*
*Next: Test the system, start onboarding schools*
