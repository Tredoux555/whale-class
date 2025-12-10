# 🚀 Complete Setup Checklist - Make Everything Work

This checklist covers **everything** you need to do to get all the Montessori features working.

---

## ✅ Step 1: Environment Variables (REQUIRED)

### Check Your `.env.local` File

Make sure you have these 3 variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to get them:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**If missing:**
- Create `.env.local` file in project root
- Add all 3 variables
- Restart your dev server: `npm run dev`

---

## ✅ Step 2: Database Setup (REQUIRED)

### A. Run Main Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy **entire contents** of `MONTESSORI-DATABASE-SCHEMA.sql`
4. Paste and click "Run"
5. Wait for success message

**This creates:**
- ✅ `children` table
- ✅ `activities` table
- ✅ `daily_activity_assignments` table
- ✅ `child_progress` table
- ✅ `skill_categories` table
- ✅ `skills` table
- ✅ `activity_log` table

### B. Run Quick Wins Migration

1. Still in SQL Editor → New Query
2. Copy **entire contents** of `migrations/create_favorites_photos_themes.sql`
3. Paste and click "Run"

**This creates:**
- ✅ `activity_favorites` table
- ✅ `activity_photos` table
- ✅ `activity_themes` table

### C. Verify Tables Created

In Supabase Dashboard → Table Editor, you should see:
- children
- activities
- daily_activity_assignments
- child_progress
- skill_categories
- skills
- activity_log
- activity_favorites
- activity_photos
- activity_themes

---

## ✅ Step 3: Storage Buckets (REQUIRED)

### Create Storage Buckets in Supabase

1. Go to Supabase Dashboard → Storage
2. Create these buckets (click "Create bucket" for each):

**Bucket 1: `child-photos`**
- Name: `child-photos` (exact)
- Public: ✅ **YES** (check this!)
- File size limit: 5 MB
- Click "Create bucket"

**Bucket 2: `videos`** (if not already exists)
- Name: `videos` (exact)
- Public: ✅ **YES**
- File size limit: 100 MB
- Click "Create bucket"

**Verify:**
- Both buckets show as "Public" in the list
- Both buckets are accessible

---

## ✅ Step 4: Install Python Dependencies (For PDF Reports)

### Install reportlab Library

```bash
pip3 install reportlab --break-system-packages
```

**Or on some systems:**
```bash
pip3 install reportlab
```

**Verify installation:**
```bash
python3 -c "import reportlab; print('reportlab installed!')"
```

Should print: `reportlab installed!`

---

## ✅ Step 5: Add Activities Data (REQUIRED)

### The system needs activities to work!

You have 2 options:

#### Option A: Use Seed Files (If Available)

If you have seed SQL files:
1. Go to Supabase → SQL Editor
2. Run `montessori_seed_clean.sql` (if exists)
3. Run `english_curriculum_seed.sql` (if exists)

#### Option B: Add Activities Manually

Add at least 5-10 activities via SQL:

```sql
INSERT INTO activities (
  name, area, age_min, age_max, skill_level, 
  duration_minutes, materials, instructions, learning_goals
) VALUES 
(
  'Pouring Water',
  'practical_life',
  2.5, 4.0, 1, 15,
  ARRAY['Small pitcher', 'Small glass', 'Tray', 'Sponge'],
  '1. Place pitcher with water on tray\n2. Show child how to pour slowly\n3. Practice pouring into glass\n4. Clean up spills with sponge',
  ARRAY['Fine motor skills', 'Concentration', 'Independence']
),
(
  'Color Matching',
  'sensorial',
  2.0, 3.5, 1, 10,
  ARRAY['Color tablets', 'Tray'],
  '1. Place color tablets on tray\n2. Show child how to match colors\n3. Let child match independently',
  ARRAY['Color recognition', 'Visual discrimination']
);
```

**Minimum needed:**
- At least 1 activity per curriculum area
- Activities covering ages 2-6
- Activities at different skill levels (1-4)

---

## ✅ Step 6: Test Your Setup

### Test 1: Start Dev Server

```bash
npm run dev
```

Should start without errors.

### Test 2: Access Admin Dashboard

1. Go to `http://localhost:3000/admin/login`
2. Login with your credentials
3. Should see Admin Dashboard with all buttons

### Test 3: Test Montessori Tracking

1. Click "📊 Montessori Tracking"
2. Should see Montessori Dashboard
3. Click "👶 Manage Children"
4. Should see Children page (may be empty)

### Test 4: Add a Test Child

