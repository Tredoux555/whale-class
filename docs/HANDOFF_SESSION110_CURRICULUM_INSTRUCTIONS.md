# HANDOFF: Session 110 - Teacher Instructions for Works

## COMPLETED THIS SESSION

### Curriculum Architecture Fixed
- **Master table:** `montessori_works` (220 works with all rich data)
- **Classroom copy:** `montree_classroom_curriculum_works` (independent per classroom)
- Import button copies master → classroom, then classroom can customize freely

### Edit UI Added
- `/montree/dashboard/curriculum` now has:
  - ✏️ Edit button on each work → Opens modal
  - 👁️ Hide/Show toggle for works
  - Edit modal: name, Chinese name, age range, description, aims, materials, teacher notes
- API: `/api/montree/curriculum/update` saves changes

### Button Renamed
- "📥 Import Master Curriculum" (was "Reload from Brain")

---

## NEXT SESSION: Teacher Instructions & Video Links

### THE ASK
Each work needs:
1. **Super simple instructions** - Teacher reads for 10 seconds, says "got it!"
   - NOT album-style complicated rubbish
   - Think: 3-5 bullet points MAX
   - Action-focused: "Show child X, let them do Y, observe Z"

2. **Video link** - YouTube search term link (same format as refresher videos on dashboard)
   - Format: `https://www.youtube.com/results?search_query=montessori+[work+name]`
   - Later: Replace with actual recorded videos

### QUESTIONS TO ANSWER
1. Does `montessori_works` already have simplified instructions?
   - Check: `teacher_presentation_steps` or similar field
   - Check: `video_search_terms` field (we know this exists)

2. If no simplified instructions exist:
   - Need to create them for 220 works
   - Could use Claude to generate from existing album content
   - Or manually create for most common works first

### WHERE TO ADD IN UI
In the expanded work details on curriculum page:
```
📋 Quick Guide (NEW)
1. Present the material on a mat
2. Show slow, precise movements
3. Invite child to try
4. Step back and observe

🎬 Watch Demo → [YouTube link]
```

### DATABASE FIELDS TO CHECK/ADD
```sql
-- In montessori_works (master)
teacher_quick_guide TEXT,        -- Simple 3-5 step instructions
video_search_terms JSONB,        -- Already exists?
video_url TEXT,                  -- For future actual videos

-- In montree_classroom_curriculum_works (classroom copy)  
teacher_quick_guide TEXT,        -- Copied from master, editable
video_url TEXT,                  -- Custom video URL
```

### FILES TO MODIFY
- `app/api/montree/curriculum/route.ts` - Include quick_guide in GET response
- `app/montree/dashboard/curriculum/page.tsx` - Display quick guide + video link in expanded view
- Migration if new columns needed

---

## QUICK START NEXT SESSION

```bash
# 1. Check what fields exist in montessori_works
cd ~/Desktop/ACTIVE/whale
# Run in Supabase SQL editor:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'montessori_works';

# 2. Check if video_search_terms has data
SELECT name, video_search_terms FROM montessori_works LIMIT 5;

# 3. Check for any instruction-like fields
SELECT name, teacher_presentation_steps, direct_aims 
FROM montessori_works LIMIT 5;
```

---

## EXAMPLE: What "Super Simple" Looks Like

### Pink Tower (Current Album Style - TOO MUCH)
"Invite the child to work with you. Walk to the shelf together. Show the child how to carry each cube individually, starting with the largest. Place them randomly on the mat. Build the tower by placing each cube centered on the one below, smallest on top. When complete, admire the work. Dismantle by removing cubes one at a time. Return cubes to shelf largest first..."

### Pink Tower (What We Want - 10 SECONDS)
```
📋 Quick Guide
1. Carry cubes one at a time to mat
2. Build tower: biggest → smallest
3. Let child try
4. Return to shelf when done

🎬 Watch Demo
```

THAT'S IT. Teacher glances, remembers, does it.

---

## SESSION STATE
- Dev server: Running on PID 1708
- Last working page: `/montree/dashboard/curriculum`
- All 220 works imported to test classroom
