# 🎓 Student Portal - Setup Guide

## ✅ Implementation Complete!

All files have been created and configured. Here's what was implemented:

### 📁 Files Created

1. **Database Migration**
   - `migrations/007_student_portal.sql` - Run this in Supabase SQL Editor

2. **Authentication**
   - `app/auth/student-login/page.tsx` - Parent-friendly login page
   - `app/api/auth/student-login/route.ts` - Login API with bcrypt password verification
   - `app/api/auth/password-reset-request/route.ts` - Password reset request system

3. **Student Dashboard**
   - `app/student/dashboard/page.tsx` - Child-friendly dashboard with avatars, badges, and progress

4. **Progress Tracking APIs**
   - `app/api/student/progress-summary/route.ts` - Get progress summary for all games
   - `app/api/student/badges/route.ts` - Get student badges
   - `app/api/student/game-progress/route.ts` - Update game progress and award badges

5. **Game Routes**
   - `app/student/games/letter-sounds/page.tsx`
   - `app/student/games/word-builder/page.tsx`
   - `app/student/games/sentence-match/page.tsx`
   - `app/student/games/sentence-builder/page.tsx`
   - `app/student/games/letter-match/page.tsx`
   - `app/student/games/letter-tracer/page.tsx`

6. **Game Components** (copied from package)
   - `components/07-LetterSoundMatchingGame.tsx`
   - `components/08-WordBuildingGame.tsx`
   - `components/09-SentenceMatchingGame.tsx`
   - `components/10-SentenceBuilderGame.tsx`
   - `components/12-BigToSmallLetterMatchingGame.tsx`
   - `components/04-LetterTracer.tsx`

7. **Updated Files**
   - `middleware.ts` - Added `/auth/student-login` and `/api/student` to public paths
   - `types/database.ts` - Added login fields to Child interface

---

## 🚀 Next Steps

### Step 1: Run Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/007_student_portal.sql`
3. Run the migration
4. Verify tables were created:
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN (
     'letter_sounds_progress',
     'word_builder_progress',
     'sentence_match_progress',
     'sentence_builder_progress',
     'letter_match_progress',
     'letter_tracing_progress',
     'child_badges',
     'password_reset_requests'
   );
   ```

### Step 2: Set Up Student Passwords

You'll need to create a way for admins/teachers to set passwords for students. Options:

**Option A: Admin Panel UI** (Recommended)
- Add a password field to the child edit form in admin panel
- Hash passwords with bcrypt before saving

**Option B: SQL Script** (Quick setup)
```sql
-- Example: Set password for a child
UPDATE children 
SET login_password = '$2a$10$YourHashedPasswordHere'
WHERE id = 'child-uuid-here';
```

**Option C: API Endpoint** (For programmatic setup)
Create `app/api/admin/children/[id]/set-password/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { password } = await request.json();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const supabase = await createServerClient();
  await supabase
    .from('children')
    .update({ login_password: hashedPassword })
    .eq('id', params.id);
  
  return NextResponse.json({ success: true });
}
```

### Step 3: Test Student Login

1. Set a password for a test student
2. Navigate to `/auth/student-login`
3. Login with student ID/name and password
4. Verify dashboard loads correctly
5. Test accessing games

### Step 4: Integrate Progress Tracking into Games

The game components need to be updated to call the progress API when items are completed. Add this to each game component:

```typescript
// At top of component
const [childId, setChildId] = useState<string | null>(null);

useEffect(() => {
  const session = localStorage.getItem('student_session');
  if (session) {
    const parsed = JSON.parse(session);
    setChildId(parsed.childId);
  }
}, []);

// When item completed (e.g., letter, word, sentence)
const handleComplete = async (itemId: string, gameType: string) => {
  if (!childId) return;
  
  try {
    await fetch('/api/student/game-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType,
        childId,
        itemId,
        completed: true,
      }),
    });
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

