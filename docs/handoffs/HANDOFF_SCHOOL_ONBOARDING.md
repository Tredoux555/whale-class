# HANDOFF: Montree School Onboarding - Session 85

## Date: January 25, 2026

---

## WHAT'S BUILT

### Complete New System (Montree SaaS)

```
/montree/onboarding     → Principal sets up school (3 steps + success with codes)
/montree/login          → Teacher login (code flow OR name+password)
/montree/dashboard      → Teacher's classroom
/montree/admin          → Principal manages school
```

### The Flow

**Principal onboards school:**
```
1. Enter school name
2. Add classrooms (grid UI with +)
3. Assign teacher names
4. SUCCESS → Shows login codes for each teacher
```

**Teacher first login:**
```
1. Gets code from principal (e.g. "whale-7392")
2. Goes to /montree/login
3. Enters code → Sets their own password
4. Redirected to /montree/dashboard
```

**Teacher returning:**
```
1. Goes to /montree/login
2. Enters name + password
3. Redirected to /montree/dashboard
```

---

## FILES CREATED

### Migrations
```
migrations/067_school_onboarding_clean.sql   # Tables + migrate existing data
migrations/068_teacher_login_codes.sql       # Add login_code column
```

### Pages
```
app/montree/onboarding/page.tsx              # 3-step wizard + success
app/montree/login/page.tsx                   # Teacher login (code + password)
```

### APIs
```
app/api/montree/onboarding/route.ts          # Create school + classrooms + teachers
app/api/montree/auth/validate-code/route.ts  # Check if code is valid
app/api/montree/auth/set-password/route.ts   # First-time password setup
app/api/montree/auth/login/route.ts          # Name + password login
```

---

## DATABASE SCHEMA

### simple_teachers (updated)
```sql
id              UUID
name            TEXT
password        TEXT
password_set    BOOLEAN     -- true after teacher sets own password
login_code      TEXT UNIQUE -- e.g. "whale-7392"
school_id       UUID
classroom_id    UUID
is_active       BOOLEAN
last_login      TIMESTAMPTZ
```

### montree_classrooms
```sql
id              UUID
school_id       UUID
name            TEXT
icon            TEXT        -- emoji
color           TEXT        -- hex
teacher_id      UUID        -- links to simple_teachers
is_active       BOOLEAN
```

### montree_schools
```sql
id              UUID
name            TEXT
slug            TEXT UNIQUE
subscription_status TEXT
```

---

## TO RUN THIS

### Step 1: Run Migrations

In Supabase SQL Editor, run in order:
1. `migrations/067_school_onboarding_clean.sql`
2. `migrations/068_teacher_login_codes.sql`

### Step 2: Test

```bash
npm run dev
```

1. Go to `http://localhost:3000/montree/onboarding`
2. Create a test school
3. Add a classroom + teacher
4. Note the login code shown on success
5. Go to `http://localhost:3000/montree/login`
6. Enter the code → Set password → Should redirect to dashboard

---

## WHAT'S NOT CONNECTED YET

1. **Dashboard filter** - `/montree/dashboard` needs to read from `montree_teacher` localStorage and filter children by `classroom_id`
2. **Admin panel** - `/montree/admin` needs to show classrooms + regenerate codes
3. **Logout** - Need to clear `montree_teacher` from localStorage

---

## NEXT STEPS

1. Connect dashboard to show only the logged-in teacher's classroom children
2. Build admin panel to view classrooms and teacher codes
3. Add "Forgot code" flow (principal regenerates)

---

## KEY URLS

| URL | Who | Purpose |
|-----|-----|---------|
| `/montree/onboarding` | Principal | Setup new school |
| `/montree/login` | Teacher | Login or first-time setup |
| `/montree/dashboard` | Teacher | View classroom |
| `/montree/admin` | Principal | Manage school |

---

*Session 85 complete. Teacher auth system ready.*
