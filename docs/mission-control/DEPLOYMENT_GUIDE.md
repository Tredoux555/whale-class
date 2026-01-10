# 🚀 MONTREE UNIFICATION - DEPLOYMENT GUIDE
## Step-by-Step Instructions for Tredoux

**Created:** January 12, 2026  
**Ready For:** Morning deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before you start, make sure you have:
- [ ] Access to Supabase dashboard (Whale project)
- [ ] Terminal open in ~/Desktop/whale
- [ ] Internet connection

---

## STEP 1: RUN DATABASE MIGRATIONS

### 1.1 Open Supabase SQL Editor

1. Go to your Supabase dashboard
2. Select the Whale project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### 1.2 Run Migration 025 (Main Schema)

Copy and paste the ENTIRE contents of this file:
```
~/Desktop/whale/migrations/025_montree_unification.sql
```

Click "Run" and wait for success message.

**Expected output:**
```
✅ Migration 025 complete: Montree Unification
  - families table created/updated
  - children.family_id column added
  - game_curriculum_mapping table created
```

### 1.3 Run Migration 025b (Game Mappings)

Create a new query and paste contents of:
```
~/Desktop/whale/migrations/025b_seed_game_mappings.sql
```

Click "Run" and wait for success.

**Expected output:**
```
✅ Game mappings seeded successfully!
  - Total mappings: 30-50 (varies)
  - Games mapped: 12
```

### 1.4 Verify Database

Run this verification query:
```sql
-- Check tables exist
SELECT 'families' as table_name, COUNT(*) as rows FROM families
UNION ALL
SELECT 'game_curriculum_mapping', COUNT(*) FROM game_curriculum_mapping;

-- Check children has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name IN ('family_id', 'color', 'journal_entries');
```

You should see:
- families table with 0+ rows
- game_curriculum_mapping with 30+ rows
- children has family_id, color, journal_entries columns

---

## STEP 2: DEPLOY CODE

### 2.1 Open Terminal

```bash
cd ~/Desktop/whale
```

### 2.2 Check Status

```bash
git status
```

You should see new/modified files in:
- migrations/
- app/api/unified/
- app/parent/home/

### 2.3 Commit and Push

```bash
git add .
git commit -m "🐋 Montree Unification: Teacher-Parent sync with game recommendations

- Added unified families table
- Added game_curriculum_mapping table  
- Created 5 unified APIs (families, children, progress, games, today)
- Updated parent UI to show school updates and game recommendations
- Teacher progress now visible to parents instantly"

git push
```

### 2.4 Wait for Railway Deploy

Railway will auto-deploy. Wait 2-3 minutes, then check:
- https://teacherpotato.xyz should be accessible

---

## STEP 3: TEST THE SYSTEM

### 3.1 Create a Test Family

Run in Supabase SQL Editor:
```sql
-- Create test family
INSERT INTO families (name, email) 
VALUES ('Test Family', 'test@example.com')
ON CONFLICT (email) DO NOTHING;

-- Get family ID
SELECT id FROM families WHERE email = 'test@example.com';
```

### 3.2 Link a Child to the Family

```sql
-- Get Amy's ID (or any child)
SELECT id, name FROM children WHERE name = 'Amy' LIMIT 1;

-- Link Amy to test family (replace UUIDs)
UPDATE children 
SET family_id = 'FAMILY_UUID_HERE'
WHERE name = 'Amy';
```

### 3.3 Test Parent Login

1. Go to: https://teacherpotato.xyz/parent/home
2. Enter: test@example.com
3. Click Continue
4. Select "Test Family"
5. Click on Amy

### 3.4 Verify Features Work

**Today Tab:**
- Shows "Today at School" section
- Shows "Recommended Games" section
- If Amy has Language progress → games appear

**Progress Tab:**
- Shows overall progress bar
- Shows progress by area

**Curriculum Tab:**
- Shows all 342 works
- Can filter by area
- Can expand and see status

---

## STEP 4: SWITCH TO UNIFIED PAGES (OPTIONAL)

If everything works, you can make the unified pages the default:

```bash
cd ~/Desktop/whale/app/parent/home

# Backup old pages
mv page.tsx page-old.tsx
mv page-unified.tsx page.tsx

cd [familyId]
mv page.tsx page-old.tsx
mv page-unified.tsx page.tsx

cd [childId]
mv page.tsx page-old.tsx
mv page-unified.tsx page.tsx

# Commit the switch
cd ~/Desktop/whale
git add .
git commit -m "Switch to unified parent pages"
git push
```

---

## 🔧 TROUBLESHOOTING

### "families table doesn't exist"
- Run migration 025 again
- Check for SQL errors in the output

### "game_curriculum_mapping is empty"
- Run migration 025b again
- Make sure curriculum_roadmap has data first

### "No children showing for family"
- Children need family_id set
- Use SQL to link: `UPDATE children SET family_id = 'xxx' WHERE id = 'yyy'`

### "Games not showing"
- Child needs Language works with status 1-3
- Check: `SELECT * FROM child_work_progress WHERE child_id = 'xxx'`

### "API returns 500 error"
- Check Railway logs
- Usually means a table doesn't exist yet

---

## 📊 MONITORING

After deployment, monitor:

1. **Railway logs:** Check for API errors
2. **Supabase:** Check table sizes growing
3. **User feedback:** Ask teachers/parents

---

## 🎉 SUCCESS!

When complete:
- Parents can log in with email
- Parents see teacher's progress updates
- Parents get game recommendations for Language works
- Everything uses ONE database (no more sync issues)

---

## 📞 NEED HELP?

If something goes wrong:
1. Don't panic
2. Check Railway logs for errors
3. The old page.tsx files are still there as backup
4. Database migrations are safe to re-run

---

*Created by Claude during overnight work session. Good morning, Tredoux!*