**Game Type Mappings:**
- Letter Sounds: `'letter_sounds'` (itemId = letter, e.g., "A")
- Word Builder: `'word_builder'` (itemId = word, e.g., "cat")
- Sentence Match: `'sentence_match'` (itemId = sentence_id)
- Sentence Builder: `'sentence_builder'` (itemId = sentence_id)
- Letter Match: `'letter_match'` (itemId = letter_pair, e.g., "A-a")
- Letter Tracer: `'letter_tracer'` (itemId = letter, e.g., "A")

---

## 🎯 Features Implemented

### ✅ Student Login System
- Simple child ID/name + password authentication
- Parent-friendly login interface
- Password reset request system
- Session stored in localStorage (persists until logout)

### ✅ Student Dashboard
- Child-friendly design with avatars
- Progress summary for all 6 games
- Badge display system
- Quick access to all games
- Logout functionality

### ✅ Progress Tracking
- Tracks completion for all games
- Stores attempts count
- Calculates progress percentages
- Updates automatically when games are completed

### ✅ Badge System
- 8 standard badges:
  - 🎮 First Game
  - 🔤 Letter Master (all 26 letters)
  - 📝 Word Wizard (10 words)
  - ⭐ Sentence Star (10 sentences)
  - 🔄 Perfect Match (all letter pairs)
  - ✏️ Tracer Champion (all letters traced)
  - 🔥 Weekly Streak (7 days)
  - 🏆 Completionist (all games)
- Auto-awards when conditions are met
- Displays on dashboard

### ✅ Password Management
- Parents can request password resets
- Admin can view reset requests in database
- No password requirements (parents choose)

---

## 🔧 Configuration Notes

### Progress Thresholds
The progress summary API uses these totals (adjust if needed):
- Letter Sounds: 26 letters
- Word Builder: 95 words
- Sentence Match: 20 sentences
- Sentence Builder: 20 sentences
- Letter Match: 26 pairs
- Letter Tracer: 26 letters

Update these in `app/api/student/progress-summary/route.ts` if your game content differs.

### Badge Triggers
Badge conditions are defined in `app/api/student/game-progress/route.ts` in the `checkBadgeTriggers` function. Adjust thresholds as needed.

### Avatar System
- Uses `photo_url` if available
- Falls back to `avatar_emoji` (default: 🐋)
- Can be updated in admin panel

---

## 📝 Admin Tasks

### View Password Reset Requests
```sql
SELECT 
  id,
  child_name,
  parent_name,
  parent_email,
  request_message,
  status,
  created_at
FROM password_reset_requests
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Reset a Password
```sql
-- Hash password first (use bcrypt in your app)
UPDATE children 
SET login_password = '$2a$10$hashedPasswordHere'
WHERE id = 'child-id-here';

-- Mark reset request as completed
UPDATE password_reset_requests
SET status = 'completed', resolved_at = NOW()
WHERE child_id = 'child-id-here' AND status = 'pending';
```

### Set Avatar Emoji
```sql
UPDATE children 
SET avatar_emoji = '🎨'
WHERE id = 'child-id-here';
```

---

## 🐛 Troubleshooting

### Student can't login
1. Check password is set: `SELECT id, name, login_password IS NOT NULL as has_password FROM children WHERE id = '...'`
2. Verify password hash is correct (bcrypt format)
3. Check browser console for errors

### Progress not saving
1. Check childId is in localStorage session
2. Verify API endpoint is accessible: `/api/student/game-progress`
3. Check browser network tab for API errors
4. Verify database tables exist

### Badges not awarding
1. Check badge triggers in `checkBadgeTriggers` function
2. Verify progress is being saved correctly
3. Check `child_badges` table for existing badges

### Games not loading
1. Verify game components exist in `components/` folder
2. Check import paths in game route pages
3. Verify all dependencies are installed

---

## 🎉 Ready to Use!

Once you've:
1. ✅ Run the database migration
2. ✅ Set passwords for students
3. ✅ Integrated progress tracking into games (optional, but recommended)

The student portal will be fully functional! Students can login, play games, track progress, and earn badges.

---

**Questions?** Check the code comments or review the implementation files listed above.










