# Teacher Revenue Share Programme — Build Handoff

**Built:** Apr 28, 2026 (Session 72)  
**Status:** Code deployed. DB migration still needs to run. Payout infrastructure TBD.

---

## What Was Built

### The Programme
Teachers who bring Montree to their school earn **20% of that school's monthly subscription** indefinitely, as long as they remain on staff.

**Attribution logic:** The teacher who starts the trial (enters school name + email at `/montree/try`) is automatically recorded as the `founding_teacher`. This timestamp-backed record is their proof. No other verification needed — they signed up first, they get the share.

### Files Created / Modified

| File | What it does |
|------|-------------|
| `app/montree/for-teachers/page.tsx` | NEW — Public landing page explaining the programme. Same dark forest aesthetic as the rest of the site. Lives at `/montree/for-teachers`. |
| `app/api/montree/teacher/earnings/route.ts` | NEW — GET endpoint returning earnings data for the authenticated teacher. |
| `app/montree/dashboard/earnings/page.tsx` | NEW — Teacher-facing earnings dashboard. Shows status, estimated monthly share, earnings history. |
| `app/api/montree/try/instant/route.ts` | MODIFIED — After teacher creation, non-blocking update sets `founding_teacher_id` on the school. |
| `components/montree/DashboardHeader.tsx` | MODIFIED — Added "💰 My Earnings" link to the More menu. |

---

## 🚨 DB MIGRATION — MUST RUN BEFORE EARNINGS FEATURES WORK

Run this in the Supabase SQL Editor:

```sql
-- Add founding teacher tracking to schools
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS founding_teacher_id UUID REFERENCES montree_teachers(id),
  ADD COLUMN IF NOT EXISTS revenue_share_pct NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS revenue_share_active BOOLEAN DEFAULT FALSE;

-- Earnings history table
CREATE TABLE IF NOT EXISTS montree_teacher_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id),
  school_id UUID NOT NULL REFERENCES montree_schools(id),
  month DATE NOT NULL,                    -- first day of the month e.g. 2026-05-01
  school_revenue NUMERIC(10,2) NOT NULL,  -- total school paid that month
  share_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  teacher_earnings NUMERIC(10,2) NOT NULL, -- school_revenue * share_pct / 100
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, school_id, month)
);

-- Index for teacher lookups
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher_id
  ON montree_teacher_earnings (teacher_id);
```

Until this migration runs:
- `/api/montree/try/instant` will log a silent error trying to set `founding_teacher_id` (non-blocking, won't break signups)
- `/api/montree/teacher/earnings` will return `isFounding: false` for everyone
- The earnings page will show the "not enrolled" state

---

## The Flow End-to-End

```
Teacher visits /montree/for-teachers
  → clicks "Get started free"
  → /montree/try → enters name, SCHOOL NAME, EMAIL
  → /api/montree/try/instant creates school + teacher
  → founding_teacher_id = teacher.id set on school (non-blocking)
  → revenue_share_active = false (pending conversion)

School converts to paid plan (manual step for now):
  → Super admin sets revenue_share_active = true on that school
  → Teacher now sees "Revenue share active" on their earnings page

Each month (manual step for now):
  → Super admin inserts a row into montree_teacher_earnings
  → teacher_earnings = school_revenue * 0.20
  → Teacher sees it on their earnings page
  → Once paid out, update status = 'paid', set paid_at
```

---

## What's Still Manual (For Now)

**Activating revenue share:** When a school converts from trial to paid, someone needs to run:
```sql
UPDATE montree_schools
SET revenue_share_active = true
WHERE id = '<school_id>';
```

**Monthly earnings entry:** For each school with `revenue_share_active = true`, insert a row into `montree_teacher_earnings` each month. Example:
```sql
INSERT INTO montree_teacher_earnings
  (teacher_id, school_id, month, school_revenue, share_pct, teacher_earnings)
VALUES
  ('<teacher_id>', '<school_id>', '2026-05-01', 420.00, 20.00, 84.00);
```

**Payment:** Manual bank transfer / PayPal for now. Update `status = 'paid'` and `paid_at = NOW()` once sent.

---

## What to Build Next (Phase 2)

1. **Super admin earnings management tab** — View all active revenue share schools, manually insert monthly earnings, mark as paid. Simple table UI under `/montree/super-admin`.

2. **Auto-activation webhook** — When a school's `subscription_status` flips to `active` (Stripe webhook), auto-set `revenue_share_active = true` if `founding_teacher_id` is set.

3. **Monthly earnings cron** — Scheduled job that runs on the 1st of each month, calculates school revenue for the previous month (student count × $7), inserts earnings row for each active founding teacher.

4. **Payment rails** — Stripe Connect or PayPal Payouts. Low priority until there are enough schools paying to make it worth the integration complexity.

5. **Promote on outreach emails** — Add a P.S. to the sacred email:
   > "P.S. If you introduce Montree to a colleague who brings it to their school, you earn 20% of what their school pays — every month. montree.xyz/for-teachers"

---

## The Landing Page

`/montree/for-teachers` — same dark forest aesthetic.

Sections:
1. Hero: "You found it. Now earn from it."
2. How it works (3 steps)
3. The maths (earnings table by school size)
4. The reasoning (why teachers deserve this)
5. The rules (founding teacher, must stay on staff, no cap, monthly payment)
6. Closing CTA

Add this page to the landing page nav eventually (`/montree` → "For Teachers" link alongside "Library").

---

## Adding to the Landing Page Nav

In `app/montree/page.tsx`, in the nav links section, add:
```tsx
<a href="/montree/for-teachers" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', ... }}>
  For teachers
</a>
```
(Same style as the Library link already there)

---

## Key Numbers

- **Revenue share:** 20% of school's monthly subscription
- **School subscription:** $7 per active student per month
- **Share formula:** `student_count × $7 × 0.20`
- **No cap, no expiry** — as long as teacher is employed at the school
- **Activates** when school converts from trial to paid