1. Click "Add Child" or "Add First Child"
2. Fill in:
   - Name: Test Child
   - Date of Birth: (any date)
   - Age Group: 2-3
   - Parent Email: test@example.com
3. Click Save
4. Should see child appear in list

### Test 5: Generate Activity

1. Click on the child's name
2. Click "Generate Today's Activity"
3. Should either:
   - ✅ Show an activity (if activities exist)
   - ⚠️ Show "No activities found" (if no activities in DB)

**If "No activities found":**
- Go back to Step 5 and add activities!

---

## ✅ Step 7: Verify All Features

### Feature Checklist:

- [ ] **Montessori Tracking** - Dashboard loads
- [ ] **Manage Children** - Can add/view children
- [ ] **Child Profile** - Can view individual child
- [ ] **Generate Activity** - Can generate daily activities
- [ ] **Activities Library** - Can browse activities
- [ ] **English Curriculum** - Can view English lessons
- [ ] **Daughter's Activity** - Can generate activities
- [ ] **Reports** - Can generate PDF reports
- [ ] **Progress Tracking** - Can see progress tabs
- [ ] **Activity History** - Can see history tab

---

## 🐛 Common Issues & Fixes

### Issue: "Missing Supabase environment variables"

**Fix:**
1. Check `.env.local` file exists
2. Verify all 3 variables are set
3. Restart dev server: `npm run dev`

### Issue: "Table does not exist"

**Fix:**
1. Go to Supabase → SQL Editor
2. Run `MONTESSORI-DATABASE-SCHEMA.sql` again
3. Run `migrations/create_favorites_photos_themes.sql`
4. Refresh your app

### Issue: "No activities found"

**Fix:**
1. Go to Supabase → Table Editor → activities
2. Check if table is empty
3. Add activities via SQL (see Step 5)

### Issue: "Failed to generate PDF"

**Fix:**
1. Install reportlab: `pip3 install reportlab`
2. Verify Python 3 is installed: `python3 --version`
3. Check script exists: `scripts/generate_parent_report.py`

### Issue: "Storage bucket not found"

**Fix:**
1. Go to Supabase → Storage
2. Create bucket `child-photos` (public)
3. Create bucket `videos` (public, if needed)
4. Refresh app

### Issue: "Cannot upload photos"

**Fix:**
1. Verify `child-photos` bucket exists
2. Make sure bucket is PUBLIC
3. Check storage policies allow uploads
4. For local dev: Create folder `public/uploads/activity-photos/`

---

## 📋 Quick Verification Commands

### Check Environment Variables:
```bash
# In your terminal
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
# (Service role key won't show for security)
```

### Check Python/reportlab:
```bash
python3 --version
python3 -c "import reportlab; print('OK')"
```

### Check Node Dependencies:
```bash
npm list @supabase/supabase-js
npm list lucide-react
```

---

## 🎯 What Should Work After Setup

### ✅ All Pages Accessible:
- `/admin` - Admin Dashboard
- `/admin/montessori` - Montessori Dashboard
- `/admin/montessori/children` - Children List
- `/admin/montessori/children/[id]` - Child Profile
- `/admin/montessori/activities` - Activities Library
- `/admin/montessori/reports` - Reports
- `/admin/english-curriculum` - English Curriculum
- `/admin/daughter-activity` - Daughter's Activity

### ✅ All Features Functional:
- Add/edit children
- Generate daily activities
- Track progress
- View activity history
- Generate PDF reports
- Browse activities library
- Upload photos (after UI integration)
- Favorite activities (after UI integration)

---

## 🚀 Final Steps

1. ✅ Run all database migrations
2. ✅ Create storage buckets
3. ✅ Set environment variables
4. ✅ Install Python dependencies
5. ✅ Add activities data
6. ✅ Test each feature
7. ✅ Start using the system!

---

## 💡 Pro Tips

1. **Start Small**: Add 5-10 activities first, test, then add more
2. **Test Each Feature**: Don't assume everything works - test each button
3. **Check Console**: Browser console (F12) shows helpful error messages
4. **Check Supabase Logs**: Supabase Dashboard → Logs shows database errors
5. **Backup First**: Before running migrations, backup your database

---

## 📞 Need Help?

If something doesn't work:
1. Check browser console (F12) for errors
2. Check Supabase Dashboard → Logs for database errors
3. Verify all steps above are completed
4. Check that tables exist in Supabase → Table Editor

---

**Once all steps are complete, your Montessori tracking system will be fully functional!** 🎉
