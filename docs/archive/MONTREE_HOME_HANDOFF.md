# MONTREE HOME - HANDOFF DOCUMENT
## Last Updated: January 7, 2026

---

## QUICK STATUS: ✅ FEATURE COMPLETE - NEEDS DEPLOY

### Before Going Live:
1. **Run SQL in Supabase** (see below)
2. **Deploy**: `cd ~/Desktop/whale && git add . && git commit -m "Montree Home complete" && git push`

---

## WHAT IS MONTREE HOME?

A complete Montessori homeschool curriculum tracker for parents. Parents can:
- Track child progress across 250 activities in 5 areas
- Get daily activity recommendations based on child's age and progress
- Manage materials shopping list
- Plan weekly activities
- Document journey with photo journal
- Generate printable progress reports

---

## DATABASE SETUP

### Tables Created:
| Table | Purpose |
|-------|---------|
| `home_curriculum_master` | 250 Montessori activities |
| `home_families` | Family accounts |
| `home_children` | Children in each family |
| `home_child_progress` | Progress per child per activity |
| `home_activity_log` | Activity history |

### SQL TO RUN (Required before deploy):
```sql
-- Add columns for Materials, Planner, Journal features
ALTER TABLE home_families 
ADD COLUMN IF NOT EXISTS materials_owned jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weekly_plans jsonb DEFAULT '{}'::jsonb;

ALTER TABLE home_children 
ADD COLUMN IF NOT EXISTS journal_entries jsonb DEFAULT '[]'::jsonb;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_home_families_materials ON home_families USING gin(materials_owned);
CREATE INDEX IF NOT EXISTS idx_home_children_journal ON home_children USING gin(journal_entries);
```

---

## URL STRUCTURE

| URL | Purpose |
|-----|---------|
| `/admin/montree-home` | Admin: Manage families, view curriculum |
| `/parent/home` | Parent login (email-based) |
| `/parent/home/[familyId]` | Family dashboard |
| `/parent/home/[familyId]/materials` | Materials shopping checklist |
| `/parent/home/[familyId]/planner` | Weekly activity planner |
| `/parent/home/[familyId]/[childId]` | Child's daily activities |
| `/parent/home/[familyId]/[childId]/journal` | Photo journal |
| `/parent/home/[familyId]/[childId]/report` | Printable progress report |

---

## FILE STRUCTURE

```
app/
├── admin/montree-home/page.tsx          # Admin dashboard
├── parent/home/
│   ├── page.tsx                          # Parent login
│   └── [familyId]/
│       ├── page.tsx                      # Family dashboard
│       ├── materials/page.tsx            # Materials checklist
│       ├── planner/page.tsx              # Weekly planner
│       └── [childId]/
│           ├── page.tsx                  # Daily activities
│           ├── journal/page.tsx          # Photo journal
│           └── report/page.tsx           # Progress report
└── api/montree-home/
    ├── activities/route.ts               # Get/update activities
    ├── children/route.ts                 # CRUD children
    ├── curriculum/route.ts               # Get curriculum
    ├── families/route.ts                 # CRUD families
    ├── journal/route.ts                  # Save journal entries
    ├── materials/route.ts                # Save owned materials
    ├── planner/route.ts                  # Save weekly plans
    └── report/route.ts                   # Get mastered activities
```

---

## CURRICULUM DATA

**250 activities across 5 areas:**
- 🧹 Practical Life: 45 activities
- 👁️ Sensorial: 30 activities
- 🔢 Mathematics: 55 activities
- 📚 Language: 70 activities
- 🌍 Cultural: 50 activities

Each activity includes:
- Name, description, age range, sequence
- Materials list with prices
- Direct/indirect aims
- Presentation steps
- Observation prompts

---

## TESTING FLOW

1. Go to `/admin/montree-home`
2. Create a family with your email
3. Go to `/parent/home`, enter your email
4. Select family, add a child (name + birthdate)
5. Click child → see daily activities
6. Test: Materials, Planner, Journal, Report buttons

---

## PHASE 2 FEATURES (Optional)

| Feature | Description | Effort |
|---------|-------------|--------|
| Email reminders | Daily/weekly nudges via Resend | 2 hrs |
| Milestone badges | Celebrate area completion | 1 hr |
| PWA install | Add to home screen | 30 min |
| Onboarding quiz | Assess starting point | 1 hr |
| Multi-language | Spanish, Chinese | 3 hrs |

---

## KNOWN ISSUES / NOTES

1. **No auth system** - Uses email lookup only. Fine for MVP, add proper auth later if needed.
2. **Photo URLs** - Parents paste URLs from Google Photos/Imgur. No direct upload.
3. **Materials prices** - Estimates only, Amazon links are search-based.
4. **Progress calculation** - Done in API, not DB functions (simpler, works everywhere).

---

## RELATED MEMORY

Update memory with:
```
Montree Home COMPLETE: 250 activities, parent interface at /parent/home, admin at /admin/montree-home. Run SQL for materials_owned, weekly_plans, journal_entries columns before deploy.
```

---

## NEXT SESSION CHECKLIST

- [ ] Run SQL in Supabase (columns + indexes)
- [ ] Deploy: `git add . && git commit -m "Montree Home" && git push`
- [ ] Test full flow at teacherpotato.xyz/parent/home
- [ ] Create test family with your email
- [ ] Verify all 250 activities loaded
- [ ] Test materials, planner, journal, report
