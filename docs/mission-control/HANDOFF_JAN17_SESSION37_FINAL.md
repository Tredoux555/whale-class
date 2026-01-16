# HANDOFF - Session 37 FINAL (Jan 17, 2026 00:15)
## Status: MONTREE ARCHITECTURE DEFINED 🌱

---

## THE VISION (Confirmed Tonight)

```
MONTREE = /schools/ tree
├── School (tenant)
│       └── Classroom
│               ├── Teachers (with roles)
│               │       ├── Lead Teacher ← can edit curriculum
│               │       └── Other Teachers ← can log progress only
│               │
│               ├── Children (students)
│               │
│               └── Works (curriculum)
│                       └── Only lead can modify
```

**Admin = Pet project. Montree = The product.**

---

## WHALE CLASS TEAM

| Teacher | Role | Permissions |
|---------|------|-------------|
| **Tredoux** | Lead Teacher | Edit curriculum, manage teachers, all access |
| Vanessa | Teacher | Log progress, view children, add notes |
| Dana | Teacher | Log progress, view children, add notes |
| Jenny | Teacher | Log progress, view children, add notes |

Each teacher has their own login credentials.

---

## DATABASE SCHEMA TO CREATE

### 1. Teachers table
```sql
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Classroom-Teachers junction
```sql
CREATE TABLE IF NOT EXISTS classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id),
  teacher_id UUID REFERENCES teachers(id),
  school_id UUID REFERENCES schools(id),
  is_lead BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, teacher_id)
);
```

### 3. Classrooms table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Whale Class
INSERT INTO classrooms (name, school_id)
VALUES ('Whale', '772b08f1-4e56-4ea6-83b5-21aa8f079b35')
ON CONFLICT DO NOTHING;
```

### 4. Audit log (nice-to-have)
```sql
CREATE TABLE IF NOT EXISTS progress_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  teacher_id UUID REFERENCES teachers(id),
  action TEXT, -- 'status_change', 'note_added', 'work_presented'
  work_id UUID,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Link children to classrooms
```sql
ALTER TABLE children ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id);
```

---

## PERMISSION MODEL

| Action | Lead Teacher | Other Teachers |
|--------|--------------|----------------|
| View children | ✅ | ✅ |
| Log progress | ✅ | ✅ |
| Add notes | ✅ | ✅ |
| Edit curriculum/works | ✅ | ❌ |
| Add/remove teachers | ✅ | ❌ |
| Change work order | ✅ | ❌ |
| View audit log | ✅ | ❌ |

---

## STUDENT ORDER SQLs (Still need to run)

```sql
-- 1. Add column
ALTER TABLE children ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. Set order (run all at once)
UPDATE children SET display_order = 1 WHERE name = 'Rachel' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 2 WHERE name = 'Yueze' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 3 WHERE name = 'Lucky' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 4 WHERE name = 'Austin' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 5 WHERE name = 'Minxi' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 6 WHERE name = 'Leo' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 7 WHERE name = 'Joey' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 8 WHERE name = 'Eric' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 9 WHERE name = 'Jimmy' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 10 WHERE name = 'Kevin' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 11 WHERE name = 'Niuniu' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 12 WHERE name = 'Amy' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 13 WHERE name = 'Henry' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 14 WHERE name = 'Segina' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 15 WHERE name = 'Hayden' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 16 WHERE name = 'KK' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 17 WHERE name = 'Kayla' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 18 WHERE name = 'Stella' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';

-- 3. Verify
SELECT name, display_order FROM children 
WHERE school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35' 
ORDER BY display_order;
```

---

## DEPLOYMENT STATUS

- Code pushed with `/schools/` routes ✅
- Railway shows "Deployment successful" ✅
- But `/schools/` still returns 404 ⚠️
- May need time or manual redeploy from Railway dashboard

**Test tomorrow:**
- https://teacherpotato.xyz/schools/
- https://teacherpotato.xyz/schools/beijing-international
- https://teacherpotato.xyz/schools/beijing-international/classrooms/whale

---

## NEXT SESSION PRIORITIES

1. **Check if /schools/ routes work** (Railway may have caught up overnight)
2. **Run student order SQLs** if not done
3. **Create teacher tables** (schema above)
4. **Insert Whale Class teachers** (Tredoux as lead, Vanessa/Dana/Jenny as teachers)
5. **Build teacher login for Montree** (`/schools/[slug]/login`)
6. **Implement permission checks** (is_lead boolean)

---

## FILES CREATED/MODIFIED TONIGHT

| File | Purpose |
|------|---------|
| `/app/schools/page.tsx` | Schools list (Montree root) |
| `/app/schools/[slug]/page.tsx` | School dashboard |
| `/app/schools/[slug]/classrooms/[id]/page.tsx` | Classroom view |
| `/app/api/schools/route.ts` | List schools API |
| `/app/api/schools/[schoolId]/route.ts` | School detail API |
| `/app/api/schools/[schoolId]/classrooms/[id]/route.ts` | Classroom API |
| `/docs/mission-control/brain.json` | Montree brain (CORE_LAWS) |
| `/docs/mission-control/MONTREE_MIGRATION.md` | Migration guide |

---

## CORE LAWS (from brain.json)

1. **MONTREE_IS_TRUTH** - `/schools/` is THE source of truth
2. **ADMIN_IS_PET** - `/admin/` is sandbox, not product
3. **PORTABLE_BY_DESIGN** - Montree can migrate to any domain
4. **DATABASE_FIRST** - All data in Supabase
5. **MULTI_TENANT_ALWAYS** - Works for ANY school

---

## SESSION END

**Time:** 00:15 Beijing (Jan 17, 2026)
**Status:** Architecture defined, code deployed, awaiting Railway
**Next:** Verify deployment, create teacher system

*Good progress. The tree is planted. Now we add the branches.*

---

**Read first next session:**
1. This file
2. `brain.json`
3. Check https://teacherpotato.xyz/schools/
